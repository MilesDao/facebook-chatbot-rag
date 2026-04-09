from langchain_google_genai import GoogleGenerativeAIEmbeddings

emb = GoogleGenerativeAIEmbeddings(model="models/embedding-001")
print(emb.embed_query("hello"))