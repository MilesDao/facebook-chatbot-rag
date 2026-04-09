import os
from google import genai
import time

def test_genai():
    api_key = os.getenv("GEMINI_API_KEY")
    client = genai.Client(api_key=api_key)
    
    chunks = ["Hello world", "Another one", "Third text "*50]
    
    start_time = time.time()
    try:
        response = client.models.embed_content(
            model="gemini-embedding-001",
            contents=chunks
        )
        print(f"Success in {time.time() - start_time:.2f}s")
        print(f"Num embeddings: {len(response.embeddings)}")
        print(f"Dimension: {len(response.embeddings[0].values)}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    from dotenv import load_dotenv
    load_dotenv()
    test_genai()
