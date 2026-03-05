# UniGenda
A website that serves as a dynamic checklist for everyday tasks (professional, school, and daily life), while also providing them with a community that will help students find others with similar agendas to possibly work together to reach these goals.

## Installation & Setup

This project uses a **Client-Server Architecture**. Follow the steps below to set up both the Python backend logic and the React frontend interface.

### Prerequisites
* **Python 3.10+**
* **Node.js & npm** (for the frontend)
* **Git**

---

### 1. Backend Setup (Python)

```bash
# Navigate to the backend directory
cd backend

# Create a virtual environment (recommended)
python -m venv venv

# Activate the environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install required dependencies
pip install -r requirements.txt
```
### 2. Frontend Setup (JavaScript)

```bash
# Navigate to the backend directory
cd frontend

npm install
```
#### Note:
You might need to run powershell on administator and run this command
```bash 
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Running Website Locally

```bash
npm start
```