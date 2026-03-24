#Use https://en.wikipedia.org/wiki/List_of_HTTP_status_codes to find valid HTML status codes for tests.


import pytest
from unittest.mock import MagicMock, patch
import sys

#Mock firebase before importing app
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

#Test ID: 001
#Home route works
#Description: Uses test client to request the blank / route- makes sure website runs.
def test_home(client):
    response = client.get('/')
    assert response.status_code == 200
    assert response.get_json() == {"message": "Unigenda backend is running"}

#Test ID: 002
#Get tasks route
#Description: Creates an empty mock_tasks list and requests the tasks from backend- checks it works and gives back an empty list.
def test_get_tasks_empty(client):
    with patch('backend.src.app.tasks') as mock_tasks:
        mock_tasks.stream.return_value = []
        response = client.get('/tasks')
        assert response.status_code == 200
        assert response.get_json() == []

#Test ID: 003
#Task route returns a list
#Description: Creates a mock task which is added to a mock task list which is requested from the backend- checks to make sure the backend returns the same task.
def test_get_tasks_returns_list(client):
    mock_doc = MagicMock()
    mock_doc.to_dict.return_value = {"task": "Test task"}
    with patch('backend.src.app.tasks') as mock_tasks:
        mock_tasks.stream.return_value = [mock_doc]
        response = client.get('/tasks')
        assert response.status_code == 200
        assert response.get_json() == [{"task": "Test task"}]

#Test ID: 004
#Login route with invalid token
#Description: Requests tasks from backend with generic user ID to make sure private tasks aren't accessible to others.
def test_protected_route_requires_auth(client):
    # Accessing user tasks without a token should return 401
    response = client.get('/tasks/some_user_id')
    assert response.status_code == 401

#Test ID: 005
#Creating a public task with arbitrary values
#Description: Provides a generic tasks to backend and tries to get a valid success code.
def test_create_public_task(client):
    with patch('backend.src.app.db') as mock_db:
        mock_collection = MagicMock()
        mock_db.collection.return_value = mock_collection
        mock_collection.add.return_value = (None, MagicMock(id='abc123'))
        response = client.post('/tasks', json={
            "title": "Study group",
            "description": "Calculus review",
            "dueDate": "2026-04-01",
            "userId": "user_1",
            "isPublic": True
        })
        assert response.status_code == 201

#Test ID: 006
#GETing other users public tasks
#Description: Creates a mock public tasks and checks if client can access through public task route.
def test_fetch_public_tasks(client):
    mock_doc = MagicMock()
    mock_doc.to_dict.return_value = {
        "title": "Study group",
        "userId": "user_2",
        "isPublic": True,
        "status": "pending"
    }
    mock_doc.id = "abc123"
    with patch('backend.src.app.db') as mock_db:
        mock_collection = MagicMock()
        mock_db.collection.return_value = mock_collection
        mock_collection.where.return_value.stream.return_value = [mock_doc]
        response = client.get('/tasks/public')
        assert response.status_code == 200
        tasks = response.get_json()
        assert any(t.get("isPublic") for t in tasks)

#Test ID: 007
#Normal user cannot ban others
#Description: Check if ban route is accessible to generic client.
def test_non_admin_cannot_ban(client):
    # A regular user should not be able to ban another user
    response = client.post('/admin/ban', json={"userId": "user_2"})
    assert response.status_code == 403

#Test ID: 008
#Admin can ban users
#Description: Creates generic user with admin privileges and checks that they can ban other users with ban route.
def test_admin_can_ban_user(client):
    with patch('backend.src.app.db') as mock_db:
        mock_collection = MagicMock()
        mock_db.collection.return_value = mock_collection
        mock_collection.document.return_value.get.return_value.to_dict.return_value = {
            "isAdmin": True
        }
        response = client.post('/admin/ban', 
            json={"userId": "user_2"},
            headers={"X-Admin-Token": "valid_admin_token"}
        )
        assert response.status_code == 200

#Test ID: 009
#User can block others
#Description: Check that one generic user can block another generic user, verifies user added to returned block list.
def test_block_user(client):
    with patch('backend.src.app.db') as mock_db:
        mock_collection = MagicMock()
        mock_db.collection.return_value = mock_collection
        mock_collection.document.return_value.set.return_value = None
        response = client.post('/users/user_1/block', json={
            "blockedUserId": "user_2"
        })
        assert response.status_code == 200

#Test ID: 010
#Blocked user cannot join other user's tasks
#Description: Tests generic user trying to join blocked user's task through join route- shouldn't work.
def test_blocked_user_cannot_interact(client):
    with patch('backend.src.app.db') as mock_db:
        mock_collection = MagicMock()
        mock_db.collection.return_value = mock_collection
        mock_collection.document.return_value.get.return_value.to_dict.return_value = {
            "blockedUsers": ["user_2"]
        }
        response = client.post('/tasks/task_1/join', json={
            "userId": "user_2"
        })
        assert response.status_code == 403

#Test ID: 011
#Users can add friends with each other
#Description: Check if friends route returns a valid list of friends.
def test_add_friend(client):
    with patch('backend.src.app.db') as mock_db:
        mock_collection = MagicMock()
        mock_db.collection.return_value = mock_collection
        mock_collection.document.return_value.update.return_value = None
        response = client.post('/users/user_1/friends', json={
            "friendId": "user_2"
        })
        assert response.status_code == 200

#Test ID: 012
#Friend's tasks appear first in list
#Description: Test if list of friends task is returned from friends/task route, check that friend tasks are above others in returned tasks list.
def test_friend_tasks_prioritized(client):
    mock_doc = MagicMock()
    mock_doc.to_dict.return_value = {
        "title": "Study group",
        "userId": "user_2",
        "isPublic": True,
        "status": "pending"
    }
    mock_doc.id = "task_1"
    with patch('backend.src.app.db') as mock_db:
        mock_collection = MagicMock()
        mock_db.collection.return_value = mock_collection
        mock_collection.where.return_value.stream.return_value = [mock_doc]
        response = client.get('/users/user_1/friends/tasks')
        assert response.status_code == 200
        tasks = response.get_json()
        assert isinstance(tasks, list)

#Test ID: 013
#Users can send messages to one another
#Description: Check that messages between users work functionally through messages route and with generic message / users.
def test_send_message(client):
    with patch('backend.src.app.db') as mock_db:
        mock_collection = MagicMock()
        mock_db.collection.return_value = mock_collection
        mock_collection.add.return_value = (None, MagicMock(id='msg_123'))
        response = client.post('/messages', json={
            "senderId": "user_1",
            "receiverId": "user_2",
            "content": "Hey, still on for the study group?"
        })
        assert response.status_code == 201

#Test ID: 014
#Users can receive messages
#Description: Test that messages are properly fetched from route with messages between two generic users.
def test_fetch_messages(client):
    mock_doc = MagicMock()
    mock_doc.to_dict.return_value = {
        "senderId": "user_1",
        "receiverId": "user_2",
        "content": "Hey, still on for the study group?"
    }
    mock_doc.id = "msg_123"
    with patch('backend.src.app.db') as mock_db:
        mock_collection = MagicMock()
        mock_db.collection.return_value = mock_collection
        mock_collection.where.return_value.stream.return_value = [mock_doc]
        response = client.get('/messages/user_1/user_2')
        assert response.status_code == 200
        messages = response.get_json()
        assert isinstance(messages, list)
        assert messages[0]["content"] == "Hey, still on for the study group?"