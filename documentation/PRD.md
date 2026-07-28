# Product Requirements Document — ExamHub (Online Examination System Rewrite)

| | |
|---|---|
| **Status** | Implemented (v1.0) |
| **Owner** | Signity Solutions |
| **Last updated** | 2026-07-28 |
| **Location** | `Exam_System/webapp/` |

---

## 1. Background & Problem Statement

The original **HS-Examination System** (root of this repo) is a 2014-era PHP application built on
the deprecated `mysql_*` API. It cannot run on any modern PHP install and, on inspection, carried a
number of serious defects:

- **~41 SQL query sites, 100% raw string concatenation, zero prepared statements** — a broad SQL
  injection surface, worst in `viewresult.php` (multiple queries built from an unescaped, unquoted
  `$_REQUEST['details']`, including a second-order injection risk where the "correct answer" was
  stored as a literal column name and spliced into a dynamically built query).
- **Passwords "encrypted" with MySQL `ENCODE()`/`DECODE()`** using a hardcoded key — reversible,
  not real hashing. `editprofile.php` even decoded and redisplayed the plaintext password in the
  edit form.
- **Two IDOR (Insecure Direct Object Reference) bugs** (`editprofile.php`, `stdtest.php`) where the
  student ID used in an `UPDATE` came from a raw client-supplied field instead of the session.
- **The `admin/` and `tc/` (study-center) sections were empty shells** — those roles and their UIs
  were never actually built. All test/question/subject authoring had to happen via direct database
  manipulation.
- **UI was 100% table-based XHTML with zero responsive design**; one page navigated via an HTML
  `<map>` image-map over a background image that no longer exists on disk; all decorative images
  were broken; the exam timer was enforced only loosely (client-side, with a MySQL `CREATE EVENT`
  as a soft backstop).
- **Practice tests were a wholly separate, hardcoded 2-question engine**, duplicating the real
  DB-driven exam flow instead of reusing it.

**Decision:** rather than patch the legacy PHP in place, the system was rebuilt from scratch as a
modern full-stack application (Node.js/Express + React), living alongside the untouched legacy
files in `webapp/`, with a "vibrant dashboard" visual redesign and the previously-missing
admin/study-center panels built out for the first time.

---

## 2. Goals

1. Preserve every real user-facing capability of the legacy system (student registration, login,
   browsing/starting/resuming tests, taking an exam with a timer, reviewing answers, submitting,
   and viewing results).
2. Build the admin and study-center experiences that never existed, so tests/questions/subjects
   can be authored and reported on without touching the database directly.
3. Structurally eliminate the legacy security defects (SQL injection, IDOR, reversible password
   "encryption", client-trusted exam timing) rather than patching around them.
4. Deliver a modern, responsive, "vibrant dashboard" visual identity in place of the 2014 table-based
   XHTML UI.
5. Make the exam timer **server-authoritative**: the client display is cosmetic only, and the
   server independently enforces and finalizes attempts once time is up.

## 3. Non-Goals (out of scope for v1)

- Migrating any legacy production data (none was accessible/exported from the original project —
  this is a fresh build with seed data, not a data migration).
- Payment, proctoring/webcam features, or anti-cheating beyond a single-attempt-per-test limit.
- Native mobile apps (the web UI is responsive, not a separate mobile client).
- Multi-language / i18n support.
- A separate "acknowledgement" interstitial screen between submit and results (see §9, Known
  Deviations) — merged into a direct redirect for v1.

---

## 4. User Roles & Personas

| Role | Description | Legacy equivalent |
|---|---|---|
| **Student** | Registers, takes tests/practice tests, views results, edits own profile | `student` table, `index.php`/`stdtest.php`/etc. |
| **Admin** | Authors subjects, tests, and questions; publishes tests; views platform-wide stats | `admin/` (existed only as an empty folder) |
| **Study Center** | Read-only oversight: student roster, per-test score reports/distribution charts | `tc/` (existed only as an empty folder) |

---

## 5. Functional Requirements

