import os
from google import genai
from pydantic import BaseModel, Field
from dotenv import load_dotenv

load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")
client = genai.Client(api_key=api_key) if api_key else genai.Client()

class BotResponse(BaseModel):
    answer: str = Field(description="The final response to be sent to the user on Messenger.")
    confidence_score: float = Field(description="A score from 0.0 to 1.0 evaluating the confidence of the answer based ONLY on the provided context. If it's a casual greeting (no context needed), set to 1.0.")
    needs_human: bool = Field(description="Return True if the user explicitly asks for a human agent, or if the query is out of context and the bot cannot answer.")

def generate_response(user_message: str, context: str, history: list) -> BotResponse:
    """
    Call Gemini API with grounded context and strict JSON output.
    """
    system_prompt = """
    You are a professional, friendly, and honest AI admission consulting assistant on Messenger.
    
    CORE RULES:
    1. CONTEXT-BOUND: Only use information from the [BACKGROUND CONTEXT] to answer.
    2. NO HALLUCINATION: If the user asks for information not present in the context, ABSOLUTELY DO NOT invent facts. Reply with: "I currently do not have the exact information regarding this matter. Let me transfer you to our human consultants for further assistance." and set needs_human = True.
    3. CHITCHAT: If [BACKGROUND CONTEXT] is empty, this means it is a casual greeting or conversation. Respond politely, naturally, and set confidence_score = 1.0.
    4. MESSENGER FORMATTING: Keep answers concise, use clear paragraph breaks, use emojis for friendliness, and avoid complex formatting like Markdown (**, #, *) as Messenger does not render it well.
    """
    
    # Use a list to build the prompt elements safely
    prompt_elements = [system_prompt, "\n=== BACKGROUND CONTEXT ==="]
    
    if context:
        prompt_elements.append(context)
    else:
        prompt_elements.append("[No search context provided. This is a casual conversation.]")
        
    if history:
        prompt_elements.append("\n=== CHAT HISTORY ===")
        for msg in history[-6:]: 
            role = "User" if msg.get("role") == "user" else "Assistant"
            prompt_elements.append(f"{role}: {msg.get('content')}")
            
    prompt_elements.append(f"\n=== CURRENT QUERY ===\nUser: {user_message}\nAssistant:")
    
    # Join all elements into a single string safely
    final_prompt = "\n".join(prompt_elements)
    
    try:
        response = client.models.generate_content(
            model='gemini-3.1-flash-lite-preview',
            contents=final_prompt,
            config=genai.types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=BotResponse,
                temperature=0.2 
            )
        )
        return response.parsed 
        
    except Exception as e:
        print(f"Error calling Gemini: {e}")
        return BotResponse(
            answer="Our system is currently busy. Please wait a moment or try messaging again later!",
            confidence_score=0.0,
            needs_human=True
        )