import json
from functools import wraps

from flask import Flask, g, jsonify, request
from flask_cors import CORS
from firebase_admin import auth as firebase_auth
from firebase_admin import firestore
from firebase_config import db

app = Flask(__name__)
CORS(app)
public_tasks = db.collection('public_tasks')


def parse_payload():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        if request.form:
            data = request.form.to_dict(flat=True)
        elif request.data:
            try:
                data = json.loads(request.data.decode('utf-8'))
            except Exception:
                data = None
    return data


def normalize_tags(raw_tags):
    if isinstance(raw_tags, str):
        return [tag.strip() for tag in raw_tags.split(',') if tag.strip()]
    if isinstance(raw_tags, list):
        return [str(tag).strip() for tag in raw_tags if str(tag).strip()]
    return []


def sync_public_task(task_id, task_data):
    if task_data.get('isPublic'):
        public_tasks.document(task_id).set(task_data)
    else:
        public_tasks.document(task_id).delete()


def get_user_task_ref(user_id, task_id):
    return db.collection('users').document(user_id).collection('tasks').document(task_id)


def get_authenticated_uid():
    current_user = getattr(g, "current_user", None)
    if isinstance(current_user, dict):
        return current_user.get("uid")
    return None


def require_auth(view_func):
    @wraps(view_func)
    def wrapped(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return jsonify({"error": "Missing or invalid authorization token"}), 401

        id_token = auth_header.split("Bearer ", 1)[1].strip()

        try:
            g.current_user = firebase_auth.verify_id_token(id_token)
        except Exception:
            return jsonify({"error": "Unauthorized"}), 401

        return view_func(*args, **kwargs)

    return wrapped

def get_owned_task_ref(task_id):
    task_ref = db.collection('tasks').document(task_id)
    task_snapshot = task_ref.get()

    if not getattr(task_snapshot, "exists", False):
        return None, (jsonify({"error": "Task not found"}), 404)

    task_data = task_snapshot.to_dict() or {}
    authenticated_uid = get_authenticated_uid()
    if authenticated_uid and task_data.get("userId") != authenticated_uid:
        return None, (jsonify({"error": "Forbidden"}), 403)

    return task_ref, None

@app.route('/')
def home():
    return jsonify({"message": "Unigenda backend is running"})

@app.route('/testdb')
def test_db():
    db.collection('users').document('test-user').collection('tasks').add({"task": "Test task"})
    return {"message": "Task added"}



## -- CRUD Operations for Profiles -- ##
@app.route('/users/<uid>', methods=['GET'])
def get_user_profile(uid):
    try:
        user_doc = db.collection('users').document(uid).get()
        if not user_doc.exists:
            return jsonify({"error": "Profile not found"}), 404

        profile = user_doc.to_dict() or {}
        return jsonify(profile), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route('/users/<uid>', methods=['PATCH'])
def update_user_profile(uid):
    data = parse_payload()

    if not isinstance(data, dict):
        return jsonify({"error": "Invalid or missing request body."}), 400

    allowed_fields = {"firstName", "lastName", "displayName", "email", "phone", "school"}
    updates = {
        key: (value.strip() if isinstance(value, str) else value)
        for key, value in data.items()
        if key in allowed_fields
    }

    if not updates:
        return jsonify({"error": "No valid profile fields to update."}), 400

    updates["updatedAt"] = firestore.SERVER_TIMESTAMP

    try:
        user_ref = db.collection('users').document(uid)
        user_ref.set(updates, merge=True)
        return jsonify({"message": "Profile updated"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route('/reports', methods=['POST'])
def create_report():
    data = parse_payload()

    if not isinstance(data, dict):
        return jsonify({"error": "Invalid or missing request body."}), 400

    user_id = data.get("userId")
    accused_id = data.get("accusedId")
    description = (data.get("description") or "").strip()

    if not user_id:
        return jsonify({"error": "userId is required"}), 400
    if not accused_id:
        return jsonify({"error": "accusedId is required"}), 400
    if not description:
        return jsonify({"error": "description is required"}), 400

    report_data = {
        "userId": user_id,
        "accusedId": accused_id,
        "description": description,
        "createdAt": firestore.SERVER_TIMESTAMP,
    }

    report_ref = db.collection("reports").document()
    report_ref.set(report_data)

    return jsonify({"id": report_ref.id, "message": "Report submitted"}), 201
## -- CRUD Operations for Tasks -- ##
# CREATE
@app.route('/users/<uid>/tasks', methods=['POST'])
def add_task(uid):
    data = parse_payload()

    if not isinstance(data, dict):
        return jsonify({"error": "Invalid or missing request body. Send JSON with Content-Type: application/json."}), 400

    tags = normalize_tags(data.get('tags', []))

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

    # Store task only in user-scoped subcollection
    user_ref = db.collection('users').document(user_id)
    user_ref.set({"updatedAt": firestore.SERVER_TIMESTAMP}, merge=True)

    task_ref = user_ref.collection('tasks').document()
    task_id = task_ref.id
    task_ref.set(new_task)

    sync_public_task(task_id, new_task)

    return jsonify({"id": task_id, "message": "Task created"}), 201

# Might have to 

# READ
@app.route('/users/<uid>/tasks', methods=['GET'])
def get_user_tasks(uid):
    # Default limit of fetching amount is 20
    limit = request.args.get('limit', default=20, type=int)
    authenticated_uid = get_authenticated_uid()

    if authenticated_uid and uid != authenticated_uid:
        return jsonify({"error": "Forbidden"}), 403

    try:
        # User-scoped tasks collection
        scoped_tasks = db.collection('users') \
            .document(uid) \
            .collection('tasks') \
            .order_by('dueDate', direction=firestore.Query.ASCENDING) \
            .limit(limit) \
            .stream()
        task_list = [task.to_dict() | {"id": task.id} for task in scoped_tasks]

        return jsonify(task_list), 200
    except Exception as e:
        # if index has not been created, Firestore returns error
        return jsonify({"error": str(e)}), 400
# UPDATE
@app.route('/users/<uid>/tasks/<task_id>', methods=['PATCH'])
def update_task(uid, task_id):
    data = parse_payload()
    if not isinstance(data, dict):
        return jsonify({"error": "Invalid or missing request body."}), 400

    user_id = data.get("userId")
    if not user_id:
        return jsonify({"error": "userId is required"}), 400

    task_ref = get_user_task_ref(user_id, task_id)
    task_snapshot = task_ref.get()
    if not task_snapshot.exists:
        return jsonify({"error": "Task not found"}), 404

    current_task = task_snapshot.to_dict()

    updates = {}
    if "title" in data:
        updates["title"] = data.get("title")
    if "description" in data:
        updates["description"] = data.get("description")
    if "dueDate" in data:
        updates["dueDate"] = data.get("dueDate")
    if "status" in data:
        updates["status"] = data.get("status")
    if "priority" in data:
        updates["priority"] = data.get("priority")
    if "tags" in data:
        updates["tags"] = normalize_tags(data.get("tags"))
    if "visibility" in data or "isPublic" in data:
        next_public = bool(data.get("isPublic", data.get("visibility") == "public"))
        updates["isPublic"] = next_public
        updates["visibility"] = "public" if next_public else "private"

    if not updates:
        return jsonify({"error": "No valid fields to update"}), 400

    task_ref.set(updates, merge=True)

    updated_task = current_task | updates
    sync_public_task(task_id, updated_task)

    return jsonify({"message": "Task updated"}), 200
# DELETE
@app.route('/users/<uid>/tasks', methods=['DELETE'])
def delete_task(task_id):
    user_id = request.args.get("userId")
    if not user_id:
        return jsonify({"error": "userId is required"}), 400

    task_snapshot = get_user_task_ref(user_id, task_id).get()
    if task_snapshot.exists:
        get_user_task_ref(user_id, task_id).delete()
    public_tasks.document(task_id).delete()

    return jsonify({"message": "Task deleted"}), 200
## -- Public Tasks -- ##
@app.route('/public_tasks', methods=['POST'])
def add_public_task():
    data = parse_payload()

    if not isinstance(data, dict):
        return jsonify({"error": "Invalid or missing request body. Send JSON with Content-Type: application/json."}), 400

    data['visibility'] = 'public'
    data['isPublic'] = True

    tags = normalize_tags(data.get('tags', []))
    user_id = data.get("userId")

    if not user_id:
        return jsonify({"error": "userId is required"}), 400
    if not data.get('title'):
        return jsonify({"error": "title is required"}), 400

    new_task = {
        "title": data.get('title'),
        "description": data.get('description'),
        "dueDate": data.get("dueDate"),
        "userId": user_id,
        "priority": data.get("priority", "medium"),
        "visibility": "public",
        "isPublic": True,
        "tags": tags,
        "status": "pending",
        "createdAt": firestore.SERVER_TIMESTAMP
    }

    user_ref = db.collection('users').document(user_id)
    user_ref.set({"updatedAt": firestore.SERVER_TIMESTAMP}, merge=True)

    task_ref = user_ref.collection('tasks').document()
    task_id = task_ref.id
    task_ref.set(new_task)

    public_tasks.document(task_id).set(new_task)

    return jsonify({"id": task_id, "message": "Public task created"}), 201
@app.route('/public_tasks/<task_id>', methods=['PATCH'])
def update_public_task(task_id):
    data = parse_payload()
    if not isinstance(data, dict):
        return jsonify({"error": "Invalid or missing request body."}), 400

    user_id = data.get("userId")
    if not user_id:
        public_snapshot = public_tasks.document(task_id).get()
        if public_snapshot.exists:
            user_id = public_snapshot.to_dict().get("userId")
    if not user_id:
        return jsonify({"error": "userId is required"}), 400

    task_ref = get_user_task_ref(user_id, task_id)
    task_snapshot = task_ref.get()
    if not task_snapshot.exists:
        return jsonify({"error": "Task not found"}), 404

    current_task = task_snapshot.to_dict()

    updates = {
        "visibility": "public",
        "isPublic": True
    }
    if "title" in data:
        updates["title"] = data.get("title")
    if "description" in data:
        updates["description"] = data.get("description")
    if "dueDate" in data:
        updates["dueDate"] = data.get("dueDate")
    if "status" in data:
        updates["status"] = data.get("status")
    if "priority" in data:
        updates["priority"] = data.get("priority")
    if "tags" in data:
        updates["tags"] = normalize_tags(data.get("tags"))

    task_ref.set(updates, merge=True)

    updated_task = current_task | updates
    public_tasks.document(task_id).set(updated_task)
    return jsonify({"message": "Public task updated"}), 200

@app.route('/public_tasks')
def get_public_tasks():
    task_list = []
    for task in public_tasks.stream():
        task_list.append(task.to_dict() | {"id": task.id})
    return jsonify(task_list)

@app.route('/public_tasks/<task_id>', methods=['DELETE'])
def delete_public_task(task_id):
    user_id = request.args.get("userId")
    if not user_id:
        public_snapshot = public_tasks.document(task_id).get()
        if public_snapshot.exists:
            user_id = public_snapshot.to_dict().get("userId")
    if not user_id:
        return jsonify({"error": "userId is required"}), 400

    task_snapshot = get_user_task_ref(user_id, task_id).get()
    if task_snapshot.exists:
        get_user_task_ref(user_id, task_id).delete()
    public_tasks.document(task_id).delete()

    return jsonify({"message": "Task deleted"}), 200
## -- --------------- -- ##

if __name__ == '__main__':
    app.run(debug=True)