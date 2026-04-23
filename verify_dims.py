import os
from backend.rag_pipeline import get_embedding

def test_dimensions():
    print("Testing embedding dimensions for Gemini Embedding 1...")
    text = "Hello world"
    # Using a dummy or real key if available in env
    embedding = get_embedding(text)
    print(f"Embedding length: {len(embedding)}")
    if len(embedding) == 768:
        print("SUCCESS: Embedding dimension is 768.")
    else:
        print(f"FAILURE: Expected 768, got {len(embedding)}")

if __name__ == "__main__":
    test_dimensions()
