from google import genai
import sys

try:
    client = genai.Client(api_key="AIzaSyAovtVkNmKg4lUn1mQ8Ct-76iGYbXW026s")
    models = client.models.list()
    embed_models = [m.name for m in models if 'embed' in m.name]
    print("Supported embed models:", embed_models)

    if embed_models:
        model_to_use = embed_models[0]
        try:
            res = client.models.embed_content(model=model_to_use, contents="test")
            print(f"Success with {model_to_use}! Dimensions: {len(res.embeddings[0].values)}")
        except Exception as e:
            print(f"Error {model_to_use}:", e)
    else:
        print("No embed models found.")
except Exception as e:
    print("Error:", e)
