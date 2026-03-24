import requests
import os
from dotenv import load_dotenv

load_dotenv()
token = os.getenv("HUGGINGFACE_API_KEY")

print(f"Checking token: {token[:10]}...")
headers = {"Authorization": f"Bearer {token}"}
response = requests.get("https://huggingface.co/api/whoami-v2", headers=headers)

if response.status_code == 200:
    print("Token is valid!")
    print(response.json())
else:
    print(f"Token error: {response.status_code}")
    print(response.text)
