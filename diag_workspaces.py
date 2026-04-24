import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

url = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY")

if not url or not key:
    print("Missing Supabase credentials in .env")
    exit(1)

supabase = create_client(url, key)

def diag_workspaces():
    print("--- Workspaces ---")
    ws_res = supabase.table("workspaces").select("*").execute()
    for row in ws_res.data:
        ws_id = row['id']
        print(f"ID: {ws_id} | Name: {row['name']} | Owner: {row['owner_id']} | Created: {row.get('created_at')}")
        
        # Check associated data
        flows = supabase.table("conversation_flows").select("id").eq("workspace_id", ws_id).execute()
        docs = supabase.table("documents").select("id").eq("workspace_id", ws_id).execute()
        logs = supabase.table("logs").select("id").eq("workspace_id", ws_id).execute()
        
        print(f"  -> Flows: {len(flows.data)} | Docs: {len(docs.data)} | Logs: {len(logs.data)}")

    print("\n--- Workspace Members ---")
    wm_res = supabase.table("workspace_members").select("*").execute()
    for row in wm_res.data:
        print(f"WS ID: {row['workspace_id']} | User ID: {row['user_id']} | Role: {row['role']}")

if __name__ == "__main__":
    diag_workspaces()
