from __future__ import annotations

import argparse
import json
import os
import re
import urllib.request
from pathlib import Path
from typing import Callable


ModelClient = Callable[[list[dict[str, str]]], str]


def normalize_documents(raw_documents: object) -> list[str]:
    if isinstance(raw_documents, dict):
        for key in ("documents", "items", "entries", "data"):
            if key in raw_documents:
                raw_documents = raw_documents[key]
                break

    if not isinstance(raw_documents, list):
        raise ValueError("Knowledge base file must contain a JSON list or an object with documents")

    documents: list[str] = []
    for item in raw_documents:
        if isinstance(item, str):
            document = item.strip()
            if document:
                documents.append(document)
            continue

        if isinstance(item, dict):
            title = str(item.get("title") or item.get("question") or item.get("label") or "").strip()
            text = str(item.get("text") or item.get("answer") or item.get("content") or item.get("body") or "").strip()
            tags = item.get("tags")
            tag_text = ""

            if isinstance(tags, list):
                tag_values = [str(tag).strip() for tag in tags if str(tag).strip()]
                if tag_values:
                    tag_text = f"tags: {', '.join(tag_values)}"

            parts = [part for part in [title, text, tag_text] if part]
            document = " | ".join(parts)
            if document:
                documents.append(document)
            continue

        raise ValueError("Each knowledge base entry must be a string or object")

    if not documents:
        raise ValueError("Knowledge base file does not contain any usable documents")

    return documents


def load_documents(path: Path) -> list[str]:
    raw_documents = json.loads(path.read_text(encoding="utf-8"))
    return normalize_documents(raw_documents)


def tokenize(text: str) -> set[str]:
    return {token.lower() for token in re.findall(r"\w+", text)}


def select_relevant_documents(question: str, documents: list[str], limit: int = 3) -> list[str]:
    question_tokens = tokenize(question)

    scored_documents: list[tuple[int, str]] = []
    for document in documents:
        score = len(question_tokens & tokenize(document))
        scored_documents.append((score, document))

    scored_documents.sort(key=lambda item: item[0], reverse=True)
    selected = [document for score, document in scored_documents if score > 0][:limit]
    return selected or documents[:limit]


def build_messages(question: str, context_documents: list[str]) -> list[dict[str, str]]:
    context = "\n".join(f"- {document}" for document in context_documents)
    system_message = (
        "You answer questions using the provided context. "
        "If the context is not enough, say what is missing. "
        "Do not invent facts that are not supported by the context."
    )
    user_message = f"Question: {question}\n\nContext:\n{context or '- No context provided'}"
    return [
        {"role": "system", "content": system_message},
        {"role": "user", "content": user_message},
    ]


def call_ai_model(messages: list[dict[str, str]]) -> str:
    base_url = os.getenv("AI_BASE_URL", "https://api.openai.com")
    api_key = os.getenv("AI_API_KEY")
    model = os.getenv("AI_MODEL", "gpt-4o-mini")

    if not api_key:
        raise RuntimeError("Set AI_API_KEY to call a hosted AI model")

    payload = json.dumps(
        {
            "model": model,
            "messages": messages,
            "temperature": 0.2,
        }
    ).encode("utf-8")

    request = urllib.request.Request(
        f"{base_url.rstrip('/')}/v1/chat/completions",
        data=payload,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )

    with urllib.request.urlopen(request, timeout=60) as response:
        response_data = json.loads(response.read().decode("utf-8"))

    return response_data["choices"][0]["message"]["content"].strip()


def answer_question(question: str, documents: list[str], ai_client: ModelClient | None = None) -> str:
    selected_documents = select_relevant_documents(question, documents)
    messages = build_messages(question, selected_documents)
    model_client = ai_client or call_ai_model
    return model_client(messages)


def load_question_and_documents(path: Path) -> tuple[str | None, list[str]]:
    raw_data = json.loads(path.read_text(encoding="utf-8"))

    if isinstance(raw_data, dict):
        question = raw_data.get("question")
        if question is not None:
            question = str(question).strip() or None
        documents = normalize_documents(raw_data)
        return question, documents

    return None, normalize_documents(raw_data)


def main() -> None:
    parser = argparse.ArgumentParser(description="Ask an AI model questions using your data")
    parser.add_argument("question", help="Question to ask the model")
    parser.add_argument(
        "--data-file",
        type=Path,
        help="Optional JSON file containing your data as a list or an object with documents/items/entries/data",
    )
    args = parser.parse_args()

    documents = []
    file_question = None
    if args.data_file:
        file_question, documents = load_question_and_documents(args.data_file)

    question = file_question or args.question
    print(answer_question(question, documents))


if __name__ == "__main__":
    main()
