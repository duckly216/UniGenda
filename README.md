# UniGenda

## Overview
UniGenda is a simple task management app built for students who want to keep school, work, and daily life organized in one place. It makes it easy to track what matters, stay on top of deadlines, and collaborate with others when a task needs teamwork.

## Main Features
- Organize Everything in One Place: Add assignments, work tasks, and everyday chores to the same list so nothing gets lost. Mark items as complete as you finish them and keep your focus on what’s next.
- Collaborate with Others: Share a task publicly and bring friends or teammates into the process to get things done faster together.

---

## Tech Stack

- Backend: Python Flask, Flask-CORS, Firebase Admin SDK
- Frontend:  React 18, React, Router, Axios, Firebase JS SDK
- Database: Firebase
- Architecture: Client/Server

---
<br/><br/>

# Project Setup

## Prerequisites

- Python 3.10+
- Node.js + npm
- Git

## Project Structure

- [backend](backend)
- [frontend](frontend)

---

## Quick Start

Open two terminals:
1. One for the backend
2. One for the frontend

### 1) Backend setup (Python)

From the project root:

```bash
cd backend
python -m venv venv
```

Activate the virtual environment:

Windows (PowerShell):

```bash
venv\Scripts\Activate.ps1
```

macOS/Linux:

```bash
source venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

If you see `failed to locate pyvenv.cfg`, the virtual environment is corrupted. Rebuild it with:

```powershell
Remove-Item -Recurse -Force venv
py -m venv venv
venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### Firebase credentials

The backend expects a service account key at:

- [backend/src/firebase-key.json](backend/src/firebase-key.json)

If you do not have one yet, use the example file as a guide:

- [backend/src/firebase-key.json.example](backend/src/firebase-key.json.example)

### Run backend

From [backend](backend):

```bash
npm start
```

This runs:

- `python src/app.py`

---

### 2) Frontend setup (React)

From the project root:

```bash
cd frontend
npm install
```

Run frontend:

```bash
npm start
```

If PowerShell blocks script execution on Windows, run PowerShell as Administrator and execute:

```bash
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

---

## Notes

- Keep backend and frontend running at the same time during development.
- Backend entry point: [backend/src/app.py](backend/src/app.py)
- Frontend entry point: [frontend/src/index.js](frontend/src/index.js)


### Dummy data: create and clean public posts

From [backend](backend), you can generate and remove dummy public posts for testing.

Create 50 public posts for a user:

```bash
python src/dummy_data/seed_public_posts.py --user-id TNMq53qHLgMt82ATXcYKw2zzEiv2 --count 50
```

Preview what would be deleted (recommended first):

```bash
python src/dummy_data/delete_public_posts.py --user-id TNMq53qHLgMt82ATXcYKw2zzEiv2 --dry-run
```

Delete those public posts:

```bash
python src/dummy_data/delete_public_posts.py --user-id TNMq53qHLgMt82ATXcYKw2zzEiv2
```

What these scripts do:

- Seeder writes matching task docs to both Firestore locations used by the app:
	- `users/{uid}/tasks/{taskId}`
	- `public_tasks/{taskId}`
- Cleaner removes the user’s public task docs from both locations.