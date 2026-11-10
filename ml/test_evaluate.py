import unittest
import argparse
import numpy as np
import pandas as pd
from evaluate import classification_metrics, evaluation_features, metrics, threshold_value, validate_dataset


class EvaluationTests(unittest.TestCase):
    def test_confusion_false_positives_and_calibration_use_probabilities(self):
        result = metrics([0, 0, 1, 1], [0.1, 0.9, 0.75, 1.0])
        self.assertEqual(result["confusion"], {"true_negative": 1, "false_positive": 1, "false_negative": 1, "true_positive": 1})
        self.assertEqual(result["false_positive_rate"], 0.5)
        self.assertEqual(sum(bucket["samples"] for bucket in result["calibration"]), 4)

    def test_duplicate_and_training_overlap_are_rejected(self):
        valid = pd.DataFrame({"message": ["Hello", "What is pricing?"], "label": [0, 1]})
        validate_dataset(valid)
        with self.assertRaisesRegex(ValueError, "overlap"):
            validate_dataset(valid, ["  HELLO "])
        with self.assertRaisesRegex(ValueError, "Duplicate"):
            validate_dataset(pd.DataFrame({"message": ["hello", " HELLO "], "label": [0, 1]}))

    def test_missing_messages_and_invalid_probabilities_fail(self):
        with self.assertRaises(ValueError):
            validate_dataset(pd.DataFrame({"message": [None, "pricing"], "label": [0, 1]}))
        with self.assertRaises(ValueError):
            metrics([0, 1], [0.1, float("nan")])

    def test_comparing_cutoffs_keeps_exact_threshold_scores_below_the_cutoff(self):
        scores = np.array([0.4, 0.6, 0.65, 0.8])
        lower = classification_metrics([0, 0, 1, 1], scores, threshold_value("0.6"))
        higher = classification_metrics([0, 0, 1, 1], scores, threshold_value("0.65"))
        self.assertEqual((lower["recall"], higher["recall"]), (1.0, 0.5))
        self.assertEqual(lower["confusion"]["false_positive"], 0)
        for invalid in ["nan", "inf", "-0.1", "1.1"]:
            with self.assertRaises(argparse.ArgumentTypeError):
                threshold_value(invalid)

    def test_evaluation_uses_provided_session_context_or_runtime_defaults(self):
        data = pd.DataFrame({"message": ["Hello", "Pricing?"]})
        defaults, mode = evaluation_features(data)
        self.assertEqual(mode, "defaults")
        self.assertEqual(defaults.message_index.tolist(), [0, 0])
        contextual, mode = evaluation_features(data.assign(message_index=[1, 3], minutes_since_delivery=[2.5, 9]))
        self.assertEqual(mode, "provided")
        self.assertEqual(contextual.message_index.tolist(), [1, 3])
        self.assertEqual(contextual.minutes_since_delivery.tolist(), [2.5, 9.0])
        with self.assertRaises(ValueError):
            evaluation_features(data.assign(message_index=[1, 3]))
        with self.assertRaises(ValueError):
            evaluation_features(data.assign(message_index=[1, 3.5], minutes_since_delivery=[2.5, 9]))
