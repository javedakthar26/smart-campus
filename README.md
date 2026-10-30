# 🎓 Smart Campus

A full-stack **Smart Campus** web application with role-based access for **Admin, Teacher, Student and Parent**, a colorful multi-theme UI, and an built-in **AI Assistant**, **auto-generated Report Cards** and an **AI Study Plan Generator**.

## ✨ Features

| Module | Description |
|--------|-------------|
| 🔐 Role-based Login | Separate secure login & dashboard for Admin / Teacher / Student / Parent (scrypt-hashed passwords + HttpOnly session cookie) |
| 🛡️ Admin Dashboard | Campus-wide stats, student management, classes & subjects, enrollment control |
| 📚 Teacher Dashboard | Enter marks, take daily attendance, view class performance |
| 🎒 Student Dashboard | Personal profile, grades, attendance %, report cards, AI help |
| 👨‍👩‍👧 Parent Portal | Track your child's attendance, marks and progress |
| 🤖 AI Assistant | Chat assistant that answers queries about students, attendance, enrollment and report cards |
| 📄 Auto Report Cards | One-click auto-generated report cards with percentage, grade, GPA and remarks |
| 🗓️ Study Plan Generator | AI-powered personalized study plans based on weak subjects |
| 🌈 Colorful UI/UX | Every role gets a distinct gradient theme (violet, emerald, amber, rose) built with Tailwind + shadcn/ui |

## 🛠️ Tech Stack

- **Framework:** Next.js 16 (App Router) + React 19 + TypeScript
- **Styling:** Tailwind CSS 4 + shadcn/ui + Framer Motion
- **Database:** SQLite via Prisma ORM
- **AI:** z-ai-web-dev-sdk (chat completions)
- **Runtime:** Bun / Node.js

## 🚀 Getting Started

```bash
# 1. Install dependencies
bun install        # or: npm install

# 2. Configure the database
cp .env.example .env   # if provided, else set DATABASE_URL="file:./dev.db"
bunx prisma db push

# 3. Seed demo data (users, classes, subjects, marks, attendance)
bun prisma/seed.ts

# 4. Start the dev server
bun run dev        # or: npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🔑 Demo Accounts

Click any role card on the login screen to auto-fill credentials.

| Role | Email | Password |
|------|-------|----------|
| 🛡️ Admin | `admin@campus.edu` | `Admin@123` |
| 📚 Teacher | `teacher@campus.edu` | `Teacher@123` |
| 🎒 Student | `student@campus.edu` | `Student@123` |
| 👨‍👩‍👧 Parent | `parent@campus.edu` | `Parent@123` |

More demo users: `michael@campus.edu` (Teacher), `priya@ / rohan@ / sara@ / dev@ / maya@campus.edu` (Students) — same password pattern per role.

## 📁 Project Structure

```
src/
├── app/
│   ├── api/              # REST API (auth, students, attendance, marks, AI chat...)
│   └── page.tsx          # App entry
├── components/
│   ├── campus/           # Login, dashboards, AI assistant, report card, study plan
│   └── ui/               # shadcn/ui components
└── lib/                  # Auth, DB client, AI helpers, theme config
prisma/
├── schema.prisma         # Data model (User, Student, Teacher, Parent, Class, Subject, Mark, Attendance...)
└── seed.ts               # Demo data seeder
```

## 📄 License

MIT — free to use for learning and projects.
