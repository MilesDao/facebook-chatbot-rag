import os
import time
import json
from google import genai
from pydantic import BaseModel, Field

# Định nghĩa cấu trúc dữ liệu ép LLM phải tuân theo
class IntentResponse(BaseModel):
    intent: str = Field(description="Must be strictly 'CHITCHAT' or 'QA'")

# Ordered list of models to try: primary → fallbacks
FALLBACK_MODELS = [
    "gemini-3.1-flash-lite-preview",
    "gemini-3.1-pro-preview",
    "gemini-3-flash-preview",
]

def classify_intent(user_query: str, google_key: str = None) -> str:
    """
    Classifies user query into CHITCHAT or QA using Google Gemini.
    Includes fallback model support for 503/429 errors.
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
    
    max_retries_per_model = 2
    base_delay = 0.5

    for model_name in FALLBACK_MODELS:
        for attempt in range(max_retries_per_model):
            try:
                response = client.models.generate_content(
                    model=model_name,
                    contents=f"{system_instruction}\n\nUser Message: {user_query}",
                    config=genai.types.GenerateContentConfig(
                        response_mime_type="application/json",
                        temperature=0.0
                    )
                )
                
                response_data = json.loads(response.text)
                return response_data.get("intent", "QA")
                
            except Exception as e:
                error_str = str(e)
                is_overloaded = any(code in error_str for code in ["503", "UNAVAILABLE", "429", "RESOURCE_EXHAUSTED"])
                
                print(f"Router Error (Model: {model_name}, Attempt {attempt + 1}/{max_retries_per_model}): {e}")
                
                if is_overloaded:
                    if attempt < max_retries_per_model - 1:
                        time.sleep(base_delay * (2 ** attempt))
                    else:
                        print(f"DEBUG Router: Model '{model_name}' unavailable, trying next fallback...")
                        break # Try next model
                else:
                    # Non-overload error, retry same model or move on if exhausted
                    if attempt < max_retries_per_model - 1:
                        time.sleep(base_delay)
                    else:
                        break

    return "QA" # Final fallback if all models fail
