import json

from flask import Flask, jsonify, request
from flask_cors import CORS
from firebase_admin import firestore
from firebase_config import db

app = Flask(__name__)
CORS(app)
<<<<<<< HEAD
tasks = db.collection('tasks')
public_tasks = db.collection('public_tasks')

=======
<<<<<<< HEAD
tasks = db.collection('public_tasks')
>>>>>>> 6a5ffc4 (Made it so adding a due date is not necessary anymore & expanded selection of making post public)

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


def normalize_due_date(raw_due_date):
    if raw_due_date is None:
        return None
    if isinstance(raw_due_date, str):
        due_date = raw_due_date.strip()
        return due_date or None
    return raw_due_date


<<<<<<< HEAD
=======
def get_user_task_ref(user_id, task_id):
    return db.collection('users').document(user_id).collection('tasks').document(task_id)
=======
tasks = db.collection('tasks')
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


def normalize_due_date(raw_due_date):
    if raw_due_date is None:
        return None
    if isinstance(raw_due_date, str):
        due_date = raw_due_date.strip()
        return due_date or None
    return raw_due_date


>>>>>>> 6a5ffc4 (Made it so adding a due date is not necessary anymore & expanded selection of making post public)
def normalize_people_needed(raw_people_needed):
    if raw_people_needed is None:
        return None, None

    if isinstance(raw_people_needed, str):
        raw_people_needed = raw_people_needed.strip()
        if not raw_people_needed:
            return None, None

    try:
        people_needed = int(raw_people_needed)
    except (TypeError, ValueError):
        return None, "peopleNeeded must be an integer between 1 and 10"

    if people_needed < 1 or people_needed > 10:
        return None, "peopleNeeded must be between 1 and 10"

    return people_needed, None

<<<<<<< HEAD
=======
>>>>>>> 9e2797a (Made it so adding a due date is not necessary anymore & expanded selection of making post public)
>>>>>>> 6a5ffc4 (Made it so adding a due date is not necessary anymore & expanded selection of making post public)

def sync_public_task(task_id, task_data):
    if task_data.get('isPublic'):
        public_tasks.document(task_id).set(task_data)
    else:
        public_tasks.document(task_id).delete()
<<<<<<< HEAD
=======


def get_user_task_ref(user_id, task_id):
    return db.collection('users').document(user_id).collection('tasks').document(task_id)


def get_user_public_profile(uid):
    if not uid:
        return None

    user_doc = db.collection('users').document(uid).get()
    if not getattr(user_doc, "exists", False):
        return None

    user_data = user_doc.to_dict() or {}
    return {
        "uid": uid,
        "displayName": user_data.get("displayName"),
        "email": user_data.get("email"),
        "phone": user_data.get("phone"),
        "school": user_data.get("school"),
    }


def delete_user_documents(uid):
    if not uid:
        return

    user_ref = db.collection('users').document(uid)
    tasks_stream = user_ref.collection('tasks').stream()
    for task_doc in tasks_stream:
        task_ref = user_ref.collection('tasks').document(task_doc.id)
        task_ref.delete()
        public_tasks.document(task_doc.id).delete()

    user_ref.delete()


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
>>>>>>> dce7abc (Made it so adding a due date is not necessary anymore & expanded selection of making post public)
>>>>>>> 9e2797a (Made it so adding a due date is not necessary anymore & expanded selection of making post public)


def get_user_task_ref(user_id, task_id):
    return db.collection('users').document(user_id).collection('tasks').document(task_id)


def get_user_public_profile(uid):
    if not uid:
        return None

    user_doc = db.collection('users').document(uid).get()
    if not getattr(user_doc, "exists", False):
        return None

    user_data = user_doc.to_dict() or {}
    return {
        "uid": uid,
        "displayName": user_data.get("displayName"),
        "email": user_data.get("email"),
        "phone": user_data.get("phone"),
        "school": user_data.get("school"),
    }


def delete_user_documents(uid):
    if not uid:
        return

    user_ref = db.collection('users').document(uid)
    tasks_stream = user_ref.collection('tasks').stream()
    for task_doc in tasks_stream:
        task_ref = user_ref.collection('tasks').document(task_doc.id)
        task_ref.delete()
        public_tasks.document(task_doc.id).delete()

    user_ref.delete()


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

@app.route('/tasks')
def get_tasks():
    task_list = []
    for task in tasks.stream():
        task_list.append(task.to_dict())
    return jsonify(task_list)
## -- CRUD Operations -- ##
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

    due_date = normalize_due_date(data.get("dueDate"))
    people_needed, people_needed_error = normalize_people_needed(data.get("peopleNeeded"))
    if people_needed_error:
        return jsonify({"error": people_needed_error}), 400

    new_task = {
        "title": data.get('title'),
        "description": data.get('description'),
        "dueDate": due_date,
        "userId": user_id,
        "priority": data.get("priority", "medium"),
        "visibility": "public" if is_public else "private",
        "isPublic": is_public,
        "peopleNeeded": people_needed if is_public else None,
        "tags": tags,
        "status": "pending",
        "createdAt": firestore.SERVER_TIMESTAMP
    }

    user_ref = db.collection('users').document(user_id)
    user_ref.set({"updatedAt": firestore.SERVER_TIMESTAMP}, merge=True)

    task_ref = user_ref.collection('tasks').document()
    task_id = task_ref.id
    task_ref.set(new_task)

    if is_public:
        public_tasks.document(task_id).set(new_task)

    return jsonify({"id": task_id, "message": "Task created"}), 201
