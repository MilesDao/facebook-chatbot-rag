import os
import json
import time
from google import genai
from pydantic import BaseModel, Field
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Ordered list of models to try: primary → fallbacks
FALLBACK_MODELS = [
    "gemini-3.1-flash-lite-preview",
    "gemini-3.1-pro-preview",
    "gemini-3-flash-preview",
]

class ConditionMatch(BaseModel):
    match: bool = Field(description="True if the user message satisfies the logic, False otherwise.")
    reason: str = Field(description="A brief explanation of why it matched or didn't match.")

def evaluate_condition(user_message: str, logic_text: str, google_key: str = None) -> bool:
    """
    Use Google Gemini to evaluate if a user message satisfies a natural language condition.
    Includes fallback model support for 503/429 errors.
    """
    api_key = google_key or os.getenv("GOOGLE_API_KEY")
    
    if not api_key:
        print("CRITICAL: Google API key missing for logic evaluation!")
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
    - Logic Target: "{logic_text}"
    
    Does the message content clearly satisfy the intent of the logic?
    """
    
    max_retries_per_model = 2
    base_delay = 1.0

    for model_name in FALLBACK_MODELS:
        for attempt in range(max_retries_per_model):
            try:
                response = client.models.generate_content(
                    model=model_name,
                    contents=f"{system_instruction}\n\n{prompt}",
                    config=genai.types.GenerateContentConfig(
                        response_mime_type="application/json",
                        temperature=0.0
                    )
                )
                
                response_data = json.loads(response.text)
                match_result = response_data.get("match", False)
                reason = response_data.get("reason", "No reason provided")
                
                print(f"DEBUG LogicEvaluator: Logic='{logic_text}' Message='{user_message}' Result={match_result} (Model: {model_name}, Reason: {reason})")
                return match_result
                
            except Exception as e:
                error_str = str(e)
                is_overloaded = "503" in error_str or "UNAVAILABLE" in error_str or "429" in error_str or "RESOURCE_EXHAUSTED" in error_str
                
                print(f"Logic Evaluator Error (Model: {model_name}, Attempt {attempt + 1}/{max_retries_per_model}): {e}")
                
                if is_overloaded:
                    if attempt < max_retries_per_model - 1:
                        time.sleep(base_delay * (2 ** attempt))
                    else:
                        # Move to the next fallback model
                        print(f"DEBUG LogicEvaluator: Model '{model_name}' unavailable, trying next fallback...")
                        break
                else:
                    # Non-overload error (e.g. invalid response), retry same model
                    if attempt < max_retries_per_model - 1:
                        time.sleep(base_delay)
                    else:
                        break
    
    print(f"CRITICAL LogicEvaluator: All models exhausted for logic='{logic_text}'. Returning False.")
    return False

def select_best_logic(user_message: str, logic_options: list[str], google_key: str = None) -> int | None:
    """
    Evaluates multiple logic options in ONE LLM call and returns the index of the best match.
    Returns None if no option matches.
    """
    if not logic_options:
        return None
        
    api_key = google_key or os.getenv("GOOGLE_API_KEY")
    if not api_key:
        return None
        
    client = genai.Client(api_key=api_key)

    options_text = ""
    for i, opt in enumerate(logic_options):
        options_text += f"{i}. {opt}\n"

    system_instruction = """
    You are a precise classifier for a chatbot flow. 
    Given a user message and a list of logic conditions, pick the ID (index) of the condition that MOST CLEARLY matches the user's intent.
    
    RULES:
    1. Respond ONLY with a JSON object: {"best_match_id": number | null, "reason": "string"}.
    2. If multiple match, pick the most specific one.
    3. If NONE match clearly, return "best_match_id": null.
    4. Pay attention to negations (không phải, đéo, sai rồi).
    """
    
    prompt = f"""
    User Message: "{user_message}"
    
    Options:
    {options_text}
    
    Which option matches the user's message best?
    """

    max_retries_per_model = 2
    base_delay = 0.5

    for model_name in FALLBACK_MODELS:
        for attempt in range(max_retries_per_model):
            try:
                response = client.models.generate_content(
                    model=model_name,
                    contents=f"{system_instruction}\n\n{prompt}",
                    config=genai.types.GenerateContentConfig(
                        response_mime_type="application/json",
                        temperature=0.0
                    )
                )
                data = json.loads(response.text)
                match_id = data.get("best_match_id")
                print(f"DEBUG LogicSelector: Selected option {match_id} for input '{user_message[:30]}...' (Reason: {data.get('reason')})")
                return match_id
            except Exception as e:
                error_str = str(e)
                is_overloaded = any(code in error_str for code in ["503", "UNAVAILABLE", "429", "RESOURCE_EXHAUSTED"])
                
                print(f"Logic Selector Error with model {model_name} (Attempt {attempt + 1}/{max_retries_per_model}): {e}")
                
                if is_overloaded:
                    if attempt < max_retries_per_model - 1:
                        time.sleep(base_delay * (2 ** attempt))
                    else:
                        print(f"DEBUG LogicSelector: Model '{model_name}' unavailable, trying next fallback...")
                        break # Try next model
                else:
                    if attempt < max_retries_per_model - 1:
                        time.sleep(base_delay)
                    else:
                        break
            
    return None
