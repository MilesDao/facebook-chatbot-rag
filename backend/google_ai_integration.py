import os
import time
import json
from google import genai
from pydantic import BaseModel, Field
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# --- 1. Bot Response Schema ---
class BotResponse(BaseModel):
    answer: str = Field(
        description="Câu trả lời gửi cho khách hàng, chia bằng [SPLIT]."
    )
    confidence_score: float = Field(
        description="Điểm tự tin từ 0.0 đến 1.0."
    )
    needs_human: bool = Field(
        description="True nếu cần hỗ trợ từ người thật."
    )

def generate_response(user_message: str, context: str, history: list, google_key: str = None, llm_model: str = "gemini-3.1-flash-lite-preview", custom_system_prompt: str = None) -> BotResponse:
    """
    Call Google Gemini API directly with grounded context.
    """
    api_key = google_key or os.getenv("GOOGLE_API_KEY")
    if not api_key:
        print("CRITICAL: Google API key is missing!")
        return BotResponse(answer="Dạ hiện mình đang gặp sự cố kết nối [SPLIT] Bạn nhắn lại sau nhé ạ.", confidence_score=0.0, needs_human=True)

    client = genai.Client(api_key=api_key)

    # Use custom prompt if provided
    system_prompt = custom_system_prompt or (
        "You are a professional Facebook Messenger assistant. Use 'mình' and 'bạn'. "
        "Keep answers short. Split bubbles with [SPLIT]. "
        "Base answers ONLY on Background Context."
    )

    # Prepare historical context
    history_text = "\n".join([f"{'User' if m['role']=='user' else 'Assistant'}: {m['content']}" for m in history[-10:]]) if history else ""

    full_prompt = (
        f"{system_prompt}\n\n"
        f"Background Context:\n{context}\n\n"
        f"Conversation History:\n{history_text}\n\n"
        f"User Message: {user_message}\n\n"
        "Return JSON with keys: answer, confidence_score, needs_human."
    )

    try:
        model_name = llm_model if "gemini" in llm_model else "gemini-3.1-flash-lite-preview"
        
        response = client.models.generate_content(
            model=model_name,
            contents=full_prompt,
            config=genai.types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.7
            )
        )
        
        data = json.loads(response.text)
        return BotResponse(
            answer=data.get("answer", ""),
            confidence_score=float(data.get("confidence_score", 0.0)),
            needs_human=bool(data.get("needs_human", False))
        )
    except Exception as e:
        print(f"Error calling Google AI API: {e}")
        return BotResponse(answer="Dạ mình đang bận chút ạ [SPLIT] Bạn đợi mình xíu nhé.", confidence_score=0.0, needs_human=True)
