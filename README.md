# GoalPilot

**One app for goals, tasks, habits, and an AI that actually knows your schedule.**

I built this because every productivity app I tried either did too much or too little. GoalPilot keeps it focused — you set what you want to achieve, and the AI helps you get there without getting in the way.

---

## What it does

- **AI Coach** — chat with an assistant that has full context of your goals, pending tasks, and habits. It suggests actions (create task, delete goal, mark done) — but nothing happens until *you* confirm it.
- **Daily Planner** — hit generate, get a smart schedule for the day built from your actual backlog. Overdue stuff shows up first.
- **Goal → Task linking** — break goals into tasks, track progress automatically as tasks complete.
- **Habit tracker** — daily check-ins, streak tracking, calendar view.
- **Notes** — write, pin, and get AI summaries of anything.
- **Productivity Insights** — weekly breakdown of what you actually got done.

---

## Tech

| | |
|---|---|
| Frontend | React 18 + Vite, Framer Motion |
| Backend | Node.js + Express |
| Database | MongoDB Atlas |
| AI | Groq (LLaMA 3.1 8B) |
| Auth | JWT + bcryptjs |
| Validation | Zod |
| Security | Helmet, rate limiting, NoSQL sanitization |

---

## Run it locally

You'll need Node 18+, a MongoDB Atlas cluster (free tier), and a Groq API key from [console.groq.com](https://console.groq.com).

```bash
git clone https://github.com/jayshah161204/GoalPilot.git
cd GoalPilot
```

**Backend**
```bash
cd backend
npm install
cp .env.example .env   # fill in your keys
npm run dev            # runs on :5000
```

**Frontend**
```bash
cd frontend
npm install
npm run dev            # runs on :5173
```

Open `http://localhost:5173`, create an account, and you're in.

---

## .env setup

```env
MONGODB_URI=your_atlas_connection_string
GROQ_API_KEY=your_groq_key
JWT_SECRET=anything_long_and_random
PORT=5000
CORS_ORIGIN=http://localhost:5173
NODE_ENV=development
```

---

## How the backend is structured

```
backend/
├── middleware/    auth, input validation (Zod), error handler, rate limiter
├── models/        Mongoose schemas — User, Task, Goal, Habit, Note, Session
├── routes/        thin route files, business logic stays out of here
├── utils/         AppError, asyncHandler, Groq client wrapper
└── validators/    Zod schemas, one file per resource
```

A few things worth noting:
- Every route validates input with Zod before touching the DB
- The AI can *suggest* actions but a confirm step is always required — nothing mutates silently
- AI suggestions are cross-checked against real DB IDs so hallucinated IDs never cause writes
- Compound indexes on all frequently queried fields

---

## Folder overview

```
GoalPilot/
├── backend/
└── frontend/
    └── src/
        ├── api/         axios layer, one function per endpoint
        ├── components/  FloatingAssistant, SessionSuggestions
        ├── context/     toast + undo system
        ├── pages/       Dashboard, Tasks, Goals, Habits, Notes, Planner, Chat
        └── utils/       constants, date helpers, error formatters
```

---

Built by [Jay Shah](https://github.com/jayshah161204)
