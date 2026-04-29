# 🧠 NeuroTrace AI

> **AI-powered work activity reconstruction platform**  
> NeuroTrace AI intelligently tracks user activity, reconstructs working sessions, and generates contextual AI summaries so users can instantly continue where they left off.


---

# ✨ Features

✅ Real-time activity tracking  
✅ AI-powered work session summaries  
✅ Intelligent session reconstruction  
✅ File activity monitoring  
✅ Active window/app tracking  
✅ Modern React dashboard  
✅ FastAPI backend architecture  
✅ Supabase cloud synchronization  
✅ Gemini AI integration  
✅ Session-aware productivity insights  

---

# 📸 UI Preview

## Dashboard
<p align="center">
  <img src="./asserts/dashboard" alt="Dashboard UI" width="90%" />
</p>

---

## Activity Timeline
<p align="center">
  <img src="./asserts/activity-feed" alt="Activity Feed UI" width="90%" />
</p>

---

## AI Summary Panel
<p align="center">
  <img src="./asserts/summary-panel" alt="AI Summary UI" width="90%" />
</p>

---

# 🏗️ System Architecture

```text
┌─────────────────────┐     POST /logs      ┌─────────────────────────┐
│   Background Agent  │ ──────────────────► │    FastAPI Backend      │
│      (Python)       │                     │ (SQLite/Supabase+AI)    │
│                     │                     │                         │
│ • Active window     │                     │ • Stores activity logs  │
│ • App switches      │                     │ • Session grouping      │
│ • File changes      │                     │ • AI summarization      │
│ • Session detection │                     │ • API endpoints         │
└─────────────────────┘                     └──────────┬───────────┘
                                                       │
                                            GET /summary
                                                       │
                                            ┌──────────▼───────────┐
                                            │    React Frontend    │
                                            │                      │
                                            │ • Dashboard UI       │
                                            │ • Session history    │
                                            │ • Live activity feed │
                                            │ • AI summaries       │
                                            └──────────────────────┘
```

---

# 🛠️ Tech Stack

## Frontend
- React.js
- CSS3
- Axios

## Backend
- FastAPI
- Python
- SQLite
- Supabase

## AI Integration
- Gemini AI API

## Monitoring & Tracking
- Watchdog
- PyGetWindow

---

# 📂 Project Structure

```bash
neurotrace-ai/
├── agent/
│   ├── agent.py
│   └── requirements.txt
│
├── backend/
│   ├── main.py
│   ├── requirements.txt
│   └── .env
│
├── frontend/
│   ├── package.json
│   ├── public/
│   └── src/
│
├── assets/
│   ├── banner.png
│   ├── dashboard.png
│   ├── activity-feed.png
│   └── summary-panel.png
│
└── README.md
```

---

# ⚙️ Prerequisites

| Tool | Version |
|------|----------|
| Python | 3.10+ |
| Node.js | 18+ |
| npm | 9+ |
| Gemini API Key | Required |
| Supabase Account | Required |

---

# 🚀 Quick Start

# 1️⃣ Clone Repository

```bash
git clone https://github.com/yourusername/neurotrace-ai.git

cd neurotrace-ai
```

---

# 2️⃣ Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment

# Windows
venv\Scripts\activate

# macOS/Linux
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

---

## Configure Environment Variables

Create a `.env` file:

```env
GEMINI_API_KEY=your_gemini_api_key
SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_anon_key
```

---

## Start Backend Server

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Backend URL:

```bash
http://localhost:8000
```

Swagger API Docs:

```bash
http://localhost:8000/docs
```

---

# 3️⃣ Agent Setup

```bash
cd agent

python -m venv venv

# Windows
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start tracking agent
python agent.py
```

---

# 4️⃣ Frontend Setup

```bash
cd frontend

npm install

npm start
```

Frontend URL:

```bash
http://localhost:3000
```

---

# 🧪 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/logs` | Send activity logs |
| POST | `/logs/batch` | Send multiple logs |
| GET | `/logs` | Retrieve logs |
| GET | `/summary` | Generate AI summary |
| GET | `/sessions` | Get session history |
| GET | `/health` | Health check |

---

# 🗄️ Supabase Table Schema

Create a table named:

```sql
activity_logs
```

## Columns

| Column | Type |
|--------|------|
| id | uuid / int8 |
| timestamp | timestamp |
| app | text |
| action | text |
| session_id | text |
| details | jsonb |

---

# 🤖 AI Summary Example

```json
{
  "summary": [
    "User was working on a FastAPI backend project.",
    "Edited multiple Python files and switched between VS Code and browser.",
    "Suggested next step: Resume backend API integration."
  ]
}
```

---

# 📦 Production Build

```bash
cd frontend

npm run build
```

Serve build folder:

```bash
npx serve -s build -p 3000
```

---

# 🧩 Future Improvements

- 🔐 Authentication System
- ☁️ Multi-device synchronization
- 📊 Productivity analytics
- 🧠 Advanced AI memory reconstruction
- 📱 Mobile dashboard
- 🔔 Smart notifications

---

# 🐛 Common Issues

## Backend Not Starting

```bash
pip install -r requirements.txt
```

---

## Agent Cannot Connect

Ensure backend is running:

```bash
uvicorn main:app --reload --port 8000
```

---

## Gemini API Error

Verify `.env` configuration:

```env
GEMINI_API_KEY=your_key
```

---

# 📄 License

MIT License © 2026 NeuroTrace AI

---

# 👨‍💻 Author

**Vishal V**

AI/ML Developer • Full Stack Developer • System Designer

---

# 🌟 Support

If you found this project useful:

⭐ Star the repository  
🍴 Fork the project  
🛠️ Contribute to development  

---

<p align="center">
  Built with ❤️ using FastAPI, React, and AI
</p>
