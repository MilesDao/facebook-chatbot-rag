import os
import requests
from dotenv import load_dotenv

load_dotenv()

def direct_request_test():
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_KEY")
    rest_url = f"{url}/rest/v1/"
    
    stripped_key = key.replace("sb_publishable_", "")
    variants = [
        {"apikey": key, "Authorization": f"Bearer {key}"},
        {"apikey": stripped_key, "Authorization": f"Bearer {stripped_key}"},
        {"apikey": stripped_key},
    ]
    
    for i, headers in enumerate(variants):
        print(f"\n--- Variant {i} (Headers: {list(headers.keys())}) ---")
        try:
            response = requests.get(rest_url, headers=headers)
            print(f"Status Code: {response.status_code}")
            print(f"Response: {response.text}")
        except Exception as e:
            print(f"Request failed: {e}")

if __name__ == "__main__":
    direct_request_test()
