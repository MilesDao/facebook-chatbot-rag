import os
import json
import time
from google import genai
from pydantic import BaseModel, Field
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class ConditionMatch(BaseModel):
    match: bool = Field(description="True if the user message satisfies the condition, False otherwise.")
    reason: str = Field(description="A brief explanation of why it matched or didn't match.")

def evaluate_condition(user_message: str, condition_text: str, google_key: str = None) -> bool:
    """
    Use Google Gemini to evaluate if a user message satisfies a natural language condition.
    """
    api_key = google_key or os.getenv("GOOGLE_API_KEY")
    
    if not api_key:
        print("CRITICAL: Google API key missing for condition evaluation!")
        return False
        
    client = genai.Client(api_key=api_key)

    system_instruction = """
    You are a precise logic evaluator for a chatbot flow system. 
    Your task is to determine if a user's message satisfies a specific condition.
    
    CRITICAL RULES:
    1. STRICT NEGATION: In Vietnamese, phrases like "không phải mà", "không phải mò", "đéo phải", "không hề" are strong negations. They must return {"match": false} for agreement conditions.
    2. CONTEXTUAL MATCH: If the condition is "phủ nhận" (deny), then "không phải", "sai rồi" are PERFECT matches.
    3. Be extremely strict: A "Deny" intent should NEVER match an "Agree" condition.
    4. Ignore case, minor typos, and emotional particles (mò, mà, nhé, nha).
    
    You MUST respond with a valid JSON object matching the schema: {"match": boolean, "reason": "string"}.
    """
    
    prompt = f"""
    Evaluate the intent match:
    - User Message: "{user_message}"
    - Condition Target: "{condition_text}"
    
    Does the message content clearly satisfy the intent of the condition?
    """
    
    max_retries = 2
    base_delay = 1.0

    for attempt in range(max_retries):
        try:
            response = client.models.generate_content(
                model="gemini-3.1-flash-lite-preview",
                contents=f"{system_instruction}\n\n{prompt}",
                config=genai.types.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=0.0
                )
            )
            
            response_data = json.loads(response.text)
            match_result = response_data.get("match", False)
            reason = response_data.get("reason", "No reason provided")
            
            print(f"DEBUG ConditionEvaluator: Condition='{condition_text}' Message='{user_message}' Result={match_result} (Reason: {reason})")
            return match_result
            
        except Exception as e:
            print(f"Condition Evaluator Error (Attempt {attempt + 1}/{max_retries}): {e}")
            if attempt < max_retries - 1:
                time.sleep(base_delay * (2 ** attempt))
            else:
                return False
    
    return False
