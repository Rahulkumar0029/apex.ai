# Implementation Plan: AI Interview Platform (Apex.ai)

## Overview

Full-stack implementation of an AI-powered interview preparation platform built with React 19 + TypeScript (frontend), Node.js + Express + TypeScript (backend), PostgreSQL via Prisma, Socket.io for real-time communication, Google Gemini/OpenAI for AI, AssemblyAI/Deepgram for speech, and Cloudinary for media. Tasks are ordered foundation-first, with each step building on the previous, ending with deployment configuration.

## Tasks

- [x] 1. Project scaffolding and monorepo setup
  - Initialize monorepo root with `package.json` workspaces pointing to `client/` and `server/`
  - Create root `.gitignore`, `.nvmrc` (Node 20 LTS), `turbo.json` or root-level scripts for concurrent dev
  - Set up root ESLint + Prettier config shared across workspaces
  - Create `server/` directory with `tsconfig.json`, `package.json`, and `src/` structure
  - Create `client/` directory with Vite + React 19 + TypeScript template
  - Add `vitest` as the test runner for both workspaces
  - _Requirements: 15.1 (performance baseline requires correct tooling)_

- [x] 2. Backend foundation: Express app, config, and middleware stack
  - [x] 2.1 Bootstrap Express app with TypeScript and core middleware
    - Create `server/src/app.ts` with Express instance, `cors`, `helmet`, `morgan`, `express.json()`
    - Create `server/src/server.ts` as the entry point that attaches HTTP and Socket.io servers
    - Create `server/src/config/index.ts` loading all env vars with `dotenv`; export typed `config` object
    - Create `.env.example` documenting all required environment variables
    - _Requirements: 14.1, 15.3_
  - [x] 2.2 Implement typed error classes and central error handler middleware
    - Create `server/src/utils/errors.ts` with `AppError`, `ValidationError`, `UnauthorizedError`, `ForbiddenError`, `NotFoundError`, `ConflictError`, `PlanLimitError`, `ServiceUnavailableError`
    - Create `server/src/middlewares/errorHandler.ts` catching `AppError` subclasses and unhandled exceptions
    - Log full stack trace on unhandled errors; always return structured JSON; never crash
    - _Requirements: 15.3_
  - [ ]* 2.3 Write property test for error handler (P44)
    - **Property 44: Unhandled server exceptions return 500 and the server remains operational**
    - **Validates: Requirements 15.3**
  - [x] 2.4 Implement retry utility with exponential backoff
    - Create `server/src/utils/retry.ts` implementing `withRetry<T>(fn, maxAttempts=3)` with sleep delays 1s/2s/4s
    - Throw `ServiceUnavailableError` after exhausting all attempts
    - _Requirements: 5.7_
  - [x] 2.5 Implement auth guard, rate-limiter, plan guard, and upload middleware
    - Create `server/src/middlewares/authGuard.ts` verifying JWT `Authorization: Bearer` header; attach `req.userId`
    - Create `server/src/middlewares/rateLimiter.ts` using `express-rate-limit`; 100 req/min per IP on auth routes
    - Create `server/src/middlewares/planGuard.ts` querying session count in last 24 h vs `Plan.maxInterviewsPerDay`
    - Create `server/src/middlewares/upload.ts` using `multer` + size check; reject files > 5 MB with 413
    - _Requirements: 14.1, 14.5, 2.6, 11.3_

- [x] 3. Database: Prisma schema, migrations, and seed data
  - [x] 3.1 Define full Prisma schema with all 10 models
    - Write `server/prisma/schema.prisma` with models: `User`, `Plan`, `Session`, `Question`, `Response`, `Report`, `RefreshToken`, `Notification`, `Payment`, `ActivityLog`
    - Define enums `Difficulty`, `InterviewType`, `SessionStatus`
    - Add all relations, indexes on `userId`, `sessionId`, `email`, `shareToken`
    - _Requirements: 1.1, 2.3, 7.1, 10.1, 12.1, 13.3_
  - [x] 3.2 Run initial migration and create seed file
    - Run `prisma migrate dev --name init` to generate SQL migration
    - Create `server/prisma/seed.ts` inserting Plan records: `{ id:"free", name:"Free", maxInterviewsPerDay:5, pdfExportEnabled:false, shareableLinksEnabled:false }` and `{ id:"pro", name:"Pro", maxInterviewsPerDay:9999, pdfExportEnabled:true, shareableLinksEnabled:true }`
    - Add `prisma.seed` script to `package.json`
    - _Requirements: 13.1_

