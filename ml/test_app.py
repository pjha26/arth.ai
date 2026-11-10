import math
import unittest
from unittest.mock import patch
from fastapi import HTTPException
from pydantic import ValidationError
import app as service


class ScorerTests(unittest.IsolatedAsyncioTestCase):
    def test_health_fails_when_model_is_unavailable(self):
        with patch.object(service, "model", None):
            with self.assertRaises(HTTPException) as result:
                service.health_check()
            self.assertEqual(result.exception.status_code, 503)

    def test_invalid_input_is_rejected(self):
        with self.assertRaises(ValidationError):
            service.ScoreRequest(message="")
        with self.assertRaises(ValidationError):
            service.SessionContext(messageIndex=-1)

    async def test_saved_model_loads_and_returns_bounded_experimental_scores(self):
        async with service.lifespan(service.app):
            self.assertEqual(service.health_check()["status"], "ok")
            for text in ["hello", "What is the pricing for a team of 20 users?"]:
                result = service.score_message(service.ScoreRequest(message=text))
                self.assertTrue(math.isfinite(result.intent_probability))
                self.assertGreaterEqual(result.intent_probability, 0)
                self.assertLessEqual(result.intent_probability, 1)
                self.assertTrue(result.experimental)
                self.assertEqual(len(result.model_version), 12)


if __name__ == "__main__":
    unittest.main()
