# 📋 APEX.AI — Implementation Plan & Status Audit (3 User Stories)

> **Objective:** Demonstrate full end-to-end functionality of the 3 user stories to your teacher with 100% working stability and zero regressions to existing code.

---

## 🎯 Executive Summary of Audit

| Story | Requirement | Current Status | What Is Already Working | Enhancements to Add (Zero Breaking Changes) |
|---|---|---|---|---|
| **Story 1** | Role & Experience Level Selection → AI Question Generation | **✅ 95% Working** | 5-step setup form, role selection, experience years (0–15+), Gemini dynamic question generation with role & company DNA. | Add prominent role & experience header badge in the room so your teacher clearly sees the profile alignment in real time. |
| **Story 2** | Voice Answer (STT) → AI converts speech-to-text → Intelligent Follow-up Questions | **✅ 90% Working** | Browser STT (`SpeechRecognition`), dynamic Gemini question chaining with memory of previous answers & phased questioning. | Show live interim speech preview (words appear as you talk), visual sound wave mic status, ensure follow-up acknowledges candidate's spoken points seamlessly. |
| **Story 3** | Post-interview Evaluation: Technical Knowledge, Communication, Confidence, Fluency + Feedback Report | **✅ 95% Working** | DB schema has all 4 metrics, Gemini evaluation engine, Radar Chart, Strengths & Improvements, Recruiter Hiring Verdict. | Align UI labels precisely to story wording ("Technical Knowledge", "Confidence", "Fluency & Grammar"), ensure question-by-question breakdown highlights improvement suggestions. |

---

## 🔍 Detailed Story-by-Story Audit

### Story 1: Profile Selection & AI Question Generation
> *"The user selects a role and experience level. Based on these inputs, our AI generates interview questions relevant to that profile."*

#### 1. What is Already Built & Working:
- **`CreateInterviewPage.tsx`**:
  - Step 1 collects **Role** (`Frontend Engineer`, `Backend Engineer`, `Fullstack`, `DevOps`, `Mobile`, etc.), **Experience Level** (`0-1 yrs`, `1-3 yrs`, `3-5 yrs`, `5+ yrs`), plus company target, personality, and tech stack.
  - Submits to `POST /interview/create`, saving `role`, `experienceYears`, `techStack`, `difficulty` to PostgreSQL.
- **`interviewHandlers.ts` & `GeminiClient.ts`**:
  - Server receives `ready` socket event and calls `aiEngine.generateQuestion(...)`.
  - Gemini prompt explicitly ingests `ctx.role`, `ctx.experienceYears`, `ctx.difficulty`, and `ctx.techStack`.
  - Company DNA personalization: Tailors question style to company standards (Google algorithms, Amazon STAR method, etc.).
- **Room Display**:
  - AI greets the user, introduces the recruiter, and generates phase-based questions tailored specifically to the candidate's chosen profile.

#### 2. What We Will Enhance (Non-Breaking):
- On the live interview room header (`RoomPage.tsx`), display a clear metadata badge:
  `Role: Frontend Engineer | Experience: 3 Years | Difficulty: Medium`
  *Why:* When demonstrating to the teacher, this proves immediately on-screen that the current session was created for that exact role and experience level.

---

### Story 2: Voice Input & Intelligent Follow-up Questions
> *"Instead of typing, the user answers using voice. The AI converts speech to text and asks intelligent follow-up questions, creating a realistic interview experience."*

#### 1. What is Already Built & Working:
- **Voice Transcription (STT)**:
  - `RoomPage.tsx` integrates the browser's `SpeechRecognition` API.
  - Mic unmuted by default; audio track active; "Voice + Text Active" indicator is present.
  - Spoken words are captured and appended to the answer textarea.
  - 4-second silence detection countdown auto-submits or user clicks "Submit Answer".
- **Intelligent Follow-Up Generation**:
  - When the candidate submits an answer, `interviewHandlers.ts` stores the answer transcript in DB.
  - Server passes `previousTranscript: transcript` and `history: conversationHistory` to `aiEngine.generateQuestion(...)`.
  - Gemini's Memory Engine explicitly checks previous candidate claims:
    - *"Memory Engine: Actively scan the Conversation History. Reference details they mentioned in earlier answers."*
    - Automatically advances through phases: *Introduction → Warm-up → Technical → Deep Technical (challenges previous answers) → Behavioral → Scenario → Closing*.

