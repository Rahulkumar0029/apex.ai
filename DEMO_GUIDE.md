# 🎬 APEX.AI — Live Demo Guide for Tomorrow
### Step-by-step, exactly what to do on screen

---

## ⚡ BEFORE YOU WALK INTO THE ROOM (Pre-Demo Setup)

Do these steps **at home before you leave** or **15 minutes before presentation**:

### Step 1 — Start the servers
Open **two terminals** in VS Code (or Windows Terminal):

**Terminal 1 — Backend:**
```bash
cd C:\Users\rahul\OneDrive\Desktop\Projects\apex.ai\server
taskkill /F /IM node.exe    ← Run this first to kill old servers
npm run dev
```
Wait until you see:
```
[Server] Apex.ai backend running on port 4000
[Server] Health check: http://localhost:4000/health
```

**Terminal 2 — Frontend:**
```bash
cd C:\Users\rahul\OneDrive\Desktop\Projects\apex.ai\client
npm run dev
```
Wait until you see:
```
VITE v5.x  ready in xxx ms
➜  Local: http://localhost:5173/
```

### Step 2 — Open Browser
- Open **Google Chrome** (not Edge, not Firefox — Chrome has best Web Speech API support)
- Go to `http://localhost:5173`
- You should see the Landing Page ✅

### Step 3 — Pre-login (Optional but Recommended)
Log in with your demo account BEFORE the presentation starts:
- Email: `demo@apex.ai`
- Password: `Password123!`
- This way you skip login during the live demo and go straight to the good stuff.

### Step 4 — Browser Settings
- Allow **Microphone** when Chrome asks (click Allow)
- Make sure **system volume is UP** (AI voice speaks out loud)
- Put Chrome in **Full Screen** → Press `F11`

---

## 🎥 DEMO SCRIPT — Exactly What to Show (10-12 Minutes)

---

### 🟢 PART 1: THE LANDING PAGE (1 minute)

**What to say:**
> "This is APEX.AI. It's an AI-powered mock interview coach. Let me show you how it works."

**What to show:**
- Scroll down the landing page slowly
- Point out: "AI Interview Coach", features listed, the CTA buttons

**Key talking point:**
> "The idea is simple — instead of practicing alone or asking a friend who's not a real interviewer, you get a fully realistic AI recruiter who actually speaks to you, asks follow-up questions, and scores every answer."

---

### 🟢 PART 2: REGISTER / LOGIN (1 minute)

**Option A — Register live (more impressive):**
1. Click "Get Started" or "Sign Up"
2. Fill in: Name → `Demo User`, Email → any email, Password → `Password123!`
3. Click Register
4. You land on the **Dashboard** automatically ✅

**Option B — Just login (faster + safer):**
1. Click "Login"
2. Email: `demo@apex.ai`, Password: `Password123!`
3. Click Sign In → Dashboard ✅

**What to say while logging in:**
> "Authentication uses JWT — JSON Web Tokens. Access token is valid for 7 days, so you never get logged out mid-interview."

---

### 🟢 PART 3: THE DASHBOARD (1-2 minutes)

**What to show and say:**
- Point to the greeting: "Good evening, Demo User 👋"
> "The dashboard shows your overall interview history — how many interviews you've done, your current XP level, and your progression."

- Point to the stats cards (interviews done, XP, level)
> "We have a gamification system — every interview earns XP. More interviews → level up. This keeps users coming back."

- Point to the sidebar
> "Navigation: Dashboard, New Interview, History, Analytics, Profile, Settings."

- Point to the "New Interview" button in the center
> "Let's start an interview. Click New Interview."

---

### 🟢 PART 4: CREATE INTERVIEW — 5 STEPS (2-3 minutes)

**Click "New Interview"** → CreateInterviewPage opens

**Walk through each step quickly:**

**Step 1 — Basic Info**
- Role: `Full Stack Engineer`
- Experience: `2 years`
- Company: `Google`
- Difficulty: `Junior`
> "You can pick any role and any company. The AI adapts its entire personality and questioning style to match."

**Step 2 — Interview Type**
- Select: `Technical`
> "You can choose Technical, HR/Behavioral, or Mixed."

**Step 3 — Preferences**
- Questions: `5`  (keep it short for demo)
- Language: `English`
- Personality: `Friendly`
> "5 questions for the demo — in real use, people do 10-15 questions for a full session."

**Step 4 — AI Recruiter Card**
- Show the generated recruiter card
> "APEX.AI generates a realistic recruiter persona — name, title, company, team. This is David Miller, Staff Engineer at Google Maps. Every interview has a different recruiter."

**Step 5 — Launch**
- Click "Start Interview" or "Launch" button
> "The system creates a session in the database, assigns a unique interview ID, and opens the live room."

---

### 🟢 PART 5: THE LIVE INTERVIEW ROOM — STAR OF THE SHOW (4-5 minutes)

**What to show as soon as it loads:**

1. **Point to the phase tracker at the top:**
> "You can see the 8 phases at the top — Introduction, Warm-up, Technical, Deep Technical, Behavioral, Scenario, Candidate Questions, Closing. Every real interview follows this structure."

2. **Point to the AI recruiter panel (left side):**
> "This is the AI recruiter avatar. When it says 'Speaking out loud,' it means the AI is speaking the question through your speakers."

3. **Point to the question panel (right side):**
> "Question 1 of 5 — Introduction phase. The AI greets you, introduces itself, and asks if you're ready to begin."

