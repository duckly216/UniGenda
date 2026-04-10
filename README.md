# UniGenda

UniGenda is a task management web app for students. It helps you organize school, work, and daily-life tasks, and aims to support collaboration with people who have similar goals.

## Tech Stack

- Backend: Python + Flask + Firebase (Firestore)
- Frontend: React
- Architecture: Client/Server

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