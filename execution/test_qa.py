import os
import sys
from dotenv import load_dotenv

# Ensure execution package can be found
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

load_dotenv()

from execution.rag_pipeline import retrieve_context
from execution.gemini_integration import generate_response

def test_qa(query: str):
    print(f"\n" + "="*50)
    print(f"Testing Query: '{query}'")
    print("="*50)
    
    print("1. Retrieving context from Supabase...")
    context, score = retrieve_context(query)
    
    print(f"Highest Confidence Score: {score:.4f}")
    if score < 0.4:
        print("-> WARNING: Confidence score < 0.4. This would trigger human handoff!")
        
    print(f"\nRetrieved Context Block(s):\n{context}")
    print("-" * 50)
    
    print("2. Generating response with Gemini...")
    answer = generate_response(query, context, [])
    print(f"\nAI Answer:\n{answer}")
    print("="*50 + "\n")

if __name__ == "__main__":
    # Test cases mapped to typical data queries
    test_queries = [
        "What are the requirements for applying to a club?",
        "Thông tin về học phí của trường là bao nhiêu?",
    ]
    
    for q in test_queries:
        test_qa(q)
