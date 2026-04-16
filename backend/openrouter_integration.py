import os
import time
import openai
import json  # Import json for parsing
from pydantic import BaseModel, Field
from dotenv import load_dotenv

# Load environment variables
load_dotenv()


# --- 1. ĐỊNH NGHĨA KHUÔN DỮ LIỆU ĐẦU RA (STRUCTURED OUTPUT SCHEMA) ---
class BotResponse(BaseModel):
    answer: str = Field(
        description="Câu trả lời gửi cho khách hàng, tuân thủ nghiêm ngặt việc chia nhỏ bằng ký tự [SPLIT]."
    )
    confidence_score: float = Field(
        description="Điểm tự tin của câu trả lời từ 0.0 đến 1.0 (1.0 là cực kỳ chắc chắn vì có dữ liệu trong Context)."
    )
    needs_human: bool = Field(
        description="Trả về True nếu user đang cáu gắt, hoặc hỏi những câu quá phức tạp mà Context không có, cần chuyển cho tư vấn viên là người thật."
    )


# Configure OpenAI client for OpenRouter
def get_openrouter_client():
    api_key = os.getenv("OPENROUTER_API_KEY")
    base_url = "https://openrouter.ai/api/v1"
    if not api_key:
        print("CRITICAL: OPENROUTER_API_KEY is missing from environment variables!")
        return None
    try:
        client = openai.OpenAI(api_key=api_key, base_url=base_url)
        return client
    except Exception as e:
        print(f"Error initializing OpenRouter client: {e}")
        return None


client = get_openrouter_client()

print(
    f"DEBUG: Using OpenRouter API Key: {os.getenv('OPENROUTER_API_KEY')[:10] if os.getenv('OPENROUTER_API_KEY') else 'None'}..."
)


def generate_response(user_message: str, context: str, history: list) -> BotResponse:
    """
    Call OpenRouter API with grounded context and return a Structured Output object.
    """
    system_prompt = (
        "You are a friendly, polite, and professional student advisor/consultant at USTH "
        "(University of Science and Technology of Hanoi), acting as a page admin answering messages on Facebook Messenger. "
        "You chat like a real person: natural, approachable, concise, but always respectful. "
        "Follow these STRICT guidelines:\n"
        "1. TONE: Use the pronoun 'mình' for yourself and 'bạn' for the user. "
        "Be polite but not robotic. Add soft Vietnamese particles like 'ạ', 'nhé', or 'nha' naturally. "
        "AVOID cliché AI openings/closings like 'Chào bạn!', 'Rất vui được hỗ trợ'.\n"
        "2. CONCISENESS: Keep answers extremely short. NEVER write long paragraphs. "
        "Summarize lists into broad categories and ask a polite follow-up question.\n"
        "3. MESSAGE SPLITTING: Break your response into 2 to 4 short, separate thoughts. "
        "You MUST use the exact string '[SPLIT]' to separate each bubble. "
        "Example format: 'Dạ trường có nhiều ngành lắm ạ [SPLIT] Phổ biến nhất là mảng ICT và Hàng không [SPLIT] Bạn đang quan tâm nhóm ngành nào ạ?'\n"
        "4. ACCURACY & HANDOFF: Base your answers ONLY on the provided Background Context. "
        "If you don't know the answer, politely say you will check. "
        "Set 'needs_human' to true if the question is unanswerable from the context or the user needs complex support. "
        "Evaluate your 'confidence_score' based on how well the context covers the question."
    )

    messages = [{"role": "system", "content": system_prompt}]

    if context:
        messages.append(
            {"role": "system", "content": f"Background Context:\n{context}"}
        )

    if history:
        messages.append({"role": "system", "content": "Conversation Chat History:\n"})
        for msg in history[-10:]:
            role = "user" if msg.get("role") == "user" else "assistant"
            messages.append({"role": role, "content": msg.get("content")})

    messages.append({"role": "user", "content": user_message})

    global client
    if not client:
        client = get_openrouter_client()

    if not client:
        # Fallback object if API fails
        return BotResponse(
            answer="Dạ hiện tại đường truyền đang hơi chậm [SPLIT] Bạn nhắn lại giúp mình sau ít phút nhé ạ.",
            confidence_score=0.0,
            needs_human=True,
        )

    max_retries = 6
    base_delay = 1.5

    for attempt in range(max_retries):
        try:
            # --- Call OpenRouter API ---
            completion = client.chat.completions.create(
                model="gpt-oss-120b",  # Use the specified model
                messages=messages,
                response_format={"type": "json_object"},  # Request JSON output
                temperature=0.7,  # Adjust temperature as needed
            )

            # Extract and parse the JSON response
            response_content = completion.choices[0].message.content
            response_data = json.loads(response_content)

            # Map the response to BotResponse
            return BotResponse(
                answer=response_data.get("answer", ""),
                confidence_score=float(response_data.get("confidence_score", 0.0)),
                needs_human=bool(response_data.get("needs_human", False)),
            )

        except Exception as e:
            print(
                f"Error calling OpenRouter API (Attempt {attempt + 1}/{max_retries}): {e}"
            )
            if attempt < max_retries - 1:
                # Exponential backoff
                time.sleep(base_delay * (2**attempt))
            else:
                return BotResponse(
                    answer="Dạ hiện tại đường truyền đang hơi chậm [SPLIT] Bạn nhắn lại giúp mình sau ít phút nhé ạ.",
                    confidence_score=0.0,
                    needs_human=True,
                )


# --- Embedding Model Consideration ---
# The current embedding model used in rag_pipeline.py is 'gemini-embedding-001'.
# While it might work, it's recommended to use an embedding model compatible with
# the chosen LLM (gpt-oss-120b). We will keep the current embedding model for now
# and evaluate performance. If issues arise, we can switch to a different model,
# potentially one from OpenAI or another provider accessible via OpenRouter.
#
# Placeholder for potential future embedding model integration:
# def get_embedding_model():
#     pass
#
# def get_embedding(text: str) -> list[float]:
#     # Integrate with a new embedding model here
#     pass
