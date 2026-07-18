# hackthe6ix

This project now shows a simple pattern for asking an AI model questions using your own data:

1. Put your data in a JSON file as a list of strings or objects with `title`, `question`, `label`, `text`, `answer`, `content`, `body`, and optional `tags` fields.
2. You can also store a top-level object with `question` plus `documents`, `items`, `entries`, or `data`.
3. The app picks the most relevant context from that file.
4. It calls an OpenAI-compatible chat API and prints the answer.

Run it like this:

```bash
set AI_API_KEY=your_key
python main.py "What is our refund policy?" --data-file my-data.json
```

Optional environment variables:

```bash
set AI_BASE_URL=https://api.openai.com
set AI_MODEL=gpt-4o-mini
```

The data file can look like this:

```json
[
	"Short standalone fact",
	{ "title": "Refunds", "text": "Refunds are available within 30 days.", "tags": ["policy", "support"] }
]
```

Or like this:

```json
{
	"question": "What is the refund policy?",
	"documents": ["Refunds are available within 30 days."]
}
```

Run the tests with:

```bash
python -m unittest discover -s tests
```