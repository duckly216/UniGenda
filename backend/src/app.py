import json

from flask import Flask, jsonify, request
from flask_cors import CORS
from firebase_admin import firestore
from firebase_config import db

app = Flask(__name__)
CORS(app)
tasks = db.collection('tasks')

@app.route('/')
def home():
    return jsonify({"message": "Unigenda backend is running"})

@app.route('/testdb')
def test_db():
    tasks.add({"task": "Test task"})
    return {"message": "Task added"}

@app.route('/public_tasks')
def get_public_tasks():
    task_list = []
    for task in tasks.stream():
        task_list.append(task.to_dict())
    return jsonify(task_list)
## -- CRUD Operations -- ##
# CREATE
@app.route('/tasks', methods=['POST'])
def add_task():
    # Accept JSON payloads and gracefully fallback for form/raw bodies
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        if request.form:
            data = request.form.to_dict(flat=True)
        elif request.data:
            try:
                data = json.loads(request.data.decode('utf-8'))
            except Exception:
                data = None

    if not isinstance(data, dict):
        return jsonify({"error": "Invalid or missing request body. Send JSON with Content-Type: application/json."}), 400

    raw_tags = data.get('tags', [])
    if isinstance(raw_tags, str):
        tags = [tag.strip() for tag in raw_tags.split(',') if tag.strip()]
    elif isinstance(raw_tags, list):
        tags = [str(tag).strip() for tag in raw_tags if str(tag).strip()]
    else:
        tags = []

    visibility = data.get('visibility', 'private')
    is_public = bool(data.get('isPublic', visibility == 'public'))
    user_id = data.get("userId")

    if not user_id:
        return jsonify({"error": "userId is required"}), 400
    if not data.get('title'):
        return jsonify({"error": "title is required"}), 400

    new_task = {
        "title": data.get('title'),
        "description": data.get('description'),
        "dueDate": data.get("dueDate"),
        "userId": user_id, # The student's User ID from Auth
        "priority": data.get("priority", "medium"),
        "visibility": "public" if is_public else "private",
        "isPublic": is_public,
        "tags": tags,
        "status": "pending",
        "createdAt": firestore.SERVER_TIMESTAMP
    }

    # Use a single task id in both places:
    # 1) Global collection (existing behavior)
    # 2) User-scoped subcollection (users/{uid}/tasks)
    task_ref = db.collection('tasks').document()
    task_id = task_ref.id
    task_ref.set(new_task)

    user_ref = db.collection('users').document(user_id)
    user_ref.set({"updatedAt": firestore.SERVER_TIMESTAMP}, merge=True)
    user_ref.collection('tasks').document(task_id).set(new_task)

    return jsonify({"id": task_id, "message": "Task created"}), 201
# READ
@app.route('/tasks/<uid>', methods=['GET'])
def get_user_tasks(uid):
    # Default limit of fetching amount is 20
    limit = request.args.get('limit', default=20, type=int)
    
    try: 
        # Prefer user-scoped tasks collection
        scoped_tasks = db.collection('users') \
            .document(uid) \
            .collection('tasks') \
            .order_by('dueDate', direction=firestore.Query.ASCENDING) \
            .limit(limit) \
            .stream()
        task_list = [task.to_dict() | {"id": task.id} for task in scoped_tasks]

        # Fallback for older tasks that were only stored globally
        if not task_list:
            user_tasks = db.collection('tasks') \
                .where('userId', '==', uid)     \
                .order_by('dueDate', direction=firestore.Query.ASCENDING)            \
                .limit(limit)                   \
                .stream()
            task_list = [task.to_dict() | {"id": task.id} for task in user_tasks]

        return jsonify(task_list), 200
    except Exception as e:
        # if index has not been created, Firestore returns error
        return jsonify({"error": str(e)}), 400
# UPDATE
@app.route('/tasks/<task_id>', methods=['PATCH'])
def update_task(task_id):
    data = request.json
    task_ref = db.collection('tasks').document(task_id)
    task_ref.update({"status": data.get("status")}) # e.g., "status: completed"
    return jsonify({"message": "Task updated"}), 200
# DELETE
@app.route('/tasks/<task_id>', methods=['DELETE'])
def delete_task(task_id):
    db.collection('tasks').document(task_id).delete()
    return jsonify({"message": "Task deleted"}), 200
## -- --------------- -- ##

if __name__ == '__main__':
    app.run(debug=True)