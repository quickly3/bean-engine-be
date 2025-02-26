import os
from openai import OpenAI, DefaultHttpxClient
from dotenv import load_dotenv
from pathlib import Path
import httpx

env_path = Path('../..') / '.env'
load_dotenv(dotenv_path=env_path)

GPT_KEY = os.getenv("GPT_KEY")

client = OpenAI(
    api_key=GPT_KEY,
    base_url='https://api.openai-proxy.com/v1',
)

chat_completion = client.chat.completions.create(
    messages=[{
        "role": "user",
        "content": "Say this is a test",
    }],
    model="gpt-4o",
    session_id="chatcmpl-B27kpvOMdLmCAzXhxEnrVIE9Zyg1b")

print(chat_completion)
