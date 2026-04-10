import os
import requests
from dotenv import load_dotenv

load_dotenv()

PAGE_ACCESS_TOKEN = os.getenv("PAGE_ACCESS_TOKEN")

def send_message(recipient_id: str, text_payload: str):
    """
    Send a text message back to the user via Facebook Graph API.
    """
    if not PAGE_ACCESS_TOKEN:
        print("Error: PAGE_ACCESS_TOKEN is missing.")
        return

    # Facebook Graph API endpoint for sending messages
    url = f"https://graph.facebook.com/v19.0/me/messages?access_token={PAGE_ACCESS_TOKEN}"
    
    headers = {
        "Content-Type": "application/json"
    }
    
    payload = {
        "recipient": {"id": recipient_id},
        "message": {"text": text_payload}
    }
    
    try:
        response = requests.post(url, headers=headers, json=payload)
        if response.status_code != 200:
            print(f"Failed to send message: {response.text}")
        else:
            print(f"  [📤 Message sent successfully to {recipient_id}]")
    except Exception as e:
        print(f"Error sending message to Graph API: {e}")