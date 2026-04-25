import os
import sys
from dotenv import load_dotenv

# Add the current directory to sys.path to allow importing from backend
sys.path.append(os.getcwd())

# Load environment variables
load_dotenv()

# Import flow engine and database
try:
    from backend.services.flow_engine import process_flow_interaction
    from backend.database import supabase
except ImportError as e:
    print(f"Error importing backend services: {e}")
    sys.exit(1)

# Configuration for Duong Lien Workspace
WORKSPACE_ID = "fdfd4eb1-484b-432b-a173-f2418077c16f"
DEFAULT_SENDER_ID = "interactive_tester"

def clear_context(sender_id):
    """Clear previous session data for the sender."""
    try:
        supabase.table("conversation_context").delete().eq("workspace_id", WORKSPACE_ID).eq("sender_id", sender_id).execute()
        supabase.table("chat_history").delete().eq("workspace_id", WORKSPACE_ID).eq("sender_id", sender_id).execute()
        print(f"\n[System] Context cleared for {sender_id}.")
    except Exception as e:
        print(f"\n[System] Error clearing context: {e}")

def chat():
    print("========================================")
    print("   AI CHATBOT INTERACTIVE TERMINAL")
    print("   Workspace: Duong Lien")
    print("========================================")
    
    sender_id = input(f"Enter Sender ID (default: {DEFAULT_SENDER_ID}): ").strip() or DEFAULT_SENDER_ID
    
    reset = input("Reset conversation history? (y/n): ").lower().strip()
    if reset == 'y':
        clear_context(sender_id)
    
    print("\n[System] Chat started. Type 'exit' or 'quit' to stop.\n")
    
    google_key = os.getenv("GOOGLE_API_KEY")
    
    while True:
        try:
            user_msg = input("You: ").strip()
            
            if not user_msg:
                continue
                
            if user_msg.lower() in ['exit', 'quit', 'bye']:
                print("Goodbye!")
                break
                
            # Check if this sender is paused (admin took over via handoff)
            pause_check = supabase.table("paused_senders").select("id").eq("workspace_id", WORKSPACE_ID).eq("sender_id", sender_id).limit(1).execute()
            if pause_check.data:
                print(f"Bot: (Sender is PAUSED due to handoff. AI responses are disabled.)")
                continue

            # Call the flow engine
            response, handoff = process_flow_interaction(WORKSPACE_ID, sender_id, user_msg, google_key=google_key)
            
            if response:
                # Handle multi-part messages
                parts = response.split("[SPLIT]")
                for part in parts:
                    if part.strip():
                        print(f"Bot: {part.strip()}")
            else:
                print("Bot: (No response from Flow Engine. Chatbot might be using fallback logic.)")
                
        except KeyboardInterrupt:
            print("\nGoodbye!")
            break
        except Exception as e:
            print(f"\n[Error] {e}")

if __name__ == "__main__":
    if not os.getenv("SUPABASE_URL") or not os.getenv("SUPABASE_KEY"):
        print("Error: SUPABASE_URL and SUPABASE_KEY must be set in .env")
        sys.exit(1)
        
    chat()
