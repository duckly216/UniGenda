from flask import Flask, jsonify, request
from firebase_admin import firestore
from backend.src.firebase_config import db

app = Flask(__name__)
tasks = db.collection('tasks')

@app.route('/')
def home():
    return jsonify({"message": "Unigenda backend is running"})

@app.route('/testdb')
def test_db():
    tasks.add({"task": "Test task"})
    return {"message": "Task added"}

@app.route('/tasks')
def get_tasks():
    task_list = []
    for task in tasks.stream():
        task_list.append(task.to_dict())
    return jsonify(task_list)
## -- CRUD Operations -- ##
# CREATE
@app.route('/tasks', methods=['POST'])
def add_task():
    data = request.json
    new_task = {
        "title": data.get('title'),
        "description": data.get('description'),
        "dueDate": data.get("dueDate"),
        "userId": data.get("userId"), # The student's User ID from Auth
        "status": "pending",
        "createdAt": firestore.SERVER_TIMESTAMP
    }
    doc_ref = db.collection('tasks').add(new_task)
    return jsonify({"id": doc_ref[1].id, "message": "Task created"}), 201
# READ
@app.route('/tasks/<uid>', methods=['GET'])
def get_user_tasks(uid):
    # Only fetch tasks where the 'userId' matches the student
    user_tasks = db.collection('tasks').where('userId', '==', uid).stream()
    task_list = [task.to_dict() | {"id": task.id} for task in user_tasks]
    return jsonify(task_list), 200
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