- [x] 4. Authentication service and endpoints
  - [x] 4.1 Implement IAuthService: register, login, logout, refresh
    - Create `server/src/services/AuthService.ts` implementing `IAuthService`
    - `register`: validate DTO with Zod (email, password ≥8 chars, displayName), hash password with bcrypt (rounds=12), create `User` + `RefreshToken`, return `TokenPair`
    - `login`: verify credentials, issue new `TokenPair`, store `RefreshToken`
    - `logout`: set `revokedAt` on `RefreshToken`, clear cookie
    - `refresh`: verify token exists and `revokedAt == null` and not expired; atomically revoke old + issue new `TokenPair`
    - _Requirements: 1.1–1.9_
  - [x] 4.2 Implement forgot/reset password and Google OAuth
    - `forgotPassword`: generate time-limited reset token (1 h), email link via Nodemailer
    - `resetPassword`: validate token, update `passwordHash`, set `revokedAt` on all user `RefreshToken`s
    - `handleGoogleCallback`: exchange code for Google ID token, upsert `User` by `googleId`, issue `TokenPair`
    - _Requirements: 1.6, 1.10, 1.11_
  - [x] 4.3 Wire auth routes to Express router
    - Create `server/src/routes/auth.ts` with POST `/register`, `/login`, `/logout`, `/refresh`, `/google/callback`, `/forgot-password`, `/reset-password`
    - Apply `rateLimiter` to all auth routes
    - _Requirements: 1.1–1.11, 14.5_
  - [ ]* 4.4 Write property tests for auth (P1–P6, P40, P42, P43)
    - **Property 1: Registration produces a valid token pair for any valid input**
    - **Property 2: Passwords shorter than minimum are always rejected**
    - **Property 3: Login produces a valid token pair for any registered user**
    - **Property 4: Refresh token rotation always revokes the old token**
    - **Property 5: Logout always revokes the active Refresh_Token**
    - **Property 6: Password reset invalidates all existing Refresh_Tokens**
    - **Property 40: All protected endpoints require a valid Access_Token**
    - **Property 42: Stored passwords are never plaintext**
    - **Property 43: Rate limiting rejects excess authentication requests**
    - **Validates: Requirements 1.1, 1.3, 1.4, 1.7–1.9, 1.11, 14.1, 14.4, 14.5, 14.7**
  - [ ]* 4.5 Write unit tests for auth service edge cases
    - Test duplicate email returns 409, expired/revoked refresh token returns 401
    - Test Google OAuth creates new user on first call; retrieves existing user on second
    - Test reset token expiry enforced after 1 hour
    - _Requirements: 1.2, 1.5, 1.6, 1.8_

- [x] 5. Interview service and endpoints
  - [x] 5.1 Implement IInterviewService: createSession, startSession, endSession, checkPlanLimits
    - Create `server/src/services/InterviewService.ts`
    - `createSession`: validate `SessionConfig` with Zod (difficulty enum, interviewType enum, questionCount in [3,20], role ≤100 chars, techStack ≥1); call `checkPlanLimits`; persist `Session` with `status="configured"`
    - `startSession`: set `status="active"`; return session with questions placeholder
    - `endSession`: set `status="completed"`, set `completedAt`; trigger async report generation
    - `checkPlanLimits`: count sessions in last 24 h; throw `PlanLimitError` if over limit
    - _Requirements: 2.1–2.6, 4.10, 4.13_
  - [x] 5.2 Wire interview routes to Express router
    - Create `server/src/routes/interview.ts` with POST `/interview/create`, POST `/interview/:id/start`, POST `/interview/:id/end`
    - Apply `authGuard` and `planGuard` to create endpoint
    - _Requirements: 2.1–2.6_
  - [ ]* 5.3 Write property tests for interview service (P7–P10, P12–P14)
    - **Property 7: Incomplete interview configuration is always rejected**
    - **Property 8: Session creation round-trip**
    - **Property 9: Invalid enum values for difficulty and interviewType are always rejected**
    - **Property 10: Free-plan session limit is enforced**
    - **Property 12: Answer submission stores the exact transcript in the Response**
    - **Property 13: Session completion sets status to "completed"**
    - **Property 14: Question count constraints are always enforced**
    - **Validates: Requirements 2.2–2.6, 4.5, 4.10, 4.13**

- [x] 6. Socket.io server: connection auth, event handlers, reconnection
  - [x] 6.1 Bootstrap Socket.io server with JWT auth middleware
    - Create `server/src/socket/index.ts` attaching Socket.io to the HTTP server
    - Add socket middleware verifying `auth.token` from handshake; reject connections without valid token
    - _Requirements: 14.7_
  - [x] 6.2 Implement socket event handlers: ready, answer, endInterview
    - Handle `ready { sessionId }`: call `InterviewService.startSession()`, trigger AI question generation, emit `startInterview` then `question` event with synthesized audio URL
    - Handle `answer { sessionId, questionId, transcript, durationSeconds }`: persist `Response`, emit `thinking { state:"analyzing" }`, call AI evaluation, emit `thinking { state:"followup" }`, generate next question or emit `report` if session complete
    - Handle `endInterview { sessionId }`: call `InterviewService.endSession()`, emit `report { reportId }`
    - _Requirements: 4.1–4.12_
  - [x] 6.3 Implement reconnection logic and session interruption
    - On disconnect: record disconnect timestamp; start 30-second grace timer
    - On reconnect within grace period: resume session, re-emit current question state
    - On grace period expiry: set `Session.status="interrupted"`
    - _Requirements: 4.11_
  - [ ]* 6.4 Write unit tests for socket event handling
    - Test auth rejection on missing/invalid token
    - Test `ready` → `startInterview` → `question` sequence
    - Test reconnection within and beyond 30-second window
    - _Requirements: 4.1, 4.11, 14.7_

