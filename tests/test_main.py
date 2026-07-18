import unittest
from unittest.mock import patch

from main import greet, main


class MainTests(unittest.TestCase):
    def test_greet_returns_expected_message(self) -> None:
        self.assertEqual(greet("Karen"), "Hello, Karen!")

    def test_main_uses_default_name_when_none_provided(self) -> None:
        with patch("builtins.print") as mock_print:
            with patch("sys.argv", ["main.py"]):
                main()
        mock_print.assert_called_once_with("Hello, world!")

    def test_main_uses_provided_name(self) -> None:
        with patch("builtins.print") as mock_print:
            with patch("sys.argv", ["main.py", "Ada"]):
                main()
        mock_print.assert_called_once_with("Hello, Ada!")


if __name__ == "__main__":
    unittest.main()
