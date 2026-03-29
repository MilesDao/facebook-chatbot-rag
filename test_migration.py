import os
from dotenv import load_dotenv
from groq import Groq
from sentence_transformers import SentenceTransformer

load_dotenv()

def test_local_embeddings():
    print("\n--- Testing Local Embeddings (all-MiniLM-L6-v2) ---")
    model_name = "sentence-transformers/all-MiniLM-L6-v2"
    print(f"Loading {model_name} (this is a small, fast model)...")
    try:
        model = SentenceTransformer(model_name)
        text = "Hello, this is a vectorization test."
        embedding = model.encode(text)
        print(f"Success! Embedding dimension: {len(embedding)}")
        if len(embedding) == 384:
            print("Dimension is correct (384).")
        else:
            print(f"WARNING: Dimension is {len(embedding)}, expected 384.")
    except Exception as e:
        print(f"Embedding Test Failed: {e}")

def test_groq_llm():
    print("\n--- Testing Groq LLM (Llama 3.3 70B) ---")
    api_key = os.getenv("GROQ_API_KEY")
    model_id = os.getenv("GROQ_MODEL_ID", "llama-3.3-70b-versatile")
    
    if not api_key:
        print("Error: GROQ_API_KEY not found in .env")
        return

    try:
        client = Groq(api_key=api_key)
        completion = client.chat.completions.create(
            model=model_id,
            messages=[
                {"role": "system", "content": "You are a helpful assistant."},
                {"role": "user", "content": "Chào bạn, hãy giới thiệu ngắn gọn về bản thân bằng tiếng Việt."}
            ],
            max_completion_tokens=100
        )
        print(f"Success! Groq Response:\n{completion.choices[0].message.content.strip()}")
    except Exception as e:
        print(f"Groq Test Failed: {e}")

if __name__ == "__main__":
    # Note: test_local_embeddings() might be heavy for the first time.
    # We'll try Groq first as it's faster to verify.
    test_groq_llm()
    test_local_embeddings()