- [x] 7. Checkpoint — Ensure database, auth, interview, and socket layers pass all tests
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. AI Engine: adapters, question generation, evaluation, dashboard suggestions
  - [x] 8.1 Implement IAIEngine interface and GeminiClient adapter
    - Create `server/src/services/ai/IAIEngine.ts` with interface
    - Create `server/src/services/ai/GeminiClient.ts` using `@google/generative-ai` SDK
    - Implement `generateQuestion(context)`: build prompt with role, experience, difficulty, interviewType, techStack, language; parse JSON response
    - Implement `evaluateResponse(transcript, context)`: return `Evaluation` with four 0–100 scores, `strengths[]`, `improvements[]`; handle empty transcript with all-zero scores
    - Implement `generateDashboardSuggestions(history)`: return 1–3 suggestion strings
    - Wrap all external calls with `withRetry()` (3 attempts, exponential backoff)
    - _Requirements: 5.1–5.7_
  - [x] 8.2 Implement OpenAIClient adapter
    - Create `server/src/services/ai/OpenAIClient.ts` using `openai` SDK
    - Implement same `IAIEngine` interface methods as GeminiClient
    - Select active client via `config.AI_PROVIDER` env var (`"gemini"` | `"openai"`)
    - _Requirements: 5.1–5.7_
  - [ ]* 8.3 Write property tests for AI engine (P15, P16, P25)
    - **Property 15: AI evaluation always produces valid scores and at least one strength and improvement**
    - **Property 16: AI retry exhaustion returns 503 after exactly 3 attempts**
    - **Property 25: Dashboard AI suggestions count is always between 1 and 3**
    - **Validates: Requirements 5.3, 5.4, 5.7, 8.3**

- [x] 9. Speech service: STT streaming, TTS synthesis, confidence check
  - [x] 9.1 Implement ISpeechService interface and AssemblyAI STT adapter
    - Create `server/src/services/speech/ISpeechService.ts` with interface
    - Create `server/src/services/speech/AssemblyAIClient.ts`
    - Implement `streamTranscription(audioStream, sessionId)`: pipe chunks to AssemblyAI real-time SDK; emit `transcriptChunk` events back through returned `EventEmitter`; tag chunks with `confidence` and `isFinal`
    - Implement `finalizeTranscript(sessionId)`: seal and return complete transcript string
    - Implement `synthesize(text, voice)`: call AssemblyAI TTS or configured provider; return audio URL
    - _Requirements: 6.1–6.5_
  - [x] 9.2 Implement Deepgram STT adapter
    - Create `server/src/services/speech/DeepgramClient.ts` implementing `ISpeechService`
    - Select active adapter via `config.SPEECH_PROVIDER` env var
    - _Requirements: 6.1–6.4_
  - [ ]* 9.3 Write property tests for speech service (P17–P20, P34)
    - **Property 17: Transcription result serialization round-trip**
    - **Property 18: Transcription finalization stores the complete transcript**
    - **Property 19: TTS synthesis always returns a non-empty audio URL**
    - **Property 20: Low-confidence transcription always displays a clarification indicator**
    - **Property 34: Voice preference propagates to all subsequent TTS calls**
    - **Validates: Requirements 6.2, 6.4, 6.5, 6.6, 11.7**

- [x] 10. Report service: async generation, score aggregation, PDF export, share token
  - [x] 10.1 Implement ReportService.generateReport()
    - Create `server/src/services/ReportService.ts`
    - On `Session.status` → `"completed"`, call `generateReport(sessionId)` in a `setImmediate` callback
    - Aggregate `Response` records: compute `overallScore = Math.round(sum(perResponseScores) / n)`; collect all strengths, weaknesses, suggestions; build `timeline` array
    - Handle zero-response sessions: all scores = 0, note "No responses recorded"
    - Persist `Report` record; emit `report { reportId }` via socket
    - _Requirements: 7.1, 7.6, 7.7_
  - [x] 10.2 Implement PDF export endpoint
    - Create `GET /report/:id/pdf` using `pdfkit` or `puppeteer` to render all report sections
    - Enforce `Plan.pdfExportEnabled`; return 403 for free users
    - _Requirements: 7.4, 13.1_
  - [x] 10.3 Implement share token generation and public share endpoint
    - `POST /report/:id/share`: generate `crypto.randomBytes(32).toString('hex')` token; set `shareTokenExpiresAt = now + 7 days`; return URL
    - `GET /shared/:token`: look up token, check expiry, return report without auth
    - Enforce `Plan.shareableLinksEnabled`; return 403 for free users
    - _Requirements: 7.5, 13.1_
  - [x] 10.4 Wire report routes and ownership guard
    - Create `server/src/routes/report.ts` with `GET /report/:id`, `GET /report/:id/pdf`, `POST /report/:id/share`, `GET /shared/:token`
    - Verify `report.session.userId === req.userId` before returning; throw `ForbiddenError` otherwise
    - _Requirements: 7.2, 7.3_
  - [ ]* 10.5 Write property tests for report service (P21–P23)
    - **Property 21: Report generation produces all score components for any completed session**
    - **Property 22: Overall score equals the arithmetic mean of per-response scores**
    - **Property 23: Share token is unique and expires in 7 days**
    - **Validates: Requirements 7.1, 7.5, 7.6**

