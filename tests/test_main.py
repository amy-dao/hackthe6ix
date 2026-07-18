import json
import unittest
from unittest.mock import Mock, patch

from main import ask_gemini, build_request, extract_response_text, main


class MainTests(unittest.TestCase):
    def test_build_request_serializes_prompt(self) -> None:
        request_obj = build_request("What is crop rotation?", "test-key", "gemini-test")

        self.assertEqual(
            request_obj.full_url,
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-test:generateContent?key=test-key",
        )
        self.assertEqual(request_obj.get_method(), "POST")
        self.assertEqual(
            json.loads(request_obj.data.decode("utf-8")),
            {
                "contents": [
                    {
                        "role": "user",
                        "parts": [{"text": "What is crop rotation?"}],
                    }
                ]
            },
        )

    def test_extract_response_text_joins_parts(self) -> None:
        self.assertEqual(
            extract_response_text(
                {
                    "candidates": [
                        {
                            "content": {
                                "parts": [{"text": "First"}, {"text": " second"}],
                            }
                        }
                    ]
                }
            ),
            "First second",
        )

    def test_ask_gemini_returns_model_text(self) -> None:
        fake_response = Mock()
        fake_response.read.return_value = json.dumps(
            {
                "candidates": [
                    {
                        "content": {
                            "parts": [{"text": "Use contour planting on slopes."}],
                        }
                    }
                ]
            }
        ).encode("utf-8")
        fake_response.__enter__ = Mock(return_value=fake_response)
        fake_response.__exit__ = Mock(return_value=False)

        with patch("main.request.urlopen", return_value=fake_response) as mock_urlopen:
            answer = ask_gemini("How do I reduce erosion?", "test-key", "gemini-test")

        self.assertEqual(answer, "Use contour planting on slopes.")
        mock_urlopen.assert_called_once()

    def test_main_prints_answer_for_provided_question(self) -> None:
        with patch("main.ask_gemini", return_value="Hello from Gemini") as mock_ask_gemini:
            with patch("builtins.print") as mock_print:
                with patch("main.os.environ", {"GEMINI_API_KEY": "test-key"}):
                    with patch("sys.argv", ["main.py", "What should I plant?"]):
                        main()

        mock_ask_gemini.assert_called_once_with("What should I plant?", "test-key", "gemini-2.0-flash")
        mock_print.assert_called_once_with("Hello from Gemini")

    def test_main_requires_api_key(self) -> None:
        with patch("main.os.environ", {}):
            with patch("sys.argv", ["main.py", "Question"]):
                with self.assertRaises(SystemExit):
                    main()


if __name__ == "__main__":
    unittest.main()
