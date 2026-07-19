import os
from pathlib import Path

import certifi
from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv(Path(__file__).resolve().parent / ".env")

MONGODB_URI = os.environ.get("MONGODB_URI")
if not MONGODB_URI:
    raise RuntimeError("MONGODB_URI is not set. Copy backend/.env.example to backend/.env and fill it in.")

client = MongoClient(MONGODB_URI, tlsCAFile=certifi.where())
db = client.get_default_database("fieldintel")
fields_collection = db["fields"]

users_collection = db["users"]
users_collection.create_index("username", unique=True)