- [x] 11. Dashboard service and endpoint
  - [x] 11.1 Implement dashboard stats query
    - Create `server/src/services/DashboardService.ts`
    - Query: total completed sessions, average overall score, current streak (consecutive days with ≥1 completed session), weekly chart data (7 days × avg score)
    - Query: 5 most recent completed sessions ordered by `completedAt DESC`
    - Call `AIEngine.generateDashboardSuggestions(recentHistory)` for 1–3 suggestions
    - _Requirements: 8.1–8.3_
  - [x] 11.2 Implement streak computation and milestone notification
    - Compute streak from sorted `completedAt` dates; check if today included
    - If streak reaches 7 days, call `NotificationService.create()` with congratulatory message
    - _Requirements: 8.1, 8.5_
  - [x] 11.3 Wire dashboard route
    - Create `server/src/routes/dashboard.ts` with `GET /dashboard`; apply `authGuard`
    - _Requirements: 8.1–8.4, 8.6_
  - [ ]* 11.4 Write property tests for dashboard (P24, P25)
    - **Property 24: Dashboard always shows exactly the 5 most recent sessions in descending order**
    - **Property 25: Dashboard AI suggestions count is always between 1 and 3**
    - **Validates: Requirements 8.2, 8.3**

- [ ] 12. Analytics service and endpoint
  - [x] 12.1 Implement AnalyticsService aggregation queries
    - Create `server/src/services/AnalyticsService.ts`
    - Group sessions by: weekly periods, monthly periods, target role, difficulty
    - Compute per-group average scores and session counts
    - Compute `totalSessions` and `uniqueRoles` counts
    - Support `startDate` / `endDate` filter passed to Prisma `where` clause
    - _Requirements: 9.1, 9.5, 9.6_
  - [x] 12.2 Wire analytics route
    - Create `server/src/routes/analytics.ts` with `GET /analytics`; apply `authGuard`
    - Accept optional `?startDate=&endDate=` query params; validate as ISO dates
    - _Requirements: 9.1–9.6_
  - [ ]* 12.3 Write property tests for analytics (P26, P27)
    - **Property 26: Date-range filter returns only sessions within the specified range**
    - **Property 27: Analytics aggregate counts are always accurate**
    - **Validates: Requirements 9.5, 9.6**

- [x] 13. History service and endpoints
  - [x] 13.1 Implement paginated history query with search and filters
    - Create `server/src/services/HistoryService.ts`
    - List endpoint: fetch sessions for `req.userId` ordered by `createdAt DESC`; paginate at 20 per page using `skip/take`
    - Role search: case-insensitive substring match via Prisma `contains` + `mode: 'insensitive'`
    - Combined filters: difficulty, interviewType, date range, score range — AND logic in Prisma `where`
    - _Requirements: 10.1–10.3_
  - [x] 13.2 Implement session deletion with cascade
    - `DELETE /history/:sessionId`: verify ownership; delete `Response`, `Question`, `Report`, then `Session` in a transaction
    - _Requirements: 10.5, 10.6_
  - [x] 13.3 Wire history routes
    - Create `server/src/routes/history.ts` with `GET /history`, `DELETE /history/:id`; apply `authGuard`
    - _Requirements: 10.1–10.6_
  - [ ]* 13.4 Write property tests for history (P28–P31)
    - **Property 28: History pagination returns correct page size in descending date order**
    - **Property 29: Role search always returns only matching sessions**
    - **Property 30: Combined filters enforce all criteria simultaneously (AND logic)**
    - **Property 31: Session deletion cascades to all associated records**
    - **Validates: Requirements 10.1–10.3, 10.5**

