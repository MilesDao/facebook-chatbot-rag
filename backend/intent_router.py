import os
import time
import json
import openai
from pydantic import BaseModel, Field

# Định nghĩa cấu trúc dữ liệu ép LLM phải tuân theo
class IntentResponse(BaseModel):
    intent: str = Field(description="Must be strictly 'CHITCHAT' or 'QA'")

def classify_intent(user_query: str, openrouter_key: str = None) -> str:
    """
    Classifies user query into CHITCHAT or QA using OpenRouter.
    """
    api_key = openrouter_key or os.getenv("OPENROUTER_API_KEY")
    base_url = "https://openrouter.ai/api/v1"
    
    if not api_key:
        print("CRITICAL: OpenRouter API key missing for intent routing!")
        return "QA" # Default fallback
        
    try:
        client = openai.OpenAI(api_key=api_key, base_url=base_url)
    except Exception as e:
        print(f"Error initializing OpenRouter client for router: {e}")
        return "QA"

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
            completion = client.chat.completions.create(
                model="openai/gpt-oss-120b:free", # Use a cheap/fast model for routing
                messages=[
                    {"role": "system", "content": system_instruction},
                    {"role": "user", "content": user_query}
                ],
                response_format={"type": "json_object"},
                temperature=0.0
            )
            
            response_data = json.loads(completion.choices[0].message.content)
            return response_data.get("intent", "QA")
            
        except Exception as e:
            print(f"Router Error (Attempt {attempt + 1}/{max_retries}): {e}")
            if attempt < max_retries - 1:
                time.sleep(base_delay * (2 ** attempt))
            else:
                return "QA"
