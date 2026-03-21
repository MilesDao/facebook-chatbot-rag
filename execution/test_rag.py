import os
from dotenv import load_dotenv

# We need to manually invoke load_dotenv before importing rag_pipeline 
# so the Supabase config variables are available at import time
load_dotenv()

from rag_pipeline import retrieve_context

def test_retrieval(query: str):
    print(f"\n" + "="*50)
    print(f"Testing Query: '{query}'")
    print("="*50)
    
    context, score = retrieve_context(query)
    
    print(f"Highest Confidence Score: {score:.4f}")
    if score < 0.4:
        print("-> WARNING: Confidence score < 0.4. This would trigger human handoff!")
        
    print(f"\nRetrieved Context Block(s):\n{context}")
    print("="*50 + "\n")

if __name__ == "__main__":
    # Test cases mapped to your typical data texts
    test_queries = [
        "What are the requirements for applying to a club?",
        "Thông tin về học phí của trường là bao nhiêu?",
        "Explain the score improvement guideline for students.",
        "Quy định về sinh viên học bằng kép"
    ]
    
    for q in test_queries:
        test_retrieval(q)
