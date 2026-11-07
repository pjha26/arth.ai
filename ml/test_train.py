import tempfile
import unittest
from pathlib import Path
import pandas as pd
from train import train, DEFAULT_OUTPUT


class TrainingSafetyTests(unittest.TestCase):
    def test_default_output_is_outside_the_checked_in_model(self):
        self.assertIn(".data", DEFAULT_OUTPUT.parts)
        self.assertNotEqual(DEFAULT_OUTPUT, Path(__file__).with_name("model.pkl"))

    def test_small_datasets_and_live_model_overwrite_are_rejected(self):
        small = pd.DataFrame({"message": ["Hello", "Pricing?"], "label": [0, 1]})
        with self.assertRaisesRegex(ValueError, "five examples"):
            train(small, DEFAULT_OUTPUT, "Unit fixture only")
        sufficient = pd.DataFrame({"message": [f"Fixture greeting {index}" for index in range(5)] + [f"Fixture pricing {index}?" for index in range(5)], "label": [0] * 5 + [1] * 5})
        with self.assertRaisesRegex(ValueError, "overwrite"):
            train(sufficient, Path(__file__).with_name("model.pkl"), "Unit fixture only")

    def test_experimental_output_records_limits_and_does_not_generate_training_data(self):
        data = pd.DataFrame({"message": [f"Fixture greeting {index}" for index in range(10)] + [f"Fixture pricing {index}?" for index in range(10)], "label": [0] * 10 + [1] * 10})
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / "model.pkl"
            result = train(data, output, "Synthetic unit fixture, not launch evaluation")
            self.assertTrue(output.exists())
            self.assertTrue(output.with_suffix(".metadata.json").exists())
            self.assertIn("Internal split only", result["note"])