# READ
@app.route('/users/<uid>/tasks', methods=['GET'])
def get_user_tasks(uid):
    limit = request.args.get('limit', default=20, type=int)
    
    try: 
        scoped_tasks = db.collection('users') \
            .document(uid) \
            .collection('tasks') \
            .order_by('dueDate', direction=firestore.Query.ASCENDING) \
            .limit(limit) \
            .stream()
        task_list = [task.to_dict() | {"id": task.id} for task in scoped_tasks]

        return jsonify(task_list), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400
    
@app.route('/public_tasks/<task_id>/comments', methods=['GET'])
def get_task_comments(task_id):
    try:
        task_comments = db.collection('public_tasks') \
            .document(task_id) \
            .collection('comments') \
            .stream()
        comment_list = [comment.to_dict() | {"id": comment.id} for comment in task_comments]
        return jsonify(comment_list), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400
    
@app.route('/public_tasks/<task_id>/comments', methods=['POST'])
def add_comment(task_id):
    data = request.json

    comment = {
        "text": data.get("text"),
        "user_id": data.get("user_id"),
        "username": data.get("username"),
        "timestamp": firestore.SERVER_TIMESTAMP
    }

    db.collection('public_tasks').document(task_id).collection('comments').add(comment)

    return jsonify({"message": "Comment added"}), 201
    
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
        updates["dueDate"] = normalize_due_date(data.get("dueDate"))
    if "status" in data:
        updates["status"] = data.get("status")
    if "priority" in data:
        updates["priority"] = data.get("priority")
    if "tags" in data:
        updates["tags"] = normalize_tags(data.get("tags"))
    if "peopleNeeded" in data:
        people_needed, people_needed_error = normalize_people_needed(data.get("peopleNeeded"))
        if people_needed_error:
            return jsonify({"error": people_needed_error}), 400
        updates["peopleNeeded"] = people_needed
    if "visibility" in data or "isPublic" in data:
        next_public = bool(data.get("isPublic", data.get("visibility") == "public"))
        updates["isPublic"] = next_public
        updates["visibility"] = "public" if next_public else "private"
        if not next_public:
            updates["peopleNeeded"] = None

    if not updates:
        return jsonify({"error": "No valid fields to update"}), 400

    task_ref.set(updates, merge=True)

    updated_task = current_task | updates
    sync_public_task(task_id, updated_task)

    return jsonify({"message": "Task updated"}), 200

# DELETE
@app.route('/users/<uid>/tasks/<task_id>', methods=['DELETE'])
def delete_task(uid, task_id):
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

    due_date = normalize_due_date(data.get("dueDate"))
    people_needed, people_needed_error = normalize_people_needed(data.get("peopleNeeded"))
    if people_needed_error:
        return jsonify({"error": people_needed_error}), 400

    new_task = {
        "title": data.get('title'),
        "description": data.get('description'),
        "dueDate": due_date,
        "userId": user_id,
        "priority": data.get("priority", "medium"),
        "visibility": "public",
        "isPublic": True,
        "peopleNeeded": people_needed,
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
        updates["dueDate"] = normalize_due_date(data.get("dueDate"))
    if "status" in data:
        updates["status"] = data.get("status")
    if "priority" in data:
        updates["priority"] = data.get("priority")
    if "tags" in data:
        updates["tags"] = normalize_tags(data.get("tags"))
    if "peopleNeeded" in data:
        people_needed, people_needed_error = normalize_people_needed(data.get("peopleNeeded"))
        if people_needed_error:
            return jsonify({"error": people_needed_error}), 400
        updates["peopleNeeded"] = people_needed

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

# --- CHAT MESSAGES ---

@app.route('/chats/<chat_id>/messages', methods=['GET'])
def get_chat_messages(chat_id):
    try:
        messages = db.collection('chats') \
            .document(chat_id) \
            .collection('messages') \
            .stream()

        message_list = [m.to_dict() | {"id": m.id} for m in messages]
        return jsonify(message_list), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route('/chats/<chat_id>/messages', methods=['POST'])
def send_message(chat_id):
    data = request.json

    message = {
        "text": data.get("text"),
        "user_id": data.get("user_id"),
        "username": data.get("username"),
        "timestamp": firestore.SERVER_TIMESTAMP
    }

    db.collection('chats') \
        .document(chat_id) \
        .collection('messages') \
        .add(message)

    return jsonify({"message": "Message sent"}), 201


# Find or create chat route
@app.route('/chats/find_or_create', methods=['POST'])
def find_or_create_chat():
    data = request.json
    members = sorted(data.get('members', []))

    try:
        chats_ref = db.collection('chats')
        docs = chats_ref.stream()

        # Check if chat already exists
        for doc in docs:
            chat = doc.to_dict()
            if sorted(chat.get('members', [])) == members:
                return jsonify({'chat_id': doc.id}), 200

        # Create new chat
        new_chat = {
            'members': members,
            'isGroup': False,
            'timestamp': firestore.SERVER_TIMESTAMP
        }

        doc_ref = db.collection('chats').add(new_chat)

        return jsonify({'chat_id': doc_ref[1].id}), 201

    except Exception as e:
        return jsonify({'error': str(e)}), 400

if __name__ == '__main__':
    app.run(debug=True)