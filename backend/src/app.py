import json
from datetime import datetime, timezone
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


def normalize_due_date(raw_due_date):
    if raw_due_date is None:
        return None
    if isinstance(raw_due_date, str):
        due_date = raw_due_date.strip()
        return due_date or None
    return raw_due_date


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


def build_joined_user(uid):
    profile = get_user_public_profile(uid) or {}
    return {
        "uid": uid,
        "displayName": profile.get("displayName"),
        "email": profile.get("email"),
        "school": profile.get("school"),
        "joinedAt": datetime.now(timezone.utc).isoformat(),
    }


def sync_public_task(task_id, task_data):
    if task_data.get('isPublic'):
        public_tasks.document(task_id).set(task_data)
    else:
        public_tasks.document(task_id).delete()


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

    allowed_fields = {"firstName", "lastName", "displayName", "email", "phone", "school", "age"}
    updates = {
        key: (
            int(value)
            if key == "age" and isinstance(value, str) and value.strip().isdigit()
            else value.strip()
            if isinstance(value, str)
            else value
        )
        for key, value in data.items()
        if key in allowed_fields
    }

    if not updates:
        return jsonify({"error": "No valid profile fields to update."}), 400

    try:
        user_ref = db.collection('users').document(uid)
        user_doc = user_ref.get()

        if not getattr(user_doc, "exists", False):
            updates["createdAt"] = firestore.SERVER_TIMESTAMP

        updates["updatedAt"] = firestore.SERVER_TIMESTAMP
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
        "status": "active",
        "createdAt": firestore.SERVER_TIMESTAMP,
    }

    report_ref = db.collection("reports").document()
    report_ref.set(report_data)

    return jsonify({"id": report_ref.id, "message": "Report submitted"}), 201


@app.route('/reports/active', methods=['GET'])
def get_active_reports():
    try:
        report_docs = db.collection("reports").stream()
        active_reports = []

        for report_doc in report_docs:
            report_data = report_doc.to_dict() or {}
            status = report_data.get("status", "active")

            if status != "active":
                continue

            reporter_id = report_data.get("userId")
            accused_id = report_data.get("accusedId")

            active_reports.append({
                "id": report_doc.id,
                "userId": reporter_id,
                "accusedId": accused_id,
                "description": report_data.get("description", ""),
                "status": status,
                "createdAt": report_data.get("createdAt"),
                "reporter": get_user_public_profile(reporter_id),
                "accused": get_user_public_profile(accused_id),
            })

        return jsonify(active_reports), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route('/reports/<report_id>/close', methods=['PATCH'])
