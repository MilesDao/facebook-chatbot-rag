# Cập nhật trong test.py
import os
from dotenv import load_dotenv

load_dotenv()

from backend.rag_pipeline import retrieve_context
from backend.openrouter_integration import generate_response
from backend.intent_router import classify_intent # Import hàm mới / Import the new function

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
            
            # --- ROUTING ---
            print("\n  [🚦 Routing query...]")
            intent = classify_intent(user_msg)
            print(f"  [🏷️  Intent detected: {intent}]")

            context = ""
            score = 0.0

            if intent == "CHITCHAT":
                print("  [⏭️  Skipping vector search for chitchat.]")
                # Bỏ qua RAG hoàn toàn / Skip RAG entirely
            else:
                # --- RAG PIPELINE (Chỉ chạy khi là QA) ---
                print("  [🔍 Searching database for context...]")
                context, score = retrieve_context(user_msg)
                
                if context:
                    print(f"  [✅ Found relevant document info! (Similarity: {score:.2f})]")
                else:
                    print("  [⚠️ No relevant specific context found in DB. Relying on general knowledge.]")
            
            # 2. Get LLM response
            print("  [🧠 LLM is thinking...]")
            reply_obj = generate_response(user_msg, context, history)
            
            print(f"\n🤖 Bot (Score: {reply_obj.confidence_score} | Handoff: {reply_obj.needs_human}):")
            print(f"   {reply_obj.answer}\n")
            
            # Lưu lịch sử (Chỉ lưu phần answer)
            history.append({"role": "user", "content": user_msg})
            history.append({"role": "assistant", "content": reply_obj.answer})
            
        except KeyboardInterrupt:
            print("\nGoodbye!")
            break
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    chat_loop()
