import os
from supabase.client import create_client
from langchain_community.document_loaders import PyPDFDirectoryLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_community.vectorstores import SupabaseVectorStore


SUPABASE_URL = "https://qffwbeldaghwlyfnsnhc.supabase.co"
SUPABASE_KEY = "sb_publishable_5EJ070mH65c4XUmBak0uag_ECktxoS-"
GOOGLE_API_KEY = "GOOGLE_API_KEY"

os.environ["GOOGLE_API_KEY"] = GOOGLE_API_KEY
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)


embeddings = GoogleGenerativeAIEmbeddings(model="models/embedding-001")

print("1. Đang đọc PDF...")
loader = PyPDFDirectoryLoader("raw_data")
docs = loader.load()

print("2. Đang băm nhỏ tài liệu...")
text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
chunks = text_splitter.split_documents(docs)

print("3. Đang đẩy dữ liệu lên Supabase (Vui lòng đợi)...")
vector_store = SupabaseVectorStore.from_documents(
    chunks,
    embeddings,
    client=supabase,
    table_name="documents",
    query_name="match_documents",
)

print("\n Kiến thức đã nằm gọn trên Supabase Cloud.")