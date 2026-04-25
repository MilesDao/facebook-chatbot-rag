import os
import sys
import json
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
TEST_SENDER_ID = "test_user_duong_lien"

def clear_test_data():
    """Clear previous session data for the test user."""
    print(f"--- Resetting context for sender: {TEST_SENDER_ID} ---")
    try:
        supabase.table("conversation_context").delete().eq("workspace_id", WORKSPACE_ID).eq("sender_id", TEST_SENDER_ID).execute()
        supabase.table("chat_history").delete().eq("workspace_id", WORKSPACE_ID).eq("sender_id", TEST_SENDER_ID).execute()
        print("Context cleared successfully.")
    except Exception as e:
        print(f"Warning: Could not clear context (maybe it doesn't exist): {e}")

def run_test_scenario():
    """Run a simulated conversation to test the 'Default' flow."""
    print(f"\n=== Testing 'Default' Flow for Workspace: Duong Lien ===")
    print(f"Workspace ID: {WORKSPACE_ID}")
    
    # Sequence of user messages to test different paths
    test_messages = [
        "Chào bot",                                     # Should trigger start node
        "Mình muốn tìm hiểu về ngành Quản trị kinh doanh", # Should match logic for school/industry info -> RAG
        "Trường có học phí thế nào?",                    # Should follow up in RAG/Logic path
        "Thời tiết hôm nay có đẹp không?"               # Should match logic for unrelated question -> Handoff
    ]
    
    for i, msg in enumerate(test_messages, 1):
        print(f"\n[Step {i}] User: {msg}")
        try:
            # We pass the GOOGLE_API_KEY explicitly if needed by the engine
            google_key = os.getenv("GOOGLE_API_KEY")
            
            response = process_flow_interaction(WORKSPACE_ID, TEST_SENDER_ID, msg, google_key=google_key)
            
            if response:
                # Flow engine often uses [SPLIT] for multi-part messages
                clean_response = response.replace("[SPLIT]", "\nBot: ")
                print(f"Bot: {clean_response}")
            else:
                print("Bot: (No response from Flow Engine - likely falling back to RAG/Intent Router)")
                
        except Exception as e:
            print(f"Error during flow execution: {e}")

if __name__ == "__main__":
    # Ensure we have the necessary environment variables
    if not os.getenv("SUPABASE_URL") or not os.getenv("SUPABASE_KEY"):
        print("Error: SUPABASE_URL and SUPABASE_KEY must be set in .env")
        sys.exit(1)
        
    clear_test_data()
    run_test_scenario()
    print("\n--- Test Complete ---")
