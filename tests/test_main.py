import unittest
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch

from main import answer_question, load_documents, load_question_and_documents, main, select_relevant_documents


class MainTests(unittest.TestCase):
    def test_load_documents_supports_strings_and_objects(self) -> None:
        with TemporaryDirectory() as temp_dir:
            data_path = Path(temp_dir) / "docs.json"
            data_path.write_text(
                '["First document", {"title": "Second", "text": "More details"}, {"label": "Third", "body": "Extra"}]',
                encoding="utf-8",
            )

            self.assertEqual(
                load_documents(data_path),
                ["First document", "Second | More details", "Third | Extra"],
            )

    def test_load_question_and_documents_supports_object_payload(self) -> None:
        with TemporaryDirectory() as temp_dir:
            data_path = Path(temp_dir) / "kb.json"
            data_path.write_text(
                '{"question": "What is the refund policy?", "documents": ["Refunds are available within 30 days."]}',
                encoding="utf-8",
            )

            question, documents = load_question_and_documents(data_path)

        self.assertEqual(question, "What is the refund policy?")
        self.assertEqual(documents, ["Refunds are available within 30 days."])

    def test_select_relevant_documents_prefers_matching_context(self) -> None:
        documents = [
            "The refund policy lasts 30 days.",
            "Shipping takes 5 business days.",
            "Support is available by email.",
        ]

        selected = select_relevant_documents("What is the refund policy?", documents)

        self.assertEqual(selected[0], "The refund policy lasts 30 days.")

    def test_answer_question_builds_messages_for_the_model(self) -> None:
        captured_messages = {}

        def fake_client(messages):
            captured_messages["messages"] = messages
            return "AI answer"

        answer = answer_question(
            "What is the refund policy?",
            ["The refund policy lasts 30 days.", "Shipping takes 5 business days."],
            ai_client=fake_client,
        )

        self.assertEqual(answer, "AI answer")
        self.assertIn("refund policy", captured_messages["messages"][1]["content"].lower())
        self.assertIn("30 days", captured_messages["messages"][1]["content"])

    def test_main_uses_question_from_data_file_when_provided(self) -> None:
        with TemporaryDirectory() as temp_dir:
            data_path = Path(temp_dir) / "kb.json"
            data_path.write_text(
                '{"question": "What is in the document?", "documents": ["The answer is in this document."]}',
                encoding="utf-8",
            )

            with patch("builtins.print") as mock_print:
                with patch("sys.argv", ["main.py", "Ignored question", "--data-file", str(data_path)]):
                    with patch("main.call_ai_model", return_value="AI answer"):
                        main()

        mock_print.assert_called_once_with("AI answer")


if __name__ == "__main__":
    unittest.main()
