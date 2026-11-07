import unittest
from features import extract_features


class FeatureTests(unittest.TestCase):
    def test_schema_and_context_are_stable(self):
        features = extract_features("What is the pricing for 20 users?", {"messageIndex": 3, "minutesSinceDelivery": 5})
        self.assertEqual(len(features), 11)
        self.assertEqual(features["has_pricing"], 1)
        self.assertEqual(features["has_team"], 1)
        self.assertEqual(features["message_index"], 3)

    def test_empty_and_non_string_messages(self):
        self.assertEqual(extract_features(None)["char_length"], 0)
        self.assertEqual(extract_features("hello")["has_pricing"], 0)


if __name__ == "__main__":
    unittest.main()
