import os
from openai import OpenAI, DefaultHttpxClient
from dotenv import load_dotenv
from pathlib import Path
import httpx


env_path = Path('../..')/'.env'
load_dotenv(dotenv_path=env_path)

GPT_KEY = os.getenv("GPT_KEY")

client = OpenAI(api_key=GPT_KEY, base_url='https://',     timeout=30000, max_retries=0,
                             http_client=httpx.Client(
                                 proxies="http://127.0.0.1:7890",
                                 transport=httpx.HTTPTransport(local_address="0.0.0.0"),
                                 verify=False
                             ))


chat_completion = client.chat.completions.create(
    messages=[
        {
            "role": "user",
            "content": "Say this is a test",
        }
    ],
    model="gpt-4o",
)