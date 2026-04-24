
import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_ANON_KEY")

if not url or not key:
    print("Error: Missing SUPABASE_URL or SUPABASE_KEY in .env")
    exit(1)

supabase: Client = create_client(url, key)

try:
    print(f"Checking table 'conversation_context' at {url}...")
    # List all columns from information_schema
    query = f"SELECT column_name, is_nullable, column_default FROM information_schema.columns WHERE table_name = 'conversation_context'"
    # Note: supabase-py doesn't support raw SQL easily without RPC. 
    # We'll try to insert a dummy row to see all columns in the error message if it fails, 
    # or select * and check keys.
    
    res = supabase.table("conversation_context").select("*").limit(1).execute()
    print("Columns found in conversation_context result:")
    if res.data:
        print(list(res.data[0].keys()))
    else:
        print("Table is empty. Attempting to determine schema via dummy insert...")
        try:
            # Try to insert empty to trigger not-null errors which reveal column names
            supabase.table("conversation_context").insert({}).execute()
        except Exception as e:
            print(f"Schema Info from Error: {e}")

except Exception as e:
    print(f"Error during diagnostic: {e}")
