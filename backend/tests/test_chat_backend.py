# Mock firebase before importing app
import sys
from unittest.mock import MagicMock, patch

import pytest

sys.modules['firebase_admin'] = MagicMock()
sys.modules['firebase_admin.credentials'] = MagicMock()
sys.modules['firebase_admin.firestore'] = MagicMock()
sys.modules['firebase_config'] = MagicMock()
sys.modules['flask_cors'] = MagicMock()

from backend.src.app import app


@pytest.fixture
def client():
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client


@pytest.fixture
def auth_headers():
    return {
        "Authorization": "Bearer valid-token",
    }


def test_find_or_create_direct_chat_creates_chat(client, auth_headers):
    chat_ref = MagicMock()
    chat_snapshot = MagicMock()
    chat_snapshot.exists = False
    chat_ref.get.return_value = chat_snapshot

    chats_collection = MagicMock()
    chats_collection.document.return_value = chat_ref

    with patch('backend.src.app.firebase_auth.verify_id_token', return_value={"uid": "user_1", "name": "Alice"}), \
         patch('backend.src.app.are_friends', return_value=True), \
         patch('backend.src.app.db') as mock_db, \
         patch('backend.src.app.get_user_public_profile') as mock_profile:
        mock_db.collection.side_effect = lambda name: chats_collection if name == 'chats' else MagicMock()
        mock_profile.side_effect = lambda uid: {
            "user_1": {"displayName": "Alice"},
            "user_2": {"displayName": "Bob"},
        }.get(uid)

        response = client.post(
            '/chats/find_or_create',
            json={"members": ["user_2", "user_1"]},
            headers=auth_headers,
        )

    assert response.status_code == 201
    payload = response.get_json()
    assert payload["created"] is True
    assert payload["chat_id"].startswith("dm_")
    assert payload["chat"]["displayTitle"] == "Bob"

    saved_chat = chat_ref.set.call_args.args[0]
    assert saved_chat["type"] == "direct"
    assert saved_chat["source"] == "direct"
    assert saved_chat["members"] == ["user_1", "user_2"]


def test_get_chat_returns_viewer_specific_title(client, auth_headers):
    chat_ref = MagicMock()
    chat_ref.id = "dm_existing"

    chat_snapshot = MagicMock()
    chat_snapshot.exists = True
    chat_snapshot.to_dict.return_value = {
        "type": "direct",
        "source": "direct",
        "members": ["user_1", "user_2"],
        "title": "Alice, Bob",
    }
    chat_ref.get.return_value = chat_snapshot

    chats_collection = MagicMock()
    chats_collection.document.return_value = chat_ref

    with patch('backend.src.app.firebase_auth.verify_id_token', return_value={"uid": "user_1", "name": "Alice"}), \
         patch('backend.src.app.are_friends', return_value=True), \
         patch('backend.src.app.db') as mock_db, \
         patch('backend.src.app.get_user_public_profile') as mock_profile:
        mock_db.collection.side_effect = lambda name: chats_collection if name == 'chats' else MagicMock()
        mock_profile.side_effect = lambda uid: {
            "user_1": {"displayName": "Alice"},
            "user_2": {"displayName": "Bob"},
        }.get(uid)

        response = client.get('/chats/dm_existing', headers=auth_headers)

    assert response.status_code == 200
    payload = response.get_json()
    assert payload["id"] == "dm_existing"
    assert payload["displayTitle"] == "Bob"


def test_create_chat_message_uses_authenticated_user_identity(client, auth_headers):
    chat_ref = MagicMock()
    chat_snapshot = MagicMock()
    chat_snapshot.exists = True
    chat_snapshot.to_dict.return_value = {
        "type": "direct",
        "source": "direct",
        "members": ["user_1", "user_2"],
    }
    chat_ref.get.return_value = chat_snapshot

    messages_collection = MagicMock()
    message_ref = MagicMock()
    message_ref.id = "msg_123"
    messages_collection.document.return_value = message_ref
    chat_ref.collection.return_value = messages_collection

    chats_collection = MagicMock()
    chats_collection.document.return_value = chat_ref

    with patch('backend.src.app.firebase_auth.verify_id_token', return_value={"uid": "user_1", "name": "Alice"}), \
         patch('backend.src.app.are_friends', return_value=True), \
         patch('backend.src.app.db') as mock_db, \
         patch('backend.src.app.get_user_public_profile', return_value={"displayName": "Alice"}):
        mock_db.collection.side_effect = lambda name: chats_collection if name == 'chats' else MagicMock()

        response = client.post(
            '/chats/dm_existing/messages',
            json={
                "text": "Still on for the study group?",
                "user_id": "spoofed_user",
                "username": "Mallory",
            },
            headers=auth_headers,
        )

    assert response.status_code == 201
    payload = response.get_json()
    assert payload["id"] == "msg_123"
    assert payload["user_id"] == "user_1"
    assert payload["username"] == "Alice"

    saved_message = message_ref.set.call_args.args[0]
    assert saved_message["user_id"] == "user_1"
    assert saved_message["username"] == "Alice"
    assert saved_message["text"] == "Still on for the study group?"


def test_find_or_create_direct_chat_rejects_non_friends(client, auth_headers):
    with patch('backend.src.app.firebase_auth.verify_id_token', return_value={"uid": "user_1", "name": "Alice"}), \
         patch('backend.src.app.are_friends', return_value=False):
        response = client.post(
            '/chats/find_or_create',
            json={"members": ["user_1", "user_2"]},
            headers=auth_headers,
        )

    assert response.status_code == 403
    assert response.get_json() == {
        "error": "Direct messages are only available between friends"
    }


def test_direct_chat_messages_reject_non_friends(client, auth_headers):
    chat_ref = MagicMock()
    chat_snapshot = MagicMock()
    chat_snapshot.exists = True
    chat_snapshot.to_dict.return_value = {
        "type": "direct",
        "source": "direct",
        "members": ["user_1", "user_2"],
    }
    chat_ref.get.return_value = chat_snapshot

    chats_collection = MagicMock()
    chats_collection.document.return_value = chat_ref

    with patch('backend.src.app.firebase_auth.verify_id_token', return_value={"uid": "user_1", "name": "Alice"}), \
         patch('backend.src.app.are_friends', return_value=False), \
         patch('backend.src.app.db') as mock_db:
        mock_db.collection.side_effect = lambda name: chats_collection if name == 'chats' else MagicMock()

        response = client.post(
            '/chats/dm_existing/messages',
            json={"text": "Hello"},
            headers=auth_headers,
        )

    assert response.status_code == 403
    assert response.get_json() == {
        "error": "Direct messages are only available between friends"
    }
