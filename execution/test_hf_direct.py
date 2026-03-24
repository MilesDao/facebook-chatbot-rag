import os
import sys
from dotenv import load_dotenv

# Ensure execution package can be found
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

load_dotenv()

from execution.huggingface_integration import generate_response

if __name__ == "__main__":
    MODEL_ID = os.getenv("HUGGINGFACE_MODEL_ID", "mistralai/Mistral-7B-Instruct-v0.2")
    print(f"Testing Private API Wrapper with Model: {MODEL_ID}")
    with open("debug.log", "w", encoding="utf-8") as f:
        f.write(f"Model: {MODEL_ID}\n")
    try:
        response = generate_response("Xin chào, bạn là ai?", "Bạn là một chatbot hỗ trợ sinh viên.", [])
        with open("debug.log", "w", encoding="utf-8") as f:
            f.write(f"Response: {response}\n")
        print(f"Response: {response}")
    except Exception as e:
        import traceback
        error_msg = traceback.format_exc()
        with open("debug.log", "w", encoding="utf-8") as f:
            f.write(f"Error: {error_msg}\n")
        print(f"Error: {error_msg}")
