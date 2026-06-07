# PrepRoute — Test Management Application

A test management web app for administrators to create, manage, and publish tests. Built with Vite + React 18 + TypeScript.

---

## Features

- **Login** — JWT-based authentication with token persistence
- **Dashboard** — list all tests with type/status/difficulty badges; edit, preview, or delete from the table
- **Create Test** — multi-tab form (Chapter Wise / PYQ / Mock Test) with subject → topic → sub-topic cascading selects, marking scheme, and difficulty
- **Add Questions** — split-panel MCQ editor with option management (add/remove/re-enable options), solution field, and a live question list
- **Preview & Publish** — full test overview with an expandable question accordion; publish immediately or schedule with a custom duration window
- **Test Tracking** — live-test monitoring with remaining time display
- **Dark / Light mode** — persistent toggle stored in `localStorage`; semantic colors via CSS custom properties so the whole UI adapts automatically
- **User dropdown** — click the avatar to see your profile info and sign out

---

## Tech Stack

| Library | Role |
|---|---|
| Vite + React 18 + TypeScript | Build tooling, UI, strict typing |
| Zustand + persist middleware | Auth token, current test draft, question list — all persisted to `localStorage` |
| TanStack Query v5 | Server state caching, loading/error states, automatic invalidation |
| React Hook Form + Zod | Schema-validated forms with zero re-render overhead |
| Tailwind CSS v3 | Utility-first styling with CSS variable–based dark mode tokens |
| Axios | Auth interceptor (token injection, 401 redirect) |
| React Router v6 | Nested layouts via `<Outlet>` |
| Lucide React | Icon set |

---

## Getting Started

```bash
cd preproute-app
npm install
npm run dev
```

Open **http://localhost:5173**

**Test credentials**
```
User ID:  vedant-admin
Password: vedant123
```

**Production build**
```bash
npm run build   # outputs to dist/
npm run preview # preview the build locally
```

---

## Project Structure

```
src/
├── api/
│   ├── axios.ts          # Axios instance — auth header + 401 redirect
│   ├── auth.ts
│   ├── subjects.ts       # Subjects, topics, sub-topics endpoints
│   ├── tests.ts
│   └── questions.ts      # Bulk create endpoint
│
├── components/
│   ├── layout/
│   │   ├── AppLayout.tsx # Root layout — sidebar + header + <Outlet>
│   │   ├── Header.tsx    # Breadcrumbs, dark mode toggle, notification bell, user dropdown
│   │   └── Sidebar.tsx   # Collapsible nav with logo → dashboard link
│   └── ui/
│       ├── Button.tsx
│       ├── Input.tsx
│       ├── Select.tsx    # Custom multi-select dropdown
│       ├── Badge.tsx
│       ├── Modal.tsx
│       ├── Toast.tsx     # Top-right toast with auto-dismiss
│       ├── Spinner.tsx
│       └── SpinnerInput.tsx
│
├── pages/
│   ├── Login.tsx
│   ├── Dashboard.tsx
│   ├── CreateTest.tsx    # Used for both create and edit (modal-compatible)
│   ├── AddQuestions.tsx
│   ├── Preview.tsx
│   └── TestTracking.tsx
│
├── store/
│   ├── authStore.ts      # token + user, persisted
│   ├── themeStore.ts     # dark boolean, persisted
│   ├── testStore.ts      # currentTest + question draft list
│   └── notificationStore.ts
│
├── types/index.ts        # Shared interfaces (User, Test, Question, …)
├── hooks/useAuth.ts
└── router/ProtectedRoute.tsx
```

---

## API

**Base URL:** `https://admin-moderator-backend-staging.up.railway.app/api`

Every request automatically receives `Authorization: Bearer <token>` via Axios interceptor. A 401 response clears the token and redirects to `/login`.

**Question submission flow:**
1. Questions are drafted locally in Zustand across the Add Questions page
2. On "Next", new questions are sent via `POST /questions/bulk`
3. The returned IDs are patched onto the test with `PUT /tests/:id`
4. Existing questions (already have IDs) are preserved and not re-created

**Subject / topic cascade:**
- Subjects → `GET /subjects`
- Topics by subject → `GET /topics/subject/:subjectId`
- Sub-topics by topics → `POST /sub-topics/multi-topics`

Subject and topic data is cached for 5 minutes via TanStack Query `staleTime`.

---

## Dark Mode

Semantic colors (`text-text-primary`, `border-border`, `bg-primary-light`, etc.) are backed by CSS custom properties defined in `src/index.css`. Toggling the `dark` class on `<html>` switches all values at once — no need for `dark:` overrides on every element.

```css
:root {
  --color-primary: 91 107 245;
  --color-primary-light: #EEF0FE;
  --color-text-primary: #1A1A2E;
  --color-text-secondary: #6B7280;
  --color-border: #E5E7EB;
}

html.dark {
  --color-primary-light: #1e2651;
  --color-text-primary: #F1F5F9;
  --color-text-secondary: #9CA3AF;
  --color-border: #374151;
}
```

The theme preference is stored in `localStorage` and rehydrated before first paint.
