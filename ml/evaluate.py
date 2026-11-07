"""Evaluate experimental intent scores on independently labelled, held-out messages."""
import argparse
import hashlib
import json
from pathlib import Path
import joblib
import numpy as np
import pandas as pd
from sklearn.metrics import precision_score, recall_score, f1_score, brier_score_loss, confusion_matrix
from features import extract_features


def normalized(message):
    return " ".join(message.casefold().split())


def validate_dataset(data, training_messages=()):
    if not {"message", "label"}.issubset(data.columns) or not data["label"].isin([0, 1]).all() or data["label"].nunique() != 2:
        raise ValueError("Provide messages with both 0 and 1 labels")
    if not all(isinstance(message, str) and 0 < len(message.strip()) <= 2000 for message in data.message):
        raise ValueError("Messages must contain 1-2000 characters")
    messages = [normalized(message) for message in data.message]
    if len(set(messages)) != len(messages):
        raise ValueError("Duplicate messages would inflate evaluation results")
    if set(messages) & {normalized(message) for message in training_messages}:
        raise ValueError("Evaluation messages overlap known training data")


def metrics(labels, probabilities):
    probabilities = np.asarray(probabilities, dtype=float)
    if len(labels) != len(probabilities) or not np.isfinite(probabilities).all() or ((probabilities < 0) | (probabilities > 1)).any():
        raise ValueError("Expected a valid probability for each label")
    predicted = probabilities > 0.75
    tn, fp, fn, tp = confusion_matrix(labels, predicted, labels=[0, 1]).ravel()
    calibration = []
    for index in range(5):
        low, high = index / 5, (index + 1) / 5
        selected = (probabilities >= low) & ((probabilities < high) if index < 4 else (probabilities <= high))
        if selected.any():
            calibration.append({"range": [low, high], "samples": int(selected.sum()), "mean_probability": float(probabilities[selected].mean()), "positive_rate": float(np.asarray(labels)[selected].mean())})
    return {"precision": precision_score(labels, predicted, zero_division=0), "recall": recall_score(labels, predicted, zero_division=0),
            "f1": f1_score(labels, predicted, zero_division=0), "false_positive_rate": float(fp / (fp + tn)) if fp + tn else None,
            "confusion": {"true_negative": int(tn), "false_positive": int(fp), "false_negative": int(fn), "true_positive": int(tp)},
            "brier_score": brier_score_loss(labels, probabilities), "calibration": calibration}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data", required=True, help="Independent CSV with message,label")
    parser.add_argument("--provenance", required=True, help="How the held-out examples were collected and labelled")
    parser.add_argument("--training-data", type=Path, default=Path(__file__).with_name("data.csv"))
    parser.add_argument("--model", type=Path, default=Path(__file__).with_name("model.pkl"))
    args = parser.parse_args()
    data = pd.read_csv(args.data)
    training = pd.read_csv(args.training_data).message if args.training_data.exists() else []
    validate_dataset(data, training)
    features = pd.DataFrame([extract_features(message) for message in data.message])
    model = joblib.load(args.model)
    baseline = [0.8 if row["has_pricing"] or row["has_timeline"] else 0.1 for row in features.to_dict("records")]
    print(json.dumps({"samples": len(data), "threshold": 0.75, "provenance": args.provenance,
        "dataset_sha256": hashlib.sha256(Path(args.data).read_bytes()).hexdigest(),
        "model_sha256": hashlib.sha256(args.model.read_bytes()).hexdigest(),
        "known_training_overlap_checked": args.training_data.exists(), "model": metrics(data.label, model.predict_proba(features)[:, 1]),
        "keyword_baseline": metrics(data.label, baseline), "note": "Independent provenance and launch suitability require human review. These metrics do not establish sales conversion."}, indent=2))


if __name__ == "__main__":
    main()
