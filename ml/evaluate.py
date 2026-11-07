"""Offline evaluation on independently labelled messages; never generates training data."""
import argparse
import json
from pathlib import Path
import joblib
import pandas as pd
from sklearn.metrics import precision_score, recall_score, f1_score, brier_score_loss
from features import extract_features


def metrics(labels, probabilities):
    predicted = [p > 0.75 for p in probabilities]
    return {"precision": precision_score(labels, predicted, zero_division=0),
            "recall": recall_score(labels, predicted, zero_division=0),
            "f1": f1_score(labels, predicted, zero_division=0),
            "brier_score": brier_score_loss(labels, probabilities)}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data", required=True, help="CSV with message,label; must not be training or synthetic evaluation data")
    args = parser.parse_args()
    data = pd.read_csv(args.data)
    if not {"message", "label"}.issubset(data.columns) or not set(data.label.unique()).issubset({0, 1}) or data.label.nunique() != 2:
        raise ValueError("Provide independent messages with both 0 and 1 labels")
    features = pd.DataFrame([extract_features(m) for m in data.message])
    model = joblib.load(Path(__file__).with_name("model.pkl"))
    baseline = [0.8 if f["has_pricing"] or f["has_timeline"] else 0.1 for f in features.to_dict("records")]
    print(json.dumps({"samples": len(data), "threshold": 0.75, "model": metrics(data.label, model.predict_proba(features)[:, 1]), "keyword_baseline": metrics(data.label, baseline), "note": "Independent dataset provenance and launch suitability require human review."}, indent=2))


if __name__ == "__main__":
    main()