### 5.1 Authentication & Account Management
- FR-1: Any user (student/admin/study-center) signs in through a single login page; role is
  determined server-side from the account, not selectable by the client.
- FR-2: Students can self-register (name, email, password, contact info).
- FR-3: Passwords are hashed with bcrypt; never stored or returned in a reversible form.
- FR-4: Login is rate-limited (10 attempts / 15 minutes / IP) to blunt brute-force attempts.
- FR-5: Students can view and edit their own profile (name, contact info, address, city, pincode,
  password). The account being edited is always derived from the authenticated session — never
  from a client-supplied ID.

### 5.2 Student — Test Discovery & Taking
- FR-6: Students see only tests that are published, currently within their availability window,
  and not already attempted.
- FR-7: Starting a test requires the correct test code (validated server-side only; the code is
  never sent to the client in list views).
- FR-8: A test attempt has a single, server-computed deadline (`start time + duration`), stored
  once and never recalculated from client input.
- FR-9: Students can navigate question-to-question, select/change an answer, mark a question for
  review, and view a summary grid of all questions' answer state (unanswered / answered / marked
  for review).
- FR-10: Students can resume an in-progress attempt (e.g., after closing the browser) and see the
  correctly reduced remaining time.
- FR-11: On final submit (or on timeout), the attempt is scored from currently-saved answers and
  locked — no further edits are possible.
- FR-12: A "practice test" is functionally identical to a real test (same engine, same UI), flagged
  so students understand it's a low-stakes warm-up; it is not a separate/duplicated code path.
- FR-13: Students can view a list of completed tests with score/percentage, and drill into any one
  for a full per-question breakdown (their answer, the correct answer, marks awarded).

### 5.3 Server-Authoritative Exam Timer
- FR-14: The server, not the client, is the sole authority on whether an attempt's time has
  expired. Every attempt-related request re-checks the deadline before acting.
- FR-15: If a request arrives after the deadline, the server finalizes the attempt as `EXPIRED`
  (scored from whatever was saved) as a side effect of that request, before returning an error to
  the client.
- FR-16: A background sweep (every 60s) finalizes any abandoned in-progress attempts whose deadline
  has passed, even with no further client requests.
- FR-17: The client's visible countdown is a display only, corrected for clock skew against the
  server's clock at load time; it never independently ends an attempt.

### 5.4 Admin
- FR-18: Admins can create, rename, and delete subjects.
- FR-19: Admins can create, edit, and delete tests (name, description, code, subject, duration,
  availability window, practice flag).
- FR-20: Admins can add, edit, and delete questions and their answer options for a test. Options
  are not limited to a fixed count (legacy hard-capped at 4; a question may have any number ≥ 2).
- FR-21: A test cannot be published until it has at least one question.
- FR-22: Admins can view aggregate counts (subjects, tests, published tests, students) on a
  dashboard.

### 5.5 Study Center
- FR-23: Study-center users can view the full student roster with per-student attempt counts.
- FR-24: Study-center users can view a table of completed attempts, filterable by test/student.
- FR-25: Study-center users can view a per-test score distribution chart and average score.

---

## 6. Non-Functional Requirements

| Category | Requirement |
|---|---|
| **Security** | All database access via parameterized queries (Prisma) — no string-concatenated SQL anywhere. All user/role identity derived from a verified JWT, never from client-supplied IDs. Passwords hashed with bcrypt. Security headers via Helmet. Rate limiting on auth endpoints. |
| **Reliability** | Exam timing enforcement must not depend on the client remaining connected or honest. |
| **Performance** | Single-page app with client-side routing; API responses scoped to what each page needs (no over-fetching of full test/question banks to students). |
| **Usability** | Responsive layout (desktop sidebar / mobile header), light & dark theme support, toast notifications in place of blocking `alert()` popups, clear visual state for answered/unanswered/marked questions. |
| **Maintainability** | TypeScript across both frontend and backend; normalized relational schema (no more "answer stored as a column name string"); a single ORM-managed schema file as living documentation. |

---

## 7. System Architecture (Summary)

