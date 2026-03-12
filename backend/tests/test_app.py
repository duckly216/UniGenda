import pytest
from unittest.mock import MagicMock, patch
import sys

# Mock firebase before importing app
sys.modules['firebase_admin'] = MagicMock()
sys.modules['firebase_admin.credentials'] = MagicMock()
sys.modules['firebase_admin.firestore'] = MagicMock()

from backend.src.app import app

@pytest.fixture
def client():
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client

#Home route
def test_home(client):
    response = client.get('/')
    assert response.status_code == 200
    assert response.get_json() == {"message": "Unigenda backend is running"}

#Get tasks route
def test_get_tasks_empty(client):
    with patch('backend.src.app.tasks') as mock_tasks:
        mock_tasks.stream.return_value = []
        response = client.get('/tasks')
        assert response.status_code == 200
        assert response.get_json() == []

def test_get_tasks_returns_list(client):
    mock_doc = MagicMock()
    mock_doc.to_dict.return_value = {"task": "Test task"}
    with patch('backend.src.app.tasks') as mock_tasks:
        mock_tasks.stream.return_value = [mock_doc]
        response = client.get('/tasks')
        assert response.status_code == 200
        assert response.get_json() == [{"task": "Test task"}]

#Add task route
def test_add_task(client):
    with patch('backend.src.app.tasks') as mock_tasks:
        mock_tasks.add.return_value = None
        response = client.get('/testdb')
        assert response.status_code == 200
        mock_tasks.add.assert_called_once_with({"task": "Test task"})


#Invalid route
def test_invalid_route(client):
    response = client.get('/nonexistent')
    assert response.status_code == 404