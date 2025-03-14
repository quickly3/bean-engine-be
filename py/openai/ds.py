import os
from openai import OpenAI, DefaultHttpxClient
from dotenv import load_dotenv
from pathlib import Path
import httpx

env_path = Path('../..') / '.env'
load_dotenv(dotenv_path=env_path)

DS_KEY = os.getenv("DS_KEY")

client = OpenAI(
    api_key=DS_KEY,
    base_url='https://api.deepseek.com',
)

response = client.chat.completions.create(
    model="deepseek-chat",
    messages=[
        {"role": "system", "content": "You are a helpful assistant"},
        {"role": "user", "content": "Hello"},
    ],
    stream=False
)

print(response.choices[0].message.content)