- [x] 14. User profile and settings service
  - [x] 14.1 Implement profile update and photo upload
    - Create `server/src/services/UserService.ts`
    - `updateProfile`: validate with Zod; update `displayName`, `college`, `yearsOfExperience`, `skills`, `resumeUrl`; return updated user
    - `uploadPhoto`: accept file via `upload` middleware; reject > 5 MB; upload to Cloudinary; store URL in `User.photoUrl`
    - _Requirements: 11.1–11.3_
  - [x] 14.2 Implement settings updates: theme, notifications, voice preference
    - `updateTheme`: persist `themePreference` to DB; return in response
    - `updateNotificationPrefs`: persist `notificationPrefs` JSON to DB
    - `updateVoicePreference`: persist `aiVoicePreference`; subsequent `synthesize()` calls read this value
    - _Requirements: 11.5–11.7_
  - [x] 14.3 Implement account deletion
    - `deleteAccount`: if session is `"active"`, call `endSession()` first; then delete in order: `ActivityLog`, `Notification`, `Payment`, `RefreshToken`, `Response`, `Question`, `Report`, `Session`, `User` in a Prisma transaction
    - Logout user after deletion
    - _Requirements: 11.8, 11.9_
  - [x] 14.4 Wire profile and settings routes
    - Create `server/src/routes/users.ts` with `GET /users/me`, `PUT /users/profile`, `POST /users/photo`, `PUT /users/settings`, `DELETE /users/account`; apply `authGuard`
    - _Requirements: 11.1–11.9_
  - [ ]* 14.5 Write property tests for profile (P32, P33, P35)
    - **Property 32: Profile update round-trip**
    - **Property 33: Profile photos larger than 5 MB are always rejected**
    - **Property 35: Account deletion removes all user data**
    - **Validates: Requirements 11.1, 11.3, 11.8**

- [ ] 15. Notifications service
  - [-] 15.1 Implement NotificationService: create, email dispatch, mark-read
    - Create `server/src/services/NotificationService.ts`
    - `create(userId, type, message, link)`: insert `Notification` record
    - `sendEmail(userId, subject, body)`: check `notificationPrefs.email`; dispatch via Nodemailer if enabled
    - `markRead(notificationId, userId)`: verify ownership; set `read=true`
    - Trigger `create` + `sendEmail` when: report is ready (post-`generateReport`), streak is broken (nightly cron)
    - _Requirements: 12.1–12.4_
  - [~] 15.2 Wire notification routes
    - Create `server/src/routes/notifications.ts` with `GET /notifications`, `PATCH /notifications/:id/read`; apply `authGuard`
    - _Requirements: 12.1–12.4_
  - [ ]* 15.3 Write property tests for notifications (P36, P37)
    - **Property 36: Report-ready event always creates an in-app notification**
    - **Property 37: Marking a notification read decrements the unread count**
    - **Validates: Requirements 12.1, 12.4**

- [ ] 16. Payments service and webhook handler
  - [x] 16.1 Implement PaymentService: checkout initiation and plan activation
    - Create `server/src/services/PaymentService.ts`
    - `createCheckout(userId)`: create a checkout session with the payment provider; return redirect URL
    - `activatePlan(userId)`: update `User.planId = "pro"`; create `Payment` record with status `"active"`
    - _Requirements: 13.2, 13.3_
  - [x] 16.2 Implement webhook handler with signature verification
    - `POST /payments/webhook`: read raw body; verify provider signature using secret from config; on failure return 400, log attempt, do NOT update plan
    - On valid signature: call `activatePlan()`; respond 200 within 60 seconds
    - _Requirements: 13.3, 13.4_
  - [x] 16.3 Implement plan expiry cron job
    - Create `server/src/jobs/planExpiry.ts` using `node-cron` running nightly
    - Query `Payment` records with `status="active"` and expired subscription date; downgrade `User.planId = "free"`; create in-app notification
    - _Requirements: 13.5_
  - [x] 16.4 Wire payment routes
    - Create `server/src/routes/payments.ts` with `POST /payments/checkout`, `POST /payments/webhook` (raw body parser), `GET /payments/plans`
    - _Requirements: 13.1–13.5_
  - [ ]* 16.5 Write property tests for payments (P38, P39)
    - **Property 38: Valid payment webhook creates a Payment record and activates the plan**
    - **Property 39: Invalid payment webhook never updates the user's plan**
    - **Validates: Requirements 13.3, 13.4**

- [x] 17. Checkpoint — Ensure all backend services, routes, and property tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 18. Frontend scaffolding: Vite + React 19, routing, stores, and HTTP client
  - [x] 18.1 Set up Vite + React 19 + TypeScript project with Tailwind and shadcn/ui
    - Configure `client/vite.config.ts` with path aliases (`@/` → `src/`)
    - Install and configure Tailwind CSS v3 with `tailwind.config.ts`
    - Initialize `shadcn/ui` with `npx shadcn-ui@latest init`; install core components: Button, Input, Select, Dialog, Toast, Badge, Avatar, Progress, Card
    - _Requirements: 15.4_
  - [x] 18.2 Configure React Router v6 routes
    - Create `client/src/App.tsx` with `RouterProvider`
    - Public routes: `/`, `/login`, `/register`, `/shared/:token`
    - Protected routes (wrapped in `AuthLayout`): `/dashboard`, `/interview/new`, `/interview/:id/lobby`, `/interview/:id/room`, `/report/:id`, `/analytics`, `/history`, `/profile`, `/settings`
    - Implement `RequireAuth` wrapper that redirects to `/login` if not authenticated
    - _Requirements: 14.1_
  - [x] 18.3 Set up Zustand store slices and TanStack Query
    - Create `client/src/store/authSlice.ts` with `user`, `accessToken`, `isAuthenticated`, `setUser`, `clearAuth`
    - Create `client/src/store/interviewSlice.ts` with `sessionId`, `currentQuestion`, `transcript`, `thinkingState`, `timer`, `setQuestion`, `setThinking`, `appendTranscript`
    - Configure `TanStack Query` client with `QueryClientProvider`; set `staleTime: 30s`, `retry: 2`
    - _Requirements: 4.6, 4.8, 4.9_
  - [x] 18.4 Implement Axios instance with JWT interceptors
    - Create `client/src/lib/axios.ts` with base URL from env; attach `Authorization: Bearer` header from store
    - Add response interceptor: on 401, call `POST /auth/refresh`, retry original request; on second failure, call `clearAuth()` and navigate to `/login`
    - _Requirements: 14.3_

