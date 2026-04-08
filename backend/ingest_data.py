import os
from .services.ingestion import IngestionService

# Data directory relative to this file
DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "raw_data")

def main():
    service = IngestionService()
    # Check both data/ and raw_data/ for backward compatibility/flexibility
    alt_data_dir = os.path.join(os.path.dirname(__file__), "..", "data")
    
    if os.path.exists(DATA_DIR):
        print(f"Ingesting from {DATA_DIR}...")
        service.ingest_directory(DATA_DIR)
    
    if os.path.exists(alt_data_dir):
        print(f"Ingesting from {alt_data_dir}...")
        service.ingest_directory(alt_data_dir)

if __name__ == "__main__":
    main()
    print("\nIngestion complete!")
