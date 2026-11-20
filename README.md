# LabPresensi

**Less paperwork. More practicum.**

An Android-first application built to make Informatics practicum management a whole lot easier.

Built with **React Native, Expo, TypeScript, and Firebase**.

---

## So, what's this all about?

LabPresensi is an app designed to make life a little easier for Informatics practicum assistants and students.

The idea is pretty simple. Managing practicum sessions shouldn't mean jumping between spreadsheets, chat groups, and manually checking who's present and who's not.

So, why not have everything in one place?

With LabPresensi, assistants can manage their classes, create and schedule sessions, handle attendance, review session recaps, and respond to student leave requests.

Students get their own workspace too. They can check upcoming practicum sessions, mark their attendance when a session is open, submit leave requests, and keep track of their attendance history.

There's also an admin workspace for managing practicum catalogs, classes, student information, and laboratory data.

**The goal?** Spend less time managing attendance and more time actually getting things done.

## What can it do?

### For Practicum Assistants
- **Class Management** — Manage assigned classes and their participants.
- **Session Management** — Create, schedule, open, and close practicum sessions.
- **Attendance Recaps** — Keep track of who's present, who's on leave, and who's missing.
- **Leave Reviews** — Review student requests and decide whether to approve or reject them.

### For Students
- **Practicum Schedule** — See upcoming sessions and their details.
- **Attendance Check-in** — Submit attendance during eligible sessions.
- **Attendance History** — Look back at previously recorded attendance.
- **Leave Requests** — Submit an explanation when unable to attend and track its review status.

### For Admins
- Manage practicum and class catalogs.
- Maintain student information and class rosters.
- Manage laboratory location data.

### Behind the Scenes
- **Firebase Authentication** for account access.
- **Cloud Firestore** for data storage and realtime updates.
- **Role-based access** for Admins, Assistants, and Students.
- **Duplicate attendance protection** to prevent repeated submissions.
- **Session schedule validation** to help avoid conflicting sessions.
- **AI-assisted leave classification** when the classification service is configured. The assistant always makes the final decision.

## Built with

| Technology | What it's used for |
|---|---|
| React Native | Mobile application interface |
| Expo | Application development and tooling |
| TypeScript | Type-safe application code |
| Firebase Authentication | User authentication |
| Cloud Firestore | Database and realtime synchronization |
| Firestore Security Rules | Data access control |

## Getting started

Want to run LabPresensi locally? Here's how.

**1. Clone the repository**

```bash
git clone https://github.com/AdmRss/LabPresensi.git
cd LabPresensi
```

**2. Install dependencies**

```bash
npm install
```

**3. Configure Firebase**

Create a local `.env` file based on `.env.example` and provide the Firebase configuration required by the application.

Keep credentials and private keys out of Git.

Some integrations, including AI-assisted leave classification, may require additional configuration.

**4. Start the application**

```bash
npx expo start
```

Follow the terminal instructions to open the application using a supported development environment.

For native features, use an appropriate Android development build when required.

## Project status

**Active development — University Software Development Project**

LabPresensi is being developed as part of a university software development practicum project.

Core session, attendance, leave, and recap workflows have been implemented and tested using local Firebase emulators. Additional device-level verification and integration work may still be required.

## Why LabPresensi?

Because something as routine as practicum attendance shouldn't be more complicated than the practicum itself.

**Made to simplify the little things that take up way too much time.**
