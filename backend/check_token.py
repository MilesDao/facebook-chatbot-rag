import os
import requests
from dotenv import load_dotenv

load_dotenv()

HF_API_KEY = os.getenv("HUGGINGFACE_API_KEY")

def check_token():
    url = "https://huggingface.co/api/whoami-v2"
    headers = {"Authorization": f"Bearer {HF_API_KEY}"}
    try:
        response = requests.get(url, headers=headers)
        print(f"Status: {response.status_code}")
        import json
        print(json.dumps(response.json(), indent=2))
    except Exception as e:
        print(f"Exception: {e}")

if __name__ == "__main__":
    check_token()