4. **AI Voice Speaking:**
> "The AI uses Text-to-Speech through the browser's Web Speech API. It actually speaks the question. Listen..."
*(Let the AI voice finish speaking the intro question)*

5. **Type an answer:**
- Click the text box
- Type: `"Yes, let's begin! I'm ready for the interview."`
- Click **Submit Answer**
> "You can speak your answer using the microphone or type it. Both are supported."

6. **Show the AI generating the next question:**
> "The answer goes to our backend via Socket.io — a real-time WebSocket connection. The backend sends it to Gemini AI, which evaluates the answer AND generates the next question. This happens in seconds."

7. **Point to Q2 (Warm-up phase):**
> "We're now in the Warm-up phase. Notice how the phase tracker updated. The AI will ask 'Tell me about yourself' type questions here."

8. **Type another quick answer:**
- Type: `"I'm a CS student with experience in React, Node.js, and PostgreSQL. I've built e-commerce platforms and REST APIs."`
- Submit

9. **Show evaluation scores appearing:**
> "After every answer, Gemini evaluates it across 4 dimensions — Technical Knowledge, Communication, Problem Solving, and Grammar — each scored 0 to 100."

---

### 🟢 PART 6: END THE INTERVIEW + REPORT (1-2 minutes)

1. Click the **"End"** button (red button at bottom)
2. Confirm in the dialog
> "I'll end it early for the demo — in real use you'd go through all phases."

3. You land on the **Report Page**
> "This is the final interview report. It shows overall score, breakdown by category, all questions and answers, strengths, improvement areas, and AI notes for each answer."

4. **Point to the share button (if visible):**
> "Every report gets a unique shareable link — so you can share your interview performance with a mentor or hiring manager."

---

### 🟢 PART 7: HISTORY + ANALYTICS (1 minute — optional)

**Click History in sidebar:**
> "Every past interview is saved. You can go back and review any interview, re-read the report, and track your progress over time."

**Click Analytics:**
> "The analytics page shows your score trends over time — which areas are improving, which need work. Technical Knowledge, Communication, Grammar tracked separately."

---

## 🔥 POWER MOVES — Do These to WOW the Audience

| Moment | What to Say |
|---|---|
| AI voice speaks | "It's actually speaking — using the browser's Speech Synthesis API. No external TTS cost." |
| Phase tracker updates | "8 structured phases — exactly how real interviews at top companies work." |
| Gemini generates next question | "The AI has full conversation history. It remembers what you said in Q1 and builds on it in Q4." |
| Scores appear | "4-dimensional scoring in under 3 seconds. Gemini returns structured JSON." |
| Report page | "This is what makes it actionable — not just a score, but specific improvement guidance." |

---

## 🚨 IF SOMETHING GOES WRONG (Emergency Backup Plan)

| Problem | Fix |
|---|---|
| Backend not starting | Open terminal, run: `taskkill /F /IM node.exe` then `cd server && npm run dev` |
| Port 4000 in use | Run: `netstat -ano \| findstr :4000` → get PID → `taskkill /F /PID <number>` |
| Interview stuck on loading | Refresh the page and try again — interview session will reconnect |
| AI not generating question | The fallback engine kicks in automatically — interview still works |
| Voice not speaking | Go to browser settings → allow audio → or just say "voice runs via Web Speech API" |
| Login failing | Use the pre-created demo account: `demo@apex.ai` / `Password123!` |
| Whole site down | Show the GitHub repo + README instead — explain the architecture |

---

## 🎯 WHAT TO EMPHASIZE (Most Impressive Parts)

1. **"The AI actually speaks"** — TTS is instant and sounds natural
2. **"It remembers context"** — Gemini tracks full conversation history
3. **"Company-specific behavior"** — Google vs Amazon vs Startup — different AI personality
4. **"Real-time via WebSocket"** — no page refresh, instant question delivery
5. **"Full-stack production architecture"** — React + Node + Prisma + PostgreSQL + Socket.io + Gemini

---

## 📱 SCREEN SETUP TIPS

- **Resolution:** 1920x1080 or 1366x768 — make sure text is readable from the back
- **Browser zoom:** Set to 110% or 125% so people at the back can read
- Chrome: Press `Ctrl + Shift + +` to zoom in
- **Dark mode:** APEX.AI is dark themed — looks great on projectors
- **Hide taskbar:** Right-click taskbar → Auto-hide the taskbar
- **Close other apps:** Close WhatsApp, Spotify, email — no notifications during demo

---

## ⏰ TIMING BREAKDOWN (10 min total)

| Section | Time |
|---|---|
| Landing Page | 1 min |
| Login | 1 min |
| Dashboard walk | 1.5 min |
| Create Interview (5 steps) | 2 min |
| Live Interview Room | 3 min |
| Report Page | 1 min |
| Q&A Buffer | 0.5 min |
| **Total** | **~10 min** |

---

## 💬 OPENING LINE (Say This First)

> **"What if you could practice a Google interview right now, on your laptop, with an AI that actually sounds like a real recruiter, asks follow-up questions based on YOUR answers, and gives you a score in real time? That's APEX.AI. Let me show you."**

## 💬 CLOSING LINE (Say This Last)

> **"APEX.AI is not a chatbot. It's a fully structured interview simulation platform — with real-time communication, AI-powered evaluation, and a production-ready architecture. The code is live on GitHub. Thank you."**

---

*You got this. The app works. The demo is smooth. Go crush it tomorrow! 🚀*
