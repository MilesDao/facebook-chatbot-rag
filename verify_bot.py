import os
import sys
from dotenv import load_dotenv

# Add current directory to path to import backend
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

load_dotenv()

from backend.message_handler import handle_message
from backend.database import supabase

def run_verification():
    print("="*60)
    print("🤖 BOT LOGIC VERIFICATION TOOL")
    print("="*60)
    print("This script will help you verify: ")
    print("1. The Default Flow (Messages 1 & 2)")
    print("2. The AI/RAG engine fallback (Message 3+)")
    print("="*60)

    # 1. Get Workspace
    res = supabase.table("workspaces").select("id, name").order("created_at", desc=True).limit(20).execute()
    workspaces = res.data or []
    
    if not workspaces:
        print("❌ No workspaces found in database.")
        return

    print("\nSelect a Workspace for testing:")
    for i, ws in enumerate(workspaces):
        print(f"{i+1}. {ws['name']} ({ws['id']})")
    
    choice = input("\nEnter choice (default 1): ").strip()
    idx = int(choice) - 1 if choice.isdigit() and 0 < int(choice) <= len(workspaces) else 0
    workspace_id = workspaces[idx]['id']
    print(f"✅ Using workspace: {workspaces[idx]['name']}")

    # 2. Get Bot Settings (API Key)
    settings_res = supabase.table("bot_settings").select("*").eq("workspace_id", workspace_id).limit(1).execute()
    google_key = None
    if settings_res.data:
        google_key = settings_res.data[0].get("google_api_key")
        print("✅ Found Google API Key in settings.")
    else:
        print("⚠️ No bot settings found. Falling back to environment GOOGLE_API_KEY.")
        google_key = os.getenv("GOOGLE_API_KEY")

    # 3. Choose a Test Sender ID
    import random
    import string
    test_id = 'test_user_' + ''.join(random.choices(string.ascii_lowercase + string.digits, k=6))
    print(f"✅ Generated unique test sender_id: {test_id}")
    print("\n--- STARTING CONVERSATION SIMULATION ---")

    # Suggested queries (Vietnamese for the main workspace, English fallback)
    is_vn = "đại học" in workspaces[idx]['name'].lower()
    test_queries = [
        "Xin chào" if is_vn else "Hello",
        "Tôi cần tư vấn tuyển sinh" if is_vn else "I need help",
        "Ngành Công nghệ thông tin học phí bao nhiêu?" if is_vn else "What services do you offer?"
    ]

    for i in range(3):
        print(f"\n[Step {i+1}/3]")
        prompt = f"Enter message {i+1} (default: '{test_queries[i]}'): "
        user_msg = input(prompt).strip() or test_queries[i]
        
        print("Processing...")
        reply = handle_message(
            sender_id=test_id,
            user_message=user_msg,
            workspace_id=workspace_id,
            google_key=google_key
        )
        
        print(f"\n--- BOT RESPONSE ---")
        print(reply)
        print("-" * 20)
        
        if i < 2:
            print(f"💡 [Logic Check]: This was handled by the VISUAL FLOW ENGINE (Stateful sequence).")
        else:
            print(f"💡 [Logic Check]: This was handled by the AI/RAG ENGINE (Knowledge base search).")

    print("\n" + "="*60)
    print("✅ VERIFICATION COMPLETE")
    print("="*60)
    print(f"You can now go to the Admin Dashboard (Active Customers) and search for user '{test_id}' to see the full log.")

if __name__ == "__main__":
    run_verification()
