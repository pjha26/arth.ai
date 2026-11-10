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

ALERT_THRESHOLD = 0.75


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


def evaluation_features(data):
    columns = {"message_index", "minutes_since_delivery"}
    if not columns.intersection(data.columns):
        return pd.DataFrame([extract_features(message) for message in data.message]), "defaults"
    if not columns.issubset(data.columns):
        raise ValueError("Provide both message_index and minutes_since_delivery")
    indices = data.message_index.to_numpy(dtype=float)
    minutes = data.minutes_since_delivery.to_numpy(dtype=float)
    if not np.isfinite(indices).all() or ((indices < 0) | (indices > 100000) | (indices % 1 != 0)).any():
        raise ValueError("message_index must be an integer from 0 to 100000")
    if not np.isfinite(minutes).all() or (minutes < 0).any():
        raise ValueError("minutes_since_delivery must be finite and non-negative")
    return pd.DataFrame([
        extract_features(message, {"messageIndex": int(index), "minutesSinceDelivery": float(elapsed)})
        for message, index, elapsed in zip(data.message, indices, minutes)
    ]), "provided"


def classification_metrics(labels, probabilities, threshold):
    predicted = probabilities > threshold
    tn, fp, fn, tp = confusion_matrix(labels, predicted, labels=[0, 1]).ravel()
    return {"precision": precision_score(labels, predicted, zero_division=0), "recall": recall_score(labels, predicted, zero_division=0),
            "f1": f1_score(labels, predicted, zero_division=0), "false_positive_rate": float(fp / (fp + tn)) if fp + tn else None,
            "confusion": {"true_negative": int(tn), "false_positive": int(fp), "false_negative": int(fn), "true_positive": int(tp)}}


def metrics(labels, probabilities):
    probabilities = np.asarray(probabilities, dtype=float)
    if len(labels) != len(probabilities) or not np.isfinite(probabilities).all() or ((probabilities < 0) | (probabilities > 1)).any():
        raise ValueError("Expected a valid probability for each label")
    calibration = []
    for index in range(5):
        low, high = index / 5, (index + 1) / 5
        selected = (probabilities >= low) & ((probabilities < high) if index < 4 else (probabilities <= high))
        if selected.any():
            calibration.append({"range": [low, high], "samples": int(selected.sum()), "mean_probability": float(probabilities[selected].mean()), "positive_rate": float(np.asarray(labels)[selected].mean())})
    return {**classification_metrics(labels, probabilities, ALERT_THRESHOLD),
            "brier_score": brier_score_loss(labels, probabilities), "calibration": calibration}


def threshold_value(value):
    threshold = float(value)
    if not 0 <= threshold <= 1:
        raise argparse.ArgumentTypeError("Threshold must be between 0 and 1")
    return threshold


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data", required=True, help="Independent CSV with message,label and optional message_index,minutes_since_delivery")
    parser.add_argument("--provenance", required=True, help="How the held-out examples were collected and labelled")
    parser.add_argument("--training-data", type=Path, default=Path(__file__).with_name("data.csv"))
    parser.add_argument("--model", type=Path, default=Path(__file__).with_name("model.pkl"))
    parser.add_argument("--compare-threshold", action="append", type=threshold_value, default=[], help="Compare a candidate cutoff on the same held-out data. May be repeated.")
    args = parser.parse_args()
    data = pd.read_csv(args.data)
    training = pd.read_csv(args.training_data).message if args.training_data.exists() else []
    validate_dataset(data, training)
    features, session_context = evaluation_features(data)
    model = joblib.load(args.model)
    baseline = [0.8 if row["has_pricing"] or row["has_timeline"] else 0.1 for row in features.to_dict("records")]
    probabilities = model.predict_proba(features)[:, 1]
    model_metrics = metrics(data.label, probabilities)
    comparison = [{"threshold": threshold, **classification_metrics(data.label, probabilities, threshold)}
                  for threshold in sorted(set(args.compare_threshold))]
    print(json.dumps({"samples": len(data), "threshold": ALERT_THRESHOLD, "provenance": args.provenance, "session_context": session_context,
        "dataset_sha256": hashlib.sha256(Path(args.data).read_bytes()).hexdigest(),
        "model_sha256": hashlib.sha256(args.model.read_bytes()).hexdigest(),
        "known_training_overlap_checked": args.training_data.exists(), "model": model_metrics, "threshold_comparison": comparison,
        "keyword_baseline": metrics(data.label, baseline), "note": "Validate a chosen threshold on a separate held-out dataset. Independent provenance and launch suitability require human review."}, indent=2))


if __name__ == "__main__":
    main()
