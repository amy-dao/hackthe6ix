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
users_collection.create_index("sessionToken")

# One document per account: the full farm-map drawing (boundary + subplot
# outlines + their form data), so a farmer doesn't have to redraw on a new
# device/browser. Kept separate from fields_collection because it mirrors the
# frontend's FarmState 1:1 rather than the agronomic Field schema.
farm_state_collection = db["farm_state"]
farm_state_collection.create_index("ownerId", unique=True)
