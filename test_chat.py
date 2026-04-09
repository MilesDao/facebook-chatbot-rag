import os
from dotenv import load_dotenv

load_dotenv()

from backend.rag_pipeline import retrieve_context
from backend.gemini_integration import generate_response

def chat_loop():
    print("="*50)
    print("🤖 LLM + RAG Terminal Chat initialized!")
    print("="*50)
    print("Type 'exit' to quit.\n")
    
    history = []
    while True:
        try:
            user_msg = input("You: ")
            if user_msg.strip().lower() in ['exit', 'quit']:
                print("Goodbye!")
                break
            if not user_msg.strip():
                continue
                
            # 1. Retrieve Context from Supabase
            print("\n  [🔍 Searching database for context...]")
            context, score = retrieve_context(user_msg)
            
            if context:
                print(f"  [✅ Found relevant document info! (Similarity: {score:.2f})]")
            else:
                print("  [⚠️ No relevant specific context found in DB. Relying on general knowledge.]")
            
            # 2. Get LLM response
            print("  [🧠 LLM is thinking...]")
            reply = generate_response(user_msg, context, history)
            
            print(f"\n🤖 Bot: {reply}\n")
            
            # Keep history short to avoid hitting token limits
            history.append({"role": "user", "content": user_msg})
            history.append({"role": "assistant", "content": reply})
            
        except KeyboardInterrupt:
            print("\nGoodbye!")
            break
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    chat_loop()
