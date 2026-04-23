import os
import glob
from google import genai
from langchain_text_splitters import RecursiveCharacterTextSplitter
from ..database import supabase
from dotenv import load_dotenv

load_dotenv()

class IngestionService:
    def __init__(self, api_key: str = None):
        print("Initializing Ingestion Service with Google GenAI SDK")
        self.api_key = api_key or os.getenv("GOOGLE_API_KEY")
        if not self.api_key:
            print("CRITICAL: GOOGLE_API_KEY missing in IngestionService")
        
        self.client = genai.Client(api_key=self.api_key) if self.api_key else None

        
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=150,
            separators=["\n\n", "\n", " ", ""]
        )

    def ingest_file(self, filepath: str, workspace_id: str = None):
        if not self.api_key or not supabase:    
            print("Error: Google API Key or Supabase not initialized.")
            return

        filename = os.path.basename(filepath)
        print(f"Processing {filename}...")
        
        content = ""
        if filepath.lower().endswith(".txt"):
            chunks_io: list[str] = []
            with open(filepath, "r", encoding="utf-8") as f:
                while True:
                    block = f.read(65536)  # 64 KB per read
                    if not block:
                        break
                    chunks_io.append(block)
            content = "".join(chunks_io)
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
        
        try:
            print(f"Generating embeddings for {len(chunks)} chunks in a single batch...")
            result = self.client.models.embed_content(
                model="models/embedding-001",
                contents=chunks,
                config=genai.types.EmbedContentConfig(
                    task_type="RETRIEVAL_PASSAGE"
                )
            )
            
            if not result.embeddings:
                print("Error: No embedding data received from Google GenAI")
                return
            embeddings = [e.values for e in result.embeddings]
        except Exception as e:
            print(f"Failed to generate embeddings batch for {filename}: {e}")
            return
            
        for i, (chunk, raw_embed) in enumerate(zip(chunks, embeddings)):
            
            # Truncate to 768 dimensions to fit Supabase index limits
            embedding = raw_embed[:768]
            if len(embedding) < 768:
                embedding += [0.0] * (768 - len(embedding))
            
            try:
                data = {
                    "content": chunk,
                    "metadata": {"source": filename, "chunk_id": i},
                    "embedding": embedding 
                }
                if workspace_id:
                    data["workspace_id"] = workspace_id
                    
                supabase.table("documents").insert(data).execute()
                print(f"  > Inserted chunk {i+1}/{len(chunks)} of {filename}")
            except Exception as e:
                print(f"  > Failed to insert chunk {i+1}: {e}")

    def ingest_directory(self, data_dir: str, workspace_id: str = None):
        if not os.path.exists(data_dir):
            print(f"Data directory not found at {data_dir}")
            return

        # Support both .txt and .pdf
        files = glob.glob(os.path.join(data_dir, "*.txt")) + glob.glob(os.path.join(data_dir, "*.pdf"))
        if not files:
            print(f"No .txt or .pdf files found in {data_dir}")
            return

        for filepath in files:
            self.ingest_file(filepath, workspace_id=workspace_id)
