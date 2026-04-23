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


def clean_llm_answer(text: str) -> str:
    """
    Handle models that leak structured output (double curly braces JSON) into the answer string.
    Example: \"Chào bạn!{{ { 'content': '...', 'tone': 'friendly' } }}\" -> \"Chào bạn! ...\"
    """
    if not text:
        return ""
    
    # Check for double curly braces pattern
    if "{{" in text and "}}" in text:
        try:
            # Attempt to extract the content inside {{ }}
            import re
            match = re.search(r"\{\{(.*?)\}\}", text, re.DOTALL)
            if match:
                inner_json_str = match.group(1).strip()
                # Try to parse it as JSON
                try:
                    inner_data = json.loads(inner_json_str)
                    inner_content = inner_data.get("content") or inner_data.get("answer") or ""
                    
                    # Split the text before {{ and append the inner content
                    prefix = text.split("{{")[0].strip()
                    cleaned = f"{prefix} {inner_content}".strip()
                    return cleaned
                except:
                    # If parsing fails, just strip the outer braces and hope for the best
                    return text.replace("{{", "").replace("}}", "").strip()
        except Exception as e:
            print(f"DEBUG: Error in clean_llm_answer: {e}")
            
    return text


# Configure OpenAI client for OpenRouter
def get_openrouter_client(api_key: str = None):
    if not api_key:
        api_key = os.getenv("OPENROUTER_API_KEY")
    
    base_url = "https://openrouter.ai/api/v1"
    if not api_key:
        print("CRITICAL: OpenRouter API key is missing!")
        return None
    try:
        client = openai.OpenAI(api_key=api_key, base_url=base_url)
        return client
    except Exception as e:
        print(f"Error initializing OpenRouter client: {e}")
        return None


def generate_response(user_message: str, context: str, history: list, openrouter_key: str = None, llm_model: str = "openai/gpt-oss-120b:free", custom_system_prompt: str = None) -> BotResponse:
    """
    Call OpenRouter API with grounded context and return a Structured Output object.
    Supports multi-tenant API keys and custom system prompts.
    """
    # Use custom prompt if provided, otherwise use the defaults
    if custom_system_prompt and custom_system_prompt.strip():
        system_prompt = custom_system_prompt.strip()
    else:
        system_prompt = (
            "You are a friendly, polite, and professional virtual assistant, "
            "acting as a page admin answering messages on Facebook Messenger. "
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
            "needs_human to true if the question is unanswerable from the context or the user needs complex support. "
            "Evaluate your 'confidence_score' based on how well the context covers the question. "
            "5. MEMORY: Always refer back to the conversation history provided below. If the user has already shared personal details, preferences, or context earlier, USE THAT information to make your answers more personalized and accurate."
        )

    # Always append JSON formatting rules to ensure the code can parse the output
    system_prompt += (
        "\n\nCRITICAL: You MUST return a valid JSON object with 'answer', 'confidence_score' (0.0-1.0), and 'needs_human' (boolean). "
        "The 'answer' field MUST be a plain text string ONLY. NEVER include nested JSON, double curly braces {{ }}, or any metadata like 'tone' or 'content' inside the 'answer' field."
    )

    messages = [{"role": "system", "content": system_prompt}]

    if context:
        messages.append(
            {"role": "system", "content": f"Background Context:\n{context}"}
        )

    if history:
        messages.append({"role": "system", "content": "Conversation Chat History:\n"})
        for msg in history[-20:]:
            role = "user" if msg.get("role") == "user" else "assistant"
            messages.append({"role": role, "content": msg.get("content")})

    messages.append({"role": "user", "content": user_message})

    client = get_openrouter_client(openrouter_key)

    if not client:
        # Fallback object if API fails
        return BotResponse(
            answer="Dạ hiện tại admin Page đang hơi bận [SPLIT] Bạn nhắn lại giúp mình sau ít phút nhé ạ.",
            confidence_score=0.0,
            needs_human=True,
        )

    max_retries = 6
    base_delay = 1.5

    for attempt in range(max_retries):
        try:
            # --- Call OpenRouter API ---
            completion = client.chat.completions.create(
                model=llm_model,
                messages=messages,
                response_format={"type": "json_object"},  # Request JSON output
                temperature=0.7,
            )

            # Extract and parse the JSON response
            response_content = completion.choices[0].message.content
            print(f"DEBUG: Raw OpenRouter response: {response_content}")
            
            if not response_content:
                 print("WARNING: OpenRouter returned empty content.")
                 return BotResponse(answer="", confidence_score=0.0, needs_human=True)

            try:
                response_data = json.loads(response_content)
            except Exception as json_err:
                print(f"ERROR: Failed to parse JSON from LLM: {json_err}")
                # Fallback: if not JSON, use the whole content as answer
                return BotResponse(answer=response_content, confidence_score=0.5, needs_human=False)

            # Map the response to BotResponse - handle both 'answer' and 'response' keys
            # as some models might deviate slightly from the schema instructions
            val_answer = response_data.get("answer") or response_data.get("response") or ""
            
            # Post-process to fix the double-JSON bug
            final_answer = clean_llm_answer(val_answer)
            
            return BotResponse(
                answer=final_answer,
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


# --- OpenAI / Non-Google Model Consideration ---
# Supported models include Mistral, Llama, GPT, etc via OpenRouter.