def close_report(report_id):
    try:
        report_ref = db.collection("reports").document(report_id)
        report_doc = report_ref.get()

        if not getattr(report_doc, "exists", False):
            return jsonify({"error": "Report not found"}), 404

        report_ref.set({
            "status": "closed",
            "closedAt": firestore.SERVER_TIMESTAMP,
        }, merge=True)

        return jsonify({"message": "Report closed"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route('/reports/<report_id>/ban', methods=['POST'])
def ban_reported_user(report_id):
    try:
        report_ref = db.collection("reports").document(report_id)
        report_doc = report_ref.get()

        if not getattr(report_doc, "exists", False):
            return jsonify({"error": "Report not found"}), 404

        report_data = report_doc.to_dict() or {}
        accused_id = report_data.get("accusedId")

        if not accused_id:
            return jsonify({"error": "accusedId is missing on report"}), 400

        delete_user_documents(accused_id)

        report_ref.set({
            "status": "banned",
            "closedAt": firestore.SERVER_TIMESTAMP,
            "bannedUserId": accused_id,
        }, merge=True)

        return jsonify({"message": "User banned and removed from Firestore"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400
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

    due_date = normalize_due_date(data.get("dueDate"))
    people_needed, people_needed_error = normalize_people_needed(data.get("peopleNeeded"))
    if people_needed_error:
        return jsonify({"error": people_needed_error}), 400

    new_task = {
        "title": data.get('title'),
        "description": data.get('description'),
        "dueDate": due_date,
        "userId": user_id, # The student's User ID from Auth
        "priority": data.get("priority", "medium"),
        "visibility": "public" if is_public else "private",
        "isPublic": is_public,
        "peopleNeeded": people_needed if is_public else None,
        "joinedUsers": [],
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
    if not uid:
        return jsonify({"error": "userId is required"}), 400

    task_snapshot = get_user_task_ref(uid, task_id).get()
    if task_snapshot.exists:
        get_user_task_ref(uid, task_id).delete()
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
        "joinedUsers": [],
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


@app.route('/public_tasks/<task_id>/join', methods=['POST'])
def join_public_task(task_id):
    data = parse_payload()
    if not isinstance(data, dict):
        return jsonify({"error": "Invalid or missing request body."}), 400

    user_id = data.get("userId")
    if not user_id:
        return jsonify({"error": "userId is required"}), 400

    public_task_ref = public_tasks.document(task_id)
    public_snapshot = public_task_ref.get()
    if not getattr(public_snapshot, "exists", False):
        return jsonify({"error": "Public task not found"}), 404

    public_task = public_snapshot.to_dict() or {}
    owner_id = public_task.get("userId")

    if not public_task.get("isPublic", False):
        return jsonify({"error": "Task is not public"}), 400
    if not owner_id:
        return jsonify({"error": "Task owner is missing"}), 400
    if owner_id == user_id:
        return jsonify({"error": "You cannot join your own public task"}), 400

    joined_users = public_task.get("joinedUsers")
    if not isinstance(joined_users, list):
        joined_users = []

    if any((isinstance(joined, dict) and joined.get("uid") == user_id) for joined in joined_users):
        return jsonify({"error": "You have already joined this public task"}), 409

    people_needed = public_task.get("peopleNeeded")
    if isinstance(people_needed, int) and people_needed > 0 and len(joined_users) >= people_needed:
        return jsonify({"error": "This task is already full"}), 409

    updated_joined_users = [*joined_users, build_joined_user(user_id)]
    updates = {"joinedUsers": updated_joined_users}

    public_task_ref.set(updates, merge=True)

    owner_task_ref = get_user_task_ref(owner_id, task_id)
    owner_task_snapshot = owner_task_ref.get()
    if getattr(owner_task_snapshot, "exists", False):
        owner_task_ref.set(updates, merge=True)

    updated_task = public_task | updates
    return jsonify({"message": "Joined task", "task": updated_task}), 200


@app.route('/public_tasks/<task_id>/leave', methods=['POST'])
def leave_public_task(task_id):
    data = parse_payload()
    if not isinstance(data, dict):
        return jsonify({"error": "Invalid or missing request body."}), 400

    user_id = data.get("userId")
    if not user_id:
        return jsonify({"error": "userId is required"}), 400

    public_task_ref = public_tasks.document(task_id)
    public_snapshot = public_task_ref.get()
    if not getattr(public_snapshot, "exists", False):
        return jsonify({"error": "Public task not found"}), 404

    public_task = public_snapshot.to_dict() or {}
    owner_id = public_task.get("userId")

    if owner_id == user_id:
        return jsonify({"error": "Task owner cannot leave their own public task"}), 400

    joined_users = public_task.get("joinedUsers")
    if not isinstance(joined_users, list):
        joined_users = []

    if not any((isinstance(joined, dict) and joined.get("uid") == user_id) for joined in joined_users):
        return jsonify({"error": "You have not joined this public task"}), 409

    updated_joined_users = [
        joined
        for joined in joined_users
        if not (isinstance(joined, dict) and joined.get("uid") == user_id)
    ]
    updates = {"joinedUsers": updated_joined_users}

    public_task_ref.set(updates, merge=True)

    owner_task_ref = get_user_task_ref(owner_id, task_id)
    owner_task_snapshot = owner_task_ref.get()
    if getattr(owner_task_snapshot, "exists", False):
        owner_task_ref.set(updates, merge=True)

    updated_task = public_task | updates
    return jsonify({"message": "Left task", "task": updated_task}), 200

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

## -- Friends -- ##

@app.route('/users/search', methods=['GET'])
def search_users():
    q = request.args.get('q', '').strip()
    if not q:
        return jsonify([]), 200

    try:
        results = []
        query = (
            db.collection('users')
            .where('displayName', '>=', q)
            .where('displayName', '<=', q + '\uf8ff')
            .limit(10)
            .stream()
        )
        for doc in query:
            data = doc.to_dict() or {}
            results.append({
                "uid": doc.id,
                "displayName": data.get("displayName"),
                "school": data.get("school"),
            })
        return jsonify(results), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route('/friend_requests', methods=['POST'])
@require_auth
def send_friend_request():
    from_uid = get_authenticated_uid()
    data = parse_payload()

    if not isinstance(data, dict):
        return jsonify({"error": "Invalid or missing request body."}), 400

    to_uid = (data.get("toUid") or "").strip()
    if not to_uid:
        return jsonify({"error": "toUid is required"}), 400
    if to_uid == from_uid:
        return jsonify({"error": "Cannot send a friend request to yourself"}), 400

    existing_friend = db.collection('users').document(from_uid).collection('friends').document(to_uid).get()
    if getattr(existing_friend, "exists", False):
        return jsonify({"error": "Already friends"}), 409

    for _ in (
        db.collection('friend_requests')
        .where('fromUid', '==', from_uid)
        .where('toUid', '==', to_uid)
        .where('status', '==', 'pending')
        .limit(1)
        .stream()
    ):
        return jsonify({"error": "Friend request already sent"}), 409

    for _ in (
        db.collection('friend_requests')
        .where('fromUid', '==', to_uid)
        .where('toUid', '==', from_uid)
        .where('status', '==', 'pending')
        .limit(1)
        .stream()
    ):
        return jsonify({"error": "This user has already sent you a friend request"}), 409

    request_ref = db.collection('friend_requests').document()
    request_ref.set({
        "fromUid": from_uid,
        "toUid": to_uid,
        "status": "pending",
        "sentAt": firestore.SERVER_TIMESTAMP,
    })
    return jsonify({"id": request_ref.id, "message": "Friend request sent"}), 201


@app.route('/friend_requests', methods=['GET'])
@require_auth
def get_friend_requests():
    uid = get_authenticated_uid()

    try:
        incoming = []
        for doc in (
            db.collection('friend_requests')
            .where('toUid', '==', uid)
            .where('status', '==', 'pending')
            .stream()
        ):
            d = doc.to_dict() or {}
            incoming.append({
                "id": doc.id,
                "fromUid": d.get("fromUid"),
                "toUid": d.get("toUid"),
                "status": d.get("status"),
                "fromProfile": get_user_public_profile(d.get("fromUid")),
            })

        outgoing = []
        for doc in (
            db.collection('friend_requests')
            .where('fromUid', '==', uid)
            .where('status', '==', 'pending')
            .stream()
        ):
            d = doc.to_dict() or {}
            outgoing.append({
                "id": doc.id,
                "fromUid": d.get("fromUid"),
                "toUid": d.get("toUid"),
                "status": d.get("status"),
                "toProfile": get_user_public_profile(d.get("toUid")),
            })

        return jsonify({"incoming": incoming, "outgoing": outgoing}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route('/friend_requests/<request_id>', methods=['PATCH'])
@require_auth
def respond_to_friend_request(request_id):
    uid = get_authenticated_uid()
    data = parse_payload()

    if not isinstance(data, dict):
        return jsonify({"error": "Invalid or missing request body."}), 400

    action = (data.get("action") or "").strip()
    if action not in ("accept", "reject"):
        return jsonify({"error": "action must be 'accept' or 'reject'"}), 400

    request_ref = db.collection('friend_requests').document(request_id)
    request_doc = request_ref.get()

    if not getattr(request_doc, "exists", False):
        return jsonify({"error": "Friend request not found"}), 404

    request_data = request_doc.to_dict() or {}

    if request_data.get("toUid") != uid:
        return jsonify({"error": "Forbidden"}), 403
    if request_data.get("status") != "pending":
        return jsonify({"error": "Request is no longer pending"}), 409

    if action == "reject":
        request_ref.set({"status": "rejected"}, merge=True)
        return jsonify({"message": "Friend request rejected"}), 200

    from_uid = request_data.get("fromUid")
    from_profile = get_user_public_profile(from_uid) or {}
    to_profile = get_user_public_profile(uid) or {}

    db.collection('users').document(from_uid).collection('friends').document(uid).set({
        "displayName": to_profile.get("displayName"),
        "school": to_profile.get("school"),
        "addedAt": firestore.SERVER_TIMESTAMP,
    })
    db.collection('users').document(uid).collection('friends').document(from_uid).set({
        "displayName": from_profile.get("displayName"),
        "school": from_profile.get("school"),
        "addedAt": firestore.SERVER_TIMESTAMP,
    })

    request_ref.set({"status": "accepted"}, merge=True)
    return jsonify({"message": "Friend request accepted"}), 200


@app.route('/friend_requests/<request_id>', methods=['DELETE'])
@require_auth
def cancel_friend_request(request_id):
    uid = get_authenticated_uid()

    request_ref = db.collection('friend_requests').document(request_id)
    request_doc = request_ref.get()

    if not getattr(request_doc, "exists", False):
        return jsonify({"error": "Friend request not found"}), 404

    request_data = request_doc.to_dict() or {}

    if request_data.get("fromUid") != uid:
        return jsonify({"error": "Forbidden"}), 403
    if request_data.get("status") != "pending":
        return jsonify({"error": "Can only cancel pending requests"}), 409

    request_ref.delete()
    return jsonify({"message": "Friend request cancelled"}), 200


@app.route('/users/<uid>/friends', methods=['GET'])
def get_friends(uid):
    try:
        friends = []
        for doc in db.collection('users').document(uid).collection('friends').stream():
            d = doc.to_dict() or {}
            friends.append({
                "uid": doc.id,
                "displayName": d.get("displayName"),
                "school": d.get("school"),
            })
        return jsonify(friends), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route('/users/<uid>/friends/<friend_uid>', methods=['DELETE'])
@require_auth
def remove_friend(uid, friend_uid):
    authenticated_uid = get_authenticated_uid()

    if authenticated_uid != uid:
        return jsonify({"error": "Forbidden"}), 403

    db.collection('users').document(uid).collection('friends').document(friend_uid).delete()
    db.collection('users').document(friend_uid).collection('friends').document(uid).delete()

    return jsonify({"message": "Friend removed"}), 200

## -- --------------- -- ##

if __name__ == '__main__':
    app.run(debug=True)