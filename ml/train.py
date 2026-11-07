"""Train an experimental model from explicitly supplied labelled data; never generates labels."""
import argparse
import hashlib
import json
from pathlib import Path
import joblib
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from evaluate import validate_dataset, metrics
from features import extract_features


DEFAULT_OUTPUT = Path(__file__).resolve().parents[1] / ".data" / "ml-experiments" / "model.pkl"


def train(data, output, provenance):
    validate_dataset(data)
    if data.label.value_counts().min() < 5:
        raise ValueError("At least five examples per class are required even for experimental fitting")
    if output.resolve() == Path(__file__).with_name("model.pkl").resolve():
        raise ValueError("Do not overwrite the checked-in model before independent evaluation")
    features = pd.DataFrame([extract_features(message) for message in data.message])
    x_train, x_test, y_train, y_test = train_test_split(features, data.label, test_size=0.2, random_state=42, stratify=data.label)
    model = LogisticRegression(max_iter=1000, random_state=42)
    model.fit(x_train, y_train)
    output.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, output)
    summary = {"samples": len(data), "provenance": provenance, "model_sha256": hashlib.sha256(output.read_bytes()).hexdigest(),
        "internal_holdout": metrics(y_test, model.predict_proba(x_test)[:, 1]),
        "note": "Internal split only. Run independent held-out evaluation against the keyword baseline before considering deployment. Intent scoring remains experimental."}
    output.with_suffix(".metadata.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")
    return summary


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data", required=True, type=Path)
    parser.add_argument("--provenance", required=True)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()
    summary = train(pd.read_csv(args.data), args.output, args.provenance)
    summary["dataset_sha256"] = hashlib.sha256(args.data.read_bytes()).hexdigest()
    args.output.with_suffix(".metadata.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
