import os
import glob
from google import genai
from google.genai import types
from langchain_text_splitters import RecursiveCharacterTextSplitter
from ..database import supabase
from dotenv import load_dotenv

load_dotenv()
class IngestionService:
    def __init__(self):
        print("Initializing Ingestion Service with Gemini Embedding")
        # Load local embedding model
        self.api_key = os.getenv("GEMINI_API_KEY")
        if not self.api_key:
            print("CRITICAL: GEMINI_API_KEY missing in IngestionService")
        self.client = genai.Client(api_key=self.api_key) if self.api_key else None

        
        # Setup text splitter
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=150,
            separators=["\n\n", "\n", " ", ""]
        )

    def ingest_file(self, filepath: str):
        if not self.client or not supabase:    
            print("Client or Supabase not initialized.")
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

        # Split into chunks
        chunks = self.text_splitter.split_text(content)
        
        # Batch create all embeddings
        try:
            print(f"Generating embeddings for {len(chunks)} chunks...")
            result = self.client.models.embed_content(
                model="gemini-embedding-001",
                contents=chunks
            )
            embeddings = result.embeddings
        except Exception as e:
            print(f"Failed to generate embeddings batch: {e}")
            return
            
        for i, (chunk, embed_obj) in enumerate(zip(chunks, embeddings)):
            raw_embed = embed_obj.values
            embedding = raw_embed[:768]
            if len(embedding) < 768:
                embedding += [0.0] * (768 - len(embedding))
            
            # Insert to Supabase DB table `documents`
            try:
                supabase.table("documents").insert({
                    "content": chunk,
                    "metadata": {"source": filename, "chunk_id": i},
                    "embedding": embedding # padded to 768
                }).execute()
                print(f"  > Inserted chunk {i+1}/{len(chunks)} of {filename}")
            except Exception as e:
                print(f"  > Failed to insert chunk {i}: {e}")

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