- [x] 19. Frontend: auth pages and API service layer
  - [x] 19.1 Build Login and Register pages
    - Create `client/src/pages/auth/LoginPage.tsx` with email/password form, validation (password ≥8 chars), Google OAuth button, and error toast on 401
    - Create `client/src/pages/auth/RegisterPage.tsx` with display name / email / password fields; show field-level errors from 422 response
    - Create `client/src/services/authService.ts` wrapping all auth API calls
    - _Requirements: 1.1–1.6_
  - [x] 19.2 Build Landing page
    - Create `client/src/pages/LandingPage.tsx` with hero section, feature highlights, plan pricing table (free vs pro), and CTA to register
    - _Requirements: 13.1_

- [x] 20. Frontend: Dashboard, Analytics, History, Profile, Settings pages
  - [x] 20.1 Build Dashboard page
    - Create `client/src/pages/DashboardPage.tsx`
    - Fetch `/dashboard` with TanStack Query; display: total interviews, avg score, streak badge, weekly chart (Recharts `LineChart`), 5 recent sessions table, AI suggestion cards
    - "Quick Start" button navigating to `/interview/new`; show streak-7 congratulatory toast if applicable
    - _Requirements: 8.1–8.5_
  - [x] 20.2 Build Analytics page with three charts
    - Create `client/src/pages/AnalyticsPage.tsx`
    - Line chart: overall score trend across all sessions (Recharts `LineChart`)
    - Radar chart: average scores across 5 dimensions (Recharts `RadarChart`)
    - Pie chart: session distribution by interview type (Recharts `PieChart`)
    - Date-range filter controls; refetch on change
    - _Requirements: 9.1–9.6_
  - [x] 20.3 Build History page with search, filters, pagination, and delete
    - Create `client/src/pages/HistoryPage.tsx`
    - Search input (debounced 300 ms), filters for difficulty / type / date range / score range
    - Paginated table (20/page) with Previous/Next controls; each row shows date, role, difficulty, score
    - "Download Report" triggers PDF endpoint; "Delete" opens confirmation dialog then calls `DELETE /history/:id`
    - _Requirements: 10.1–10.6_
  - [x] 20.4 Build Profile page
    - Create `client/src/pages/ProfilePage.tsx`
    - Display name, college, years of experience, skills chips, resume URL, profile photo with upload button (< 5 MB enforced client-side and server-side)
    - Google account link/unlink button
    - _Requirements: 11.1–11.4_
  - [x] 20.5 Build Settings page
    - Create `client/src/pages/SettingsPage.tsx`
    - Theme toggle (light/dark/system) applying immediately via `data-theme` attribute without page reload
    - Notification preference toggles (in-app, email)
    - AI voice preference selector
    - Account deletion button with two-step confirmation dialog
    - _Requirements: 11.5–11.9_

- [x] 21. Frontend: Create Interview multi-step form
  - [x] 21.1 Build multi-step interview configuration form
    - Create `client/src/pages/interview/CreateInterviewPage.tsx` with 3 steps:
    - Step 1: role (text, max 100), years of experience (0–30), language selector
    - Step 2: difficulty (Easy/Medium/Hard), interview type (Technical/Behavioral/Mixed), question count (3–20, default 8)
    - Step 3: tech stack multi-select from predefined list
    - Highlight missing fields inline; prevent step advance on invalid fields
    - On submit: `POST /interview/create`; navigate to `/interview/:id/lobby`
    - _Requirements: 2.1–2.5_

- [x] 22. Frontend: Lobby page with device checks
  - [x] 22.1 Build Lobby page with camera/microphone/speaker/internet checks
    - Create `client/src/pages/interview/LobbyPage.tsx`
    - Request `getUserMedia({ video: true, audio: true })`; show live camera preview within 2 s of grant; show descriptive error and disable "Ready" button on denial
    - Run internet speed check on load; display result in Mbps; show warning banner if < 1 Mbps
    - Speaker test button: play short audio sample; ask user to confirm
    - "Ready" button: enabled only when all checks pass; emit `ready { sessionId }` via Socket.io on click; navigate to `/interview/:id/room`
    - _Requirements: 3.1–3.6_
  - [ ]* 22.2 Write property test for lobby speed check (P11)
    - **Property 11: Low connection speed always triggers a warning**
    - **Validates: Requirements 3.4**