- **Backend:** Node.js + Express + TypeScript, REST API under `/api`, Prisma ORM.
- **Database:** SQLite for local development via Prisma (zero external services to install);
  swappable to MySQL/Postgres by changing the Prisma datasource — no application code changes
  required.
- **Auth:** JWT in an httpOnly, `SameSite=Strict` cookie.
- **Frontend:** React + Vite + TypeScript, Tailwind CSS, TanStack Query for server state, React
  Router, Recharts for score visualizations.

### 7.1 Data Model (high level)

`User (role: STUDENT|ADMIN|STUDY_CENTER)` · `Subject` · `Test` · `Question` · `Option` ·
`Attempt (status: IN_PROGRESS|SUBMITTED|EXPIRED)` · `Answer (state: UNANSWERED|ANSWERED|MARKED_FOR_REVIEW)`

This replaces the legacy `student` / `test` / `question` (with `optiona`..`optiond` columns) /
`studenttest` / `studentquestion` tables — normalizing answer options into their own table and
replacing "correct answer stored as a column-name string" with a real foreign key
(`Answer.selectedOptionId → Option.id`, correctness = `Option.isCorrect`).

### 7.2 API Surface (high level)

`/api/auth/*` (register, login, logout, me) · `/api/students/me` · `/api/subjects` ·
`/api/tests/*` (+ `/publish`, `/:id/start`) · `/api/questions/*` · `/api/options/*` ·
`/api/attempts/*` (in-progress, resume, question fetch, answer, summary, submit) ·
`/api/results/*` · `/api/studycenter/*`

---

## 8. Legacy Vulnerability → Fix Mapping

| Legacy issue | File(s) | Resolution in v1 |
|---|---|---|
| SQL injection via raw string concatenation | All 13 legacy PHP files | 100% Prisma parameterized queries |
| Second-order SQLi via dynamic `select <columnname>` | `viewresult.php` | Normalized `Option` table; correctness via FK, never a dynamic query |
| IDOR — student ID taken from client field | `editprofile.php`, `stdtest.php` | Student identity always derived from the verified JWT; no endpoint accepts a caller-supplied user ID for self-service actions |
| Reversible password "encryption" | `register.php`, `editprofile.php`, `stdtest.php`, `resumetest.php` | bcrypt hashing; password never returned to the client |
| Client-trusted exam timer | `cdtimer.js` + MySQL `CREATE EVENT` | Server-computed, server-enforced deadline; periodic sweep backstop |
| No rate limiting on login | `index.php` | `express-rate-limit` on `/api/auth/login` and `/api/auth/register` |
| DB error messages echoed to browser | `register.php`, `editprofile.php`, `viewresult.php` | Errors logged server-side only; generic messages returned to clients |

---

## 9. Known Deviations from the Legacy Flow

- **Acknowledgement screen removed:** the legacy `testack.php` showed a standalone "Acknowledgement"
  banner page between final submit and the results view. v1 redirects straight from submit to the
  result detail page. No scoring/data behavior is affected — this is a one-click UX simplification,
  and can be reintroduced as a discrete step if desired.
- **Study-center scope is assumed:** the legacy `tc/` folder never contained any implementation, so
  its intended scope was inferred (read-only roster + reporting) rather than ported from working
  code. This should be confirmed against real business requirements if they differ.

---

## 10. Success Metrics

- Zero SQL-injection or IDOR findings on a follow-up security review.
- All three roles (student, admin, study-center) can complete their full workflow without any
  direct database access.
- An exam attempt is reliably finalized (scored, locked) once its time limit passes, even if the
  student's browser is closed before that happens.
- App runs on a fresh machine with only Node.js installed (no MySQL/PHP dependency for local dev).

## 11. Open Questions

- Should study-center accounts be scoped to a specific physical center (roster limited to their
  own enrolled students), or is platform-wide visibility intended? v1 currently grants full
  visibility to all students/attempts.
- Should the legacy's "Acknowledgement" interstitial be reinstated as an explicit step?
- Target production database (MySQL/Postgres) and hosting environment are not yet decided —
  SQLite is a development-only choice.
