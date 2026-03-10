from flask import Flask, jsonify
from firebase_config import db

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

if __name__ == '__main__':
    app.run(debug=True)