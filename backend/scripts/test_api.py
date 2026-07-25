import os
import anthropic
from dotenv import load_dotenv
from pathlib import Path

load_dotenv(Path("..") / ".env")

client = anthropic.Anthropic()
resp = client.messages.create(
    model="claude-sonnet-4-6",
    max_tokens=50,
    messages=[{"role": "user", "content": "안녕"}],
)
print(resp.content[0].text)