- [x] 23. Frontend: Interview Room page
  - [x] 23.1 Build Interview Room layout with socket event listeners
    - Create `client/src/pages/interview/RoomPage.tsx`
    - Connect to Socket.io server on mount with `auth: { token: accessToken }`
    - Listen to: `startInterview`, `question`, `thinking`, `nextQuestion`, `report`, `error` events; update Zustand `interviewSlice` accordingly
    - Play question audio via `<audio>` element; display question text simultaneously
    - _Requirements: 4.1–4.2_
  - [x] 23.2 Implement countdown timer, transcript display, and answer submission
    - Countdown timer starting at `timeLimit` (default 120 s); decrement every second; auto-submit on expiry
    - Live transcript area updated by `appendTranscript` as `transcriptChunk` events arrive
    - "Submit Answer" button: emit `answer` event with transcript and duration; pause timer
    - Show low-confidence indicator when `confidence < 0.6` on incoming chunk
    - _Requirements: 4.3–4.5, 6.5_
  - [x] 23.3 Implement Thinking Overlay and AI state indicators
    - Create `client/src/components/interview/ThinkingOverlay.tsx`
    - Map `thinkingState`: `"analyzing"` → "Analyzing answer...", `"followup"` → "Finding follow-up question...", `"feedback"` → "Generating feedback..."
    - Overlay dims the room UI and shows animated indicator while active
    - _Requirements: 4.6–4.9_
  - [x] 23.4 Implement controls: mute/unmute, camera toggle, leave confirmation
    - Mute/unmute microphone toggle starts/stops `streamTranscription`
    - Camera on/off toggle stops/starts `video` track from `getUserMedia`
    - Leave button opens confirmation dialog; on confirm emit `endInterview` and navigate to dashboard
    - _Requirements: 4.12_

- [x] 24. Frontend: Report page
  - [x] 24.1 Build Report page with all sections
    - Create `client/src/pages/ReportPage.tsx`
    - Poll `GET /report/:id` every 3 s until report is available (max 30 s); show loading skeleton
    - Display: overall score ring, five score bars, strengths list, weaknesses list, improvement suggestions, Q&A timeline with per-question scores, full transcript
    - "Download PDF" button → `GET /report/:id/pdf`; show 403 toast for free users
    - "Share Report" button → `POST /report/:id/share`; copy URL to clipboard; show 403 toast for free users
    - _Requirements: 7.1–7.5, 13.1_

- [x] 25. Frontend: graceful degradation UI
  - [x] 25.1 Implement error toasts and graceful failure UI
    - Create `client/src/components/ErrorToast.tsx` using shadcn/ui `Toast`; call from Axios interceptor for 5xx responses
    - Interview Room: on AI service error toast "AI service temporarily unavailable. Please try again."
    - Interview Room: on STT provider error show manual text input textarea as fallback; disable microphone button
    - Interview Room: on TTS synthesis error display question text only; suppress audio error
    - Cloudinary upload failure: show error message; keep existing photo unchanged
    - _Requirements: 15.5_
  - [ ]* 25.2 Write property test for graceful degradation (P45)
    - **Property 45: Third-party service failures are surfaced gracefully without crashing**
    - **Validates: Requirements 15.5**

- [x] 26. Checkpoint — Ensure all frontend pages render correctly and component tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 27. Frontend unit tests
  - [ ]* 27.1 Write unit tests for Lobby, Interview Room, Report, Dashboard, Analytics, History pages
    - `LobbyPage.test.tsx`: permission states, speed warning, speaker test, Ready button enable/disable
    - `InterviewRoom.test.tsx`: timer counts down, transcript appends, thinking overlay states, manual text fallback visibility
    - `ReportPage.test.tsx`: loading state, score display, share and PDF buttons (pro vs free behavior)
    - `DashboardPage.test.tsx`: stats display, 5 recent sessions, Quick Start button, streak-7 toast
    - `AnalyticsPage.test.tsx`: chart rendering, date filter triggers refetch
    - `HistoryPage.test.tsx`: search debounce, filter combos, pagination, delete confirmation flow
    - _Requirements: 3.1–3.6, 4.1–4.12, 7.1–7.5, 8.1–8.5, 9.1–9.6, 10.1–10.6_

