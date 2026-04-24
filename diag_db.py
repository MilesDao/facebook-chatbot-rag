
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
    print(f"Checking table 'bot_settings' at {url}...")
    # This will trigger a schema check if we ask for keys
    res = supabase.table("bot_settings").select("*").limit(1).execute()
    print("Columns found in bot_settings result:")
    if res.data:
        print(list(res.data[0].keys()))
    else:
        print("Table is empty, cannot determine columns from data.")
        
    # Check if user_id is mentioned in any lingering way
    print("\nAttempting to specifically select 'user_id' to see if it exists but is hidden...")
    try:
        res2 = supabase.table("bot_settings").select("user_id").limit(1).execute()
        print("SUCCESS: 'user_id' actually exists in the database!")
    except Exception as e:
        print(f"EXPECTED ERROR: 'user_id' is indeed missing or inaccessible: {e}")

except Exception as e:
    print(f"Error during diagnostic: {e}")
