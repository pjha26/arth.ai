import unittest
import pandas as pd
from evaluate import metrics, validate_dataset


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
