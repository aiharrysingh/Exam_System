# Legacy "Online Examination System" (OES) — Reference Context

This document captures everything learned from the original legacy PHP project before its
source files were removed from this repository. The legacy files themselves (root-level PHP
files and the `OES/` reference folder) have been deleted to declutter the repo now that
`webapp/` is the actively developed system — this document, plus the raw assets preserved in
`documentation/legacy-reference/`, is the permanent record of what they contained and why
certain design decisions in `webapp/` were made the way they were.

For how the *new* system is designed, see `documentation/PRD.md`. This document is about the
*old* system only.

---

## 1. Provenance

- **Project name:** Online Examination System (OES) — tagline "...because Examination Matters"
- **Release:** OES-without-Installer-v.1.1, dated 12 July 2010, "Alpha Testing" phase
- **Author:** HarMeeT SinGh (dedicated to his mother, Smt. Kalpana Baddi)
- **License:** GNU General Public License v.3
- **Default original admin credentials:** username `root`, password `root` (MD5-hashed in `adminlogin.admpassword`)
- **Original access paths:** admin at `/oes/admin/index.php`, test conductor at `/oes/tc/index.php`, student at `/oes/index.php`

Two copies of this project existed in this working directory over the course of the rewrite:
1. A **corrupted copy** at the repo root — missing the entire `admin/` and `tc/` implementations
   (only empty folders with an unused `img/` subfolder each), missing all image assets, and
   missing the SQL schema dump. The initial rewrite (`webapp/`) was built by reverse-engineering
   this corrupted copy's student-facing PHP files, which meant the admin/study-center roles had
   to be *guessed* rather than replicated.
2. A **complete, uncorrupted copy** later supplied in an `OES/oes/` folder — this contained the
   real `admin/*.php`, `tc/*.php`, all image assets, the `oes.sql` schema dump, `license.txt`,
   and `README`. Reading this corrected a significant wrong assumption in the rewrite (see §5).

Raw copies preserved in `documentation/legacy-reference/`: `oes.sql`, `license.txt`, `README`,
and the full `images/` folder (24 files, ~1.9MB) from the original project, in case original
branding/imagery is ever wanted again.

---

## 2. Original Database Schema (MySQL 5.1, `oes.sql`)

```sql
CREATE TABLE `adminlogin` (
  `admname` varchar(32) NOT NULL,
  `admpassword` varchar(32) DEFAULT NULL,   -- MD5 hash
  PRIMARY KEY (`admname`)
);
-- seed data: ('root', md5('root'))

CREATE TABLE `testconductor` (
  `tcid` bigint(20) NOT NULL,
  `tcname` varchar(40),
  `tcpassword` varchar(40),                 -- MySQL ENCODE()/DECODE() reversible "encryption", key 'oespass'
  `emailid` varchar(40),
  `contactno` varchar(20),
  `address` varchar(40),
  `city` varchar(40),
  `pincode` varchar(20),
  PRIMARY KEY (`tcid`), UNIQUE(`tcname`), UNIQUE(`emailid`)
);

CREATE TABLE `student` (
  `stdid` bigint(20) NOT NULL,
  `stdname` varchar(40),
  `stdpassword` varchar(40),                -- same ENCODE/DECODE scheme
  `emailid` varchar(40),
  `contactno` varchar(20),
  `address` varchar(40),
  `city` varchar(40),
  `pincode` varchar(20),
  PRIMARY KEY (`stdid`), UNIQUE(`stdname`), UNIQUE(`emailid`)
);

CREATE TABLE `subject` (
  `subid` int(11) NOT NULL,
  `subname` varchar(40),
  `subdesc` varchar(100),
  `tcid` bigint(20),                        -- FK -> testconductor; NULL = admin/global subject
  PRIMARY KEY (`subid`), UNIQUE(`subname`),
  FOREIGN KEY (`tcid`) REFERENCES `testconductor` (`tcid`)
);

CREATE TABLE `test` (
  `testid` bigint(20) NOT NULL,
  `testname` varchar(30) NOT NULL,
  `testdesc` varchar(100),
  `testdate` date, `testtime` time,          -- creation date/time, informational
  `subid` int(11),                           -- FK -> subject
  `testfrom` timestamp,                      -- availability window start
  `testto` timestamp,                        -- availability window end
  `duration` int(11),                        -- minutes
  `totalquestions` int(11),                  -- declared upfront; prepqn.php won't let you add more than this
  `attemptedstudents` bigint(20),
  `testcode` varchar(40) NOT NULL,           -- ENCODE/DECODE 'oespass' scheme
  `tcid` bigint(20),                         -- FK -> testconductor; NULL = admin/global test
  PRIMARY KEY (`testid`), UNIQUE(`testname`),
  FOREIGN KEY (`subid`) REFERENCES `subject` (`subid`),
  FOREIGN KEY (`tcid`) REFERENCES `testconductor` (`tcid`)
);

CREATE TABLE `question` (
  `testid` bigint(20) NOT NULL,              -- 1:1 with a single test, no reuse/bank
  `qnid` int(11) NOT NULL,
  `question` varchar(500),
  `optiona` varchar(100), `optionb` varchar(100), `optionc` varchar(100), `optiond` varchar(100),  -- fixed 4 options
  `correctanswer` enum('optiona','optionb','optionc','optiond'),  -- stores the COLUMN NAME, not the text
  `marks` int(11),
  PRIMARY KEY (`testid`,`qnid`),
  FOREIGN KEY (`testid`) REFERENCES `test` (`testid`)
);

CREATE TABLE `studenttest` (
  `stdid` bigint(20) NOT NULL, `testid` bigint(20) NOT NULL,
  `starttime` timestamp, `endtime` timestamp,
  `correctlyanswered` int(11),
  `status` enum('over','inprogress'),
  PRIMARY KEY (`stdid`,`testid`),
  FOREIGN KEY (`stdid`) REFERENCES `student` (`stdid`),
  FOREIGN KEY (`testid`) REFERENCES `test` (`testid`)
);

CREATE TABLE `studentquestion` (
  `stdid` bigint(20) NOT NULL, `testid` bigint(20) NOT NULL, `qnid` int(11) NOT NULL,
  `answered` enum('answered','unanswered','review'),
  `stdanswer` enum('optiona','optionb','optionc','optiond'),
  PRIMARY KEY (`stdid`,`testid`,`qnid`),
  FOREIGN KEY (`stdid`) REFERENCES `student` (`stdid`),
  FOREIGN KEY (`testid`,`qnid`) REFERENCES `question` (`testid`,`qnid`)
);
```