#### 2. What We Will Enhance (Non-Breaking):
- **Live Interim STT display:** Currently, `onresult` only appends when `event.results[i].isFinal` is true. We will also display interim transcript so words appear in real-time on screen as the user talks into the mic.
- **Visual Mic Audio Activity Indicator:** Add an animated voice pulse bar next to the mic icon when candidate voice is detected so the teacher visually sees the microphone picking up speech in real-time.
- **Explicit Fallback / Speech Recognition Safety:** Gracefully handle browser microphone permissions with a clean visual indicator.

---

### Story 3: Multi-Competency Evaluation & Personalized Feedback Report
> *"After the interview, the AI evaluates the user's technical knowledge, communication, confidence, and fluency, then generates a personalized feedback report with improvement suggestions."*

#### 1. What is Already Built & Working:
- **Evaluation Engine (`GeminiClient.ts` & `ReportService.ts`)**:
  - Evaluates every response across multi-dimensional criteria:
    - `technicalScore`
    - `communicationScore`
    - `problemSolvingScore`
    - `grammarScore` (Fluency & Grammar)
    - `confidenceScore` (Derived from communication & speech fluency stability)
  - Evaluates `strengths[]`, `improvements[]`, and `aiNotes` (interviewer notebook).
  - Overall Recruiter Verdict: `Strong Hire`, `Hire`, `Lean Hire`, `No Hire` with personalized hiring decision explanation.
- **Report Dashboard (`ReportPage.tsx`)**:
  - Interactive Radar Chart displaying competency dimensions.
  - Score Breakdown with progress bars and color coding.
  - Section for **Key Strengths** and **Improvement Suggestions**.
  - Question-by-question accordion with candidate transcripts, AI notes, and score cards.
  - PDF Export and Shareable link.

#### 2. What We Will Enhance (Non-Breaking):
- **Rubric Label Alignment:** In `ReportPage.tsx`, verify labels match the teacher's exact keywords:
  - `"Technical Knowledge"` (instead of just "Technical")
  - `"Communication"`
  - `"Confidence"`
  - `"Fluency & Grammar"`
  - `"Improvement Suggestions"` (prominently grouped)
- Ensure the Mock fallback data and live data both have these 4 exact metrics so the report renders flawlessly whether tested with Gemini live or offline fallback.

---

## 🛡️ Safety & Non-Breaking Guarantee

1. **Zero Database Migrations Needed:** The Prisma schema already contains `technicalScore`, `communicationScore`, `confidenceScore`, `grammarScore`, `strengths`, `weaknesses`, and `suggestions`.
2. **Zero Route or API Changes:** All endpoints (`/interview/create`, `/interview/:id`, `/report/:id`, socket events `ready`, `question`, `answer`, `nextQuestion`, `report`) remain 100% untouched.
3. **Additive UI Only:** Only styling, badges, and interim STT event handlers are adjusted. Existing manual text fallback remains completely functional if mic is muted.

---

## 🎬 Proposed Demo Flow for Your Teacher

1. **Story 1 Demo (Setup & Generation):**
   - Go to `http://localhost:5173/interview/create`.
   - Select **Role**: `Frontend Engineer` & **Experience**: `2-3 Years` (show this step to the teacher).
   - Enter Room → Show that Emily Carter (AI Recruiter) welcomes the candidate and generates questions tailored specifically to a 2-3 YOE Frontend Developer.
2. **Story 2 Demo (Voice & Follow-up):**
   - Speak your answer into the microphone (e.g., *"I built a dashboard using React and Tailwind, optimizing state management with Zustand."*).
   - Show words transcribing automatically on screen via speech-to-text.
   - Click **Submit Answer** → Watch Emily Carter process and ask a direct follow-up: *"You mentioned Zustand — how did you prevent unnecessary re-renders compared to Redux?"*.
3. **Story 3 Demo (Evaluation & Feedback Report):**
   - Click **End Interview** → Conclude & Generate Report.
   - Show the teacher the **Interview Report**:
     - **Technical Knowledge Score**
     - **Communication Score**
     - **Confidence Score**
     - **Fluency & Grammar Score**
     - **Strengths & Improvement Suggestions**
     - Recruiter Hiring Verdict (`Hire` / `Lean Hire`) & PDF export.