- [ ] 28. Integration and cross-cutting property tests
  - [-] 28.1 Write integration test: full session flow
    - Create `server/src/__tests__/integration/session-flow.integration.test.ts`
    - Seed test DB; run: register user → create session → start (socket `ready`) → submit 3 answers → end → poll report endpoint until ready
    - Assert `Report.overallScore` equals arithmetic mean of response scores
    - _Requirements: 7.1, 7.6_
  - [-] 28.2 Write integration test: socket reconnection
    - Create `server/src/__tests__/integration/socket.integration.test.ts`
    - Simulate disconnect during active session; reconnect within 30 s; assert session still `"active"`
    - Simulate disconnect and no reconnect for 31 s; assert session `"interrupted"`
    - _Requirements: 4.11_
  - [-] 28.3 Write integration test: payment webhook end-to-end
    - Create `server/src/__tests__/integration/payments.integration.test.ts`
    - POST to `/payments/webhook` with valid signature; assert `Payment` record created and `User.planId = "pro"`
    - POST with invalid signature; assert `User.planId` unchanged and 400 returned
    - _Requirements: 13.3, 13.4_
  - [ ]* 28.4 Write remaining cross-cutting property tests (P11, P41, P44, P45)
    - **Property 11: Low connection speed always triggers a warning** — in `lobby.property.test.ts`
    - **Property 41: Cross-user data access is always forbidden** — in `auth.property.test.ts`
    - **Property 44: Unhandled server exceptions return 500 and server remains operational** — in `server.property.test.ts`
    - **Property 45: Third-party service failures are surfaced gracefully** — in `resilience.property.test.ts`
    - **Validates: Requirements 3.4, 7.3, 10.6, 14.2, 15.3, 15.5**

- [ ] 29. Deployment configuration
  - [-] 29.1 Create Vercel configuration for frontend
    - Create `client/vercel.json` with `rewrites: [{ "source": "/(.*)", "destination": "/index.html" }]` for SPA routing
    - Add `VITE_API_URL`, `VITE_SOCKET_URL`, `VITE_GOOGLE_CLIENT_ID` to `.env.example`
    - _Requirements: 15.4_
  - [ ] 29.2 Create Railway/Render configuration for backend
    - Create `server/Dockerfile` with multi-stage build: `npm ci`, `npx prisma generate`, `npm run build`; expose port from `config.PORT`
    - Create `server/railway.json` or `server/render.yaml` specifying start command: `node dist/server.js`
    - _Requirements: 15.1_
  - [~] 29.3 Document all environment variables
    - Create `ENV_VARS.md` at repository root listing every required env var with description, example value, and which service it belongs to (DB, AI, Speech, Cloudinary, JWT, OAuth, Payment, Email)
    - _Requirements: 15.1_

- [~] 30. Final checkpoint — All tests pass, lint clean, build succeeds
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Property tests use `fast-check` with `numRuns: 100`; tagged with `[P<N>]` for traceability
- Checkpoints at tasks 7, 17, 26, and 30 ensure incremental validation
- AI provider and Speech provider are swappable via `AI_PROVIDER` and `SPEECH_PROVIDER` env vars
- PDF export and shareable links are pro-only; plan enforcement is at middleware and service layer
- The nightly `node-cron` job handles both streak-broken notifications and plan expiry


## Task Dependency Graph

```json
{
  "waves": [
    {
      "id": 0,
      "tasks": ["2.1", "3.1"]
    },
    {
      "id": 1,
      "tasks": ["2.2", "2.4", "3.2"]
    },
    {
      "id": 2,
      "tasks": ["2.3", "2.5", "18.1"]
    },
    {
      "id": 3,
      "tasks": ["4.1", "5.1", "6.1", "18.2", "18.3"]
    },
    {
      "id": 4,
      "tasks": ["4.2", "4.3", "5.2", "6.2", "18.4"]
    },
    {
      "id": 5,
      "tasks": ["4.4", "4.5", "5.3", "6.3", "8.1", "9.1"]
    },
    {
      "id": 6,
      "tasks": ["6.4", "8.2", "9.2", "10.1"]
    },
    {
      "id": 7,
      "tasks": ["8.3", "9.3", "10.2", "10.3", "11.1", "12.1"]
    },
    {
      "id": 8,
      "tasks": ["10.4", "10.5", "11.2", "11.3", "12.2", "12.3", "13.1", "14.1"]
    },
    {
      "id": 9,
      "tasks": ["11.4", "13.2", "13.3", "14.2", "14.3", "15.1", "16.1"]
    },
    {
      "id": 10,
      "tasks": ["13.4", "14.4", "14.5", "15.2", "15.3", "16.2", "16.3"]
    },
    {
      "id": 11,
      "tasks": ["16.4", "16.5", "19.1", "19.2"]
    },
    {
      "id": 12,
      "tasks": ["20.1", "20.2", "20.3", "20.4", "20.5", "21.1"]
    },
    {
      "id": 13,
      "tasks": ["22.1", "24.1"]
    },
    {
      "id": 14,
      "tasks": ["22.2", "23.1"]
    },
    {
      "id": 15,
      "tasks": ["23.2", "23.3"]
    },
    {
      "id": 16,
      "tasks": ["23.4", "25.1"]
    },
    {
      "id": 17,
      "tasks": ["25.2", "27.1"]
    },
    {
      "id": 18,
      "tasks": ["28.1", "28.2", "28.3"]
    },
    {
      "id": 19,
      "tasks": ["28.4", "29.1", "29.2"]
    },
    {
      "id": 20,
      "tasks": ["29.3"]
    }
  ]
}
```
