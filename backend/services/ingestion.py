import os
import glob
import time
from google import genai
from langchain_text_splitters import RecursiveCharacterTextSplitter
from ..database import supabase
from dotenv import load_dotenv

load_dotenv()

class IngestionService:
    def __init__(self):
        print("Initializing Ingestion Service with Gemini API")
        self.api_key = os.getenv("GEMINI_API_KEY")
        if not self.api_key:
            print("CRITICAL: GEMINI_API_KEY missing in IngestionService")
        self.client = genai.Client(api_key=self.api_key) if self.api_key else None

        
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=150,
            separators=["\n\n", "\n", " ", ""]
        )

    def ingest_file(self, filepath: str):
        if not self.client or not supabase:    
            print("Error: Client or Supabase not initialized.")
            return

        filename = os.path.basename(filepath)
        print(f"Processing {filename}...")
        
        content = ""
        if filepath.lower().endswith(".txt"):
            with open(filepath, "r", encoding="utf-8") as f:
                content = f.read()
        elif filepath.lower().endswith(".pdf"):
            try:
                from pypdf import PdfReader
                reader = PdfReader(filepath)
                for page in reader.pages:
                    text = page.extract_text()
                    if text:
                        content += text + "\n"
            except Exception as e:
                print(f"Failed to read PDF {filename}: {e}")
                return
        else:
            print(f"Unsupported file type: {filename}")
            return

        if not content.strip():
            print(f"No content extracted from {filename}")
            return

        chunks = self.text_splitter.split_text(content)
        
        max_retries = 6
        base_delay = 3.0
        embeddings = None

        for attempt in range(max_retries):
            try:
                if attempt == 0:
                    print(f"Generating embeddings for {len(chunks)} chunks in a single batch...")
                result = self.client.models.embed_content(
                    model="gemini-embedding-001",
                    contents=chunks
                )
                embeddings = result.embeddings
                break # Success, exit retry loop
            except Exception as e:
                print(f"Failed to generate embeddings batch (Attempt {attempt + 1}/{max_retries}): {e}")
                if attempt < max_retries - 1:
                    time.sleep(base_delay * (2 ** attempt))
                    
        if embeddings is None:
            print("Failed to generate embeddings after all retries.")
            return
            
        for i, (chunk, embed_obj) in enumerate(zip(chunks, embeddings)):
            raw_embed = embed_obj.values
            
            # Đảm bảo kích thước vector là 2048 / Fixed dimension typo to 2048
            embedding = raw_embed[:2048]
            if len(embedding) < 2048:
                embedding += [0.0] * (2048 - len(embedding))
            
            try:
                supabase.table("documents").insert({
                    "content": chunk,
                    "metadata": {"source": filename, "chunk_id": i},
                    "embedding": embedding 
                }).execute()
                print(f"  > Inserted chunk {i+1}/{len(chunks)} of {filename}")
            except Exception as e:
                print(f"  > Failed to insert chunk {i+1}: {e}")

    def ingest_directory(self, data_dir: str):
        if not os.path.exists(data_dir):
            print(f"Data directory not found at {data_dir}")
            return

        # Support both .txt and .pdf
        files = glob.glob(os.path.join(data_dir, "*.txt")) + glob.glob(os.path.join(data_dir, "*.pdf"))
        if not files:
            print(f"No .txt or .pdf files found in {data_dir}")
            return

        for filepath in files:
            self.ingest_file(filepath)