**Key structural facts that shaped the rewrite:**
- `subject.tcid` and `test.tcid` are nullable FKs to `testconductor` — **this is the origin of the
  ownership model added to `webapp/`** (`Subject.ownerId`, `Test.ownerId`, `Question.ownerId`).
  `NULL` = admin/global content; non-null = owned by a specific test conductor.
- `admin` and `testconductor`/`student` were entirely separate tables/login systems (no shared
  "users" table) — the rewrite unifies these into one `User` table with a `role` enum instead,
  a deliberate simplification since there was no real behavioral need to keep them separate once
  ownership scoping does the same job.
- 4 fixed options per question, correct answer stored as a **column name string**
  (`optiona`/`optionb`/etc.) rather than free text or a foreign key — `viewresult.php` had to
  dynamically build `select <columnname> as ...` queries to resolve the actual answer text, a
  second-order SQL injection risk. The rewrite replaced this with a normalized `Option` table and
  an `AnswerOption` join table, removing both the 4-option limit and this anti-pattern entirely.

---

## 3. Original Admin Panel (`admin/*.php`)

Session key: `$_SESSION['admname']`. Login checks `adminlogin` table (MD5 password compare).

| File | Purpose |
|---|---|
| `index.php` | Admin login |
| `admwelcome.php` | Dashboard — an HTML image-map (`<map>`) over `images/admwelcome.jpg` linking to the 5 sections below (same broken/inaccessible pattern as the student dashboard) |
| `usermng.php` | **Manage Students** — full CRUD over the `student` table, no `tcid` scoping (admin manages every student regardless of which test conductor's tests they've taken) |
| `submng.php` | **Manage Subjects** — CRUD over `subject`; admin's own creates always insert `tcid=NULL`; default listing (`select * from subject`) has **no tcid filter**, so admin sees and can edit/delete *every* test conductor's subjects too (unscoped oversight) |
| `tcmng.php` | **Manage Test Conductors** — CRUD over the `testconductor` table itself. **Only admin can create a test-conductor account** — there is no self-registration path for that role anywhere in the codebase (`tc/index.php`'s Register button is present but commented out) |
| `testmng.php` | **Manage Tests** — CRUD over `test`; same unscoped-oversight pattern as subjects (no `tcid` filter on the default listing/edit/delete queries); has a "Manage Questions" per-row action that stores the target test in `$_SESSION['testqn']` and redirects to `prepqn.php` |
| `prepqn.php` | **Prepare Questions** — CRUD over `question` for whichever test is in `$_SESSION['testqn']`; enforces the declared `totalquestions` count (won't let you add more than declared); validates the 4 options aren't duplicates of each other |
| `rsltmng.php` | **Manage Results** — read-only: default view lists every test with its attempted-student count; `?testid=` drill-down shows every student's obtained marks / percentage for that test. No `tcid` filter — admin sees every test conductor's results too |

**Design takeaway carried into `webapp/`:** Admin has unscoped, full CRUD oversight over
*everything* (subjects/tests/questions/results across all owners), plus exclusive rights to
create/manage student and test-conductor accounts. This is exactly what `webapp/`'s
`ownerFilter()` helper (`ADMIN` → no filter; `STUDY_CENTER` → `{ ownerId: self }`) and the new
`/admin/users` module were built to replicate.

---

## 4. Original Test Conductor Panel (`tc/*.php`)

Session keys: `$_SESSION['tcname']`, `$_SESSION['tcid']`. Login checks the `testconductor` table.

| File | Purpose |
|---|---|
| `index.php` | Test conductor login (self-registration UI exists but is commented out — accounts are admin-provisioned only) |
| `tcwelcome.php` | Dashboard — image-map over `images/tcwelcome.jpg` linking to Manage Subjects, Manage Tests, Edit Profile, Manage Results, Prepare Questions |
| `submng.php` | Manage Subjects — **every query is scoped** with `and tcid = $_SESSION['tcid']` on read/update/delete, and inserts set `tcid = $_SESSION['tcid']` explicitly. This confirmed a test conductor only ever sees/edits its own subjects. |
| `testmng.php` | Manage Tests — same `tcid`-scoped pattern for its own tests |
| `prepqn.php` | Prepare Questions for the conductor's own test (same shape as `admin/prepqn.php`, reached the same way via `$_SESSION['testqn']`) |
| `rsltmng.php` | Manage Results — same drill-down UI as `admin/rsltmng.php`, but scoped to the conductor's own tests |
| `editprofile.php` | Edit own profile (name/password/contact/address/city/pincode) |

**This was the critical discovery that corrected the rewrite:** the corrupted copy of the
project had *no* `tc/` implementation at all (empty folder), so the initial `webapp/` build
guessed this role was a **read-only "Study Center" reporting viewer**. Reading the real
`tc/*.php` files showed it's actually a **full authoring account** — a self-contained mini-admin
scoped to its own content, structurally identical to the admin pages minus the `tcid` filter.
`webapp/` was corrected to match: the `STUDY_CENTER` role now gets full CRUD over its own
subjects/tests/questions (reusing the same admin UI components, mounted at role-neutral
`/manage/*` routes with backend ownership scoping), not a separate read-only page set.

Students themselves are **not** scoped by test conductor anywhere — `stdtest.php`'s test listing
query has no `tcid` filter, so every student sees every published test platform-wide regardless
of which admin/test-conductor authored it. `webapp/`'s student-facing `GET /tests` deliberately
preserves this (unscoped by owner).

---

## 5. Other legacy details worth remembering

- **Calendar widget:** `calendar/` contained the `jsDatePick` library (`jsDatePick.full.1.1.js`,
  `.min.js`, `.css`, `example.html`) — used in `admin/testmng.php` and `tc/testmng.php` to pick
  the test's availability window (`testfrom`/`testto`). `webapp/` replaced this with native HTML
  `<input type="datetime-local">`, which needs no external library.
- **Password/test-code "encryption":** both `student.stdpassword`, `testconductor.tcpassword`,
  and `test.testcode` used MySQL's `ENCODE()`/`DECODE()` with a single hardcoded key `'oespass'`
  across the entire app — reversible, not real hashing. `webapp/` uses bcrypt for passwords and
  never round-trips a test's code back to any client.
- **Question authoring flow:** a test declares `totalquestions` up front; `prepqn.php` refuses to
  add more questions than that declared count, and shows "Still you need to create N more
  question(s)" until it's met. `webapp/`'s publish gate ("cannot publish with 0 questions" /
  pool-size-vs-attached-count check) is the spiritual descendant of this guard, generalized for a
  reusable question bank instead of a fixed per-test count.
- **Image assets** (preserved in `documentation/legacy-reference/images/`): `logo.gif` (header
  logo), `admwelcome.jpg/png`, `stdwelcome.jpg/png/4.jpg`, `tcwelcome.jpg` (dashboard image-map
  backgrounds), `btn.jpg`, `edit.jpg/png`, `detail.png`, `resume.png`, `starttest.png`,
  `mngqn.png` (button icons), `correct.png`/`wrong.png` (result markers), `bg_form.gif`,
  `bubble.gif`/`bubble_filler.gif` (CSS tooltip sliding-doors technique), `header.png`,
  `img02.png`/`img12.jpg`, `page.gif`, `trans.png`. None of these were present in the corrupted
  copy used for the initial rewrite; `webapp/`'s "vibrant dashboard" visual design was built
  fresh rather than restoring this original 2010-era imagery.
- **License obligation note:** the original OES codebase is GPL v3 (HarMeeT SinGh, 2010).
  `webapp/` is an independent rewrite (different language, framework, and architecture
  throughout) rather than a derivative of the original PHP source, so GPL copyleft obligations
  on the original code shouldn't attach to it — but this is worth a real legal review before any
  commercial distribution, since the product concept and some naming/flows were directly modeled
  on the original.

---

## 6. Where this all landed in `webapp/`

See `documentation/PRD.md` for the full product requirements of the current system. In short:
every legacy student-facing page has a `webapp/` equivalent (documented there), the admin/test-
conductor gap is now fully built with correct ownership semantics as described in §3–4 above, and
the feature-depth work (question types, negative marking, question bank, item analysis,
certificates) goes well beyond anything the 2010 original had.
