import os
from pathlib import Path

import firebase_admin
from firebase_admin import credentials, firestore

BASE_DIR = Path(__file__).resolve().parent
service_account_key = os.getenv("FIREBASE_SERVICE_ACCOUNT_KEY") or str(BASE_DIR / "firebase-key.json")
cred = credentials.Certificate(service_account_key)

if not firebase_admin._apps:
    firebase_admin.initialize_app(cred)

db = firestore.client()