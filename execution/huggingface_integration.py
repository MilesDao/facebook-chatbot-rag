"""
Hugging Face Integration (via Private FastAPI Wrapper)

Responsibilities:
- Generate responses by calling the private FastAPI wrapper.
"""

import os
import requests
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Point to the private API (local or cloud)
API_URL = os.getenv("PRIVATE_API_URL", "http://localhost:8020/generate")

def generate_response(user_message: str, context: str, history: list) -> str:
    """
    Call the private FastAPI wrapper.
    """
    payload = {
        "user_message": user_message,
        "context": context,
        "history": history
    }
    
    try:
        response = requests.post(API_URL, json=payload)
        response.raise_for_status()
        result = response.json()
        return result.get("response", "Không nhận được phản hồi từ AI.")
            
    except Exception as e:
        print(f"Error calling private API: {e}")
        return "Tôi đang gặp vấn đề khi kết nối với máy chủ AI. Vui lòng thử lại sau."
