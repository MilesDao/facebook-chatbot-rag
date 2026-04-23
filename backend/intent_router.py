import os
import time
import json
from google import genai
from pydantic import BaseModel, Field

# Định nghĩa cấu trúc dữ liệu ép LLM phải tuân theo
class IntentResponse(BaseModel):
    intent: str = Field(description="Must be strictly 'CHITCHAT' or 'QA'")

def classify_intent(user_query: str, google_key: str = None) -> str:
    """
    Classifies user query into CHITCHAT or QA using Google Gemini.
    """
    api_key = google_key or os.getenv("GOOGLE_API_KEY")
    
    if not api_key:
        print("CRITICAL: Google API key missing for intent routing!")
        return "QA" # Default fallback
        
    client = genai.Client(api_key=api_key)

    system_instruction = """
    You are a high-speed traffic router for an AI assistant.
    Analyze the user's message and classify its core intent.
    - Return 'CHITCHAT' if it is a greeting, casual talk, expressing emotions, or a simple acknowledgement (e.g., "hi", "cảm ơn", "alo", "ok", "dạ").
    - Return 'QA' if it is a question or request requiring specific knowledge, facts, business data, or task execution (e.g., "giá bao nhiêu?", "địa chỉ ở đâu?", "hướng dẫn tôi...").
    
    You MUST respond with a valid JSON object matching the schema: {"intent": "CHITCHAT" | "QA"}.
    """
    
    max_retries = 3
    base_delay = 1.0

    for attempt in range(max_retries):
        try:
            response = client.models.generate_content(
                model="gemini-1.5-flash",
                contents=f"{system_instruction}\n\nUser Message: {user_query}",
                config=genai.types.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=0.0
                )
            )
            
            response_data = json.loads(response.text)
            return response_data.get("intent", "QA")
            
        except Exception as e:
            print(f"Router Error (Attempt {attempt + 1}/{max_retries}): {e}")
            if attempt < max_retries - 1:
                time.sleep(base_delay * (2 ** attempt))
            else:
                return "QA"
