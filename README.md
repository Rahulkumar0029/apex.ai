<div align="center">

# 🎯 APEX.AI — AI Voice Interview Coach

**The most realistic AI-powered mock interview platform.** Practice interviews with a live AI recruiter, get instant feedback, and land your dream job.

[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-Express-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Socket.io](https://img.shields.io/badge/Socket.io-Real--Time-010101?style=flat-square&logo=socket.io)](https://socket.io/)
[![Gemini AI](https://img.shields.io/badge/Google-Gemini%20AI-4285F4?style=flat-square&logo=google&logoColor=white)](https://ai.google.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://neon.tech/)

</div>

---

## 📌 What is APEX.AI?

APEX.AI is a full-stack AI interview coaching platform that conducts **realistic, real-time mock interviews** for any job role. It uses Google Gemini AI to:

- 🎭 Roleplay as a real company recruiter (Google, Amazon, Microsoft, Startups)
- 🗣️ Ask progressive questions across 8 interview phases
- 📊 Evaluate every answer on Technical Knowledge, Communication, Problem Solving & Grammar
- 💡 Give actionable feedback with strengths, improvement areas, and a final report
- 🔊 Speak out loud using browser TTS (Text-to-Speech)
- 🎤 Listen to your voice using Deepgram / AssemblyAI for real-time transcription

---

## ✨ Features

| Feature | Description |
|---|---|
| 🎭 **AI Recruiter Persona** | AI interviewer with a name, title, company, personality, and team |
| 🏢 **Company DNA Mode** | Google → Algorithms; Amazon → Leadership Principles; Microsoft → Architecture |
| 📋 **8-Phase Interview Ladder** | Introduction → Warm-up → Technical → Deep Technical → Behavioral → Scenario → Candidate Qs → Closing |
| 🔊 **AI Voice Output** | AI speaks questions aloud using Web Speech API |
| 🎤 **Voice Input** | Speak answers; transcribed in real-time via Deepgram / AssemblyAI |
| ⚡ **Real-time via WebSocket** | Zero-lag question delivery using Socket.io |
| 📊 **Per-Answer Scoring** | Technical, Communication, Problem Solving, Grammar scored 0-100 |
| 📄 **Full Interview Report** | Detailed report with all Q&As and final scores |
| 📈 **Analytics Dashboard** | Track progress over time with score trends and XP system |
| 🔗 **Shareable Reports** | Public share link for each completed interview |
| 🔐 **JWT Auth + Refresh** | Secure access/refresh token authentication |

---

## 🏗️ Tech Stack

### Frontend
- React 18 + TypeScript + Vite
- Tailwind CSS + shadcn/ui + Framer Motion
- Socket.io-client, Zustand, TanStack Query, React Router v6
- Web Speech API (TTS + STT)

### Backend
- Node.js + Express + TypeScript
- Socket.io (WebSocket server)
- Prisma ORM + PostgreSQL (Neon)
- Google Gemini 3.5 Flash Lite (AI engine)
- Deepgram + AssemblyAI (speech-to-text)
- JWT (access + refresh tokens), node-cron

---

## 📂 Project Structure

```
apex.ai/
├── client/                          # React Frontend
│   └── src/
│       ├── pages/
│       │   ├── LandingPage.tsx
│       │   ├── DashboardPage.tsx
│       │   ├── HistoryPage.tsx
│       │   ├── AnalyticsPage.tsx
│       │   ├── ReportPage.tsx
│       │   ├── auth/                # Login, Register, ForgotPassword
│       │   └── interview/
│       │       ├── CreateInterviewPage.tsx  # Step-by-step setup
│       │       ├── LobbyPage.tsx
│       │       └── RoomPage.tsx             # LIVE interview room
│       ├── store/                   # Zustand stores (auth, interview)
│       ├── lib/axios.ts             # HTTP client + auto token refresh
│       └── services/                # API service functions
│
└── server/                          # Node.js Backend
    └── src/
        ├── server.ts                # Entry point (HTTP + Socket.io)
        ├── app.ts                   # Express app setup
        ├── socket/
        │   ├── index.ts             # Socket.io auth middleware
        │   └── interviewHandlers.ts # Core interview logic
        ├── services/
        │   ├── ai/GeminiClient.ts   # AI question generation + evaluation
        │   ├── speech/              # Deepgram + AssemblyAI clients
        │   ├── InterviewService.ts
        │   ├── ReportService.ts
        │   └── AuthService.ts
        ├── controllers/             # REST API controllers
        ├── middlewares/             # authGuard, planGuard
        └── jobs/planExpiry.ts       # Cron jobs
```

---

## 🔄 Interview Flow

```
User → Dashboard → "New Interview"
         ↓
  CreateInterviewPage (5 Steps)
  Role, Company, Difficulty, Type, Preferences
         ↓
  POST /interview/create → Session created in DB
  Navigate to /interview/:id/room
         ↓
  RoomPage.tsx connects via Socket.io
  socket.emit('ready', { sessionId })
         ↓
  Server: GeminiClient.generateQuestion() → Q1 (Introduction phase)
  socket.emit('question', { text, phase, index })
         ↓
  AI speaks question aloud (Web Speech API TTS)
  User answers via voice or text
  socket.emit('answer', { sessionId, transcript })
         ↓
  Server: GeminiClient.evaluateResponse() → JSON scores
  Generates next question (with conversation history)
  socket.emit('evaluation', scores) + socket.emit('question', nextQ)
         ↓
  After final question:
  socket.emit('endInterview', { sessionId })
  Server generates full report → navigate to /report/:id
```

---

## 🤖 How the AI Works

**Gemini 3.5 Flash Lite** does two jobs:

**1. Question Generation**
- Roleplays as a named recruiter (e.g., "David Miller, Staff Engineer at Google Maps")
- Company DNA adaptation: Google → Big-O focus; Amazon → STAR method; etc.
- Tracks full conversation history and references earlier answers
- Stress-level questioning when candidate performs well (1-5 scale)
- Intelligent fallback engine if API rate-limits — no crashes

**2. Answer Evaluation**
Returns structured JSON with scores 0-100 for:
- Technical Knowledge
- Communication
- Problem Solving
- Grammar
- Plus: Strengths list, Improvements list, AI Notes

---

## 🚀 Getting Started

```bash
git clone https://github.com/Rahulkumar0029/apex.ai.git
cd apex.ai
npm install
cd server && npm install
cd ../client && npm install
```

Setup `server/.env` and `client/.env` (see `.env.example` files).

```bash
cd server
npx prisma migrate dev
npx prisma db seed
```

```bash
# From root (runs both)
npm run dev
```

Open: http://localhost:5173

---

## 🔐 Authentication

- Register/Login → `accessToken` (7 days) + `refreshToken` (30 days)
- Axios interceptor → auto-refreshes tokens silently
- Socket.io → JWT validated on every connection
- Protected routes via `RequireAuth` wrapper

---

## 🌟 Roadmap

- [ ] Resume upload → AI extracts tech stack automatically
- [ ] Video recording + body language analysis
- [ ] Multi-language support (Hindi, Spanish, French)
- [ ] Panel interview simulation (multiple AI interviewers)
- [ ] Mobile app (React Native)

---

## 👨‍💻 Built By

**Rahul Kumar Bishnoi** — [@Rahulkumar0029](https://github.com/Rahulkumar0029)

<div align="center">⭐ Star this repo if APEX.AI helped you land your dream job!</div>
