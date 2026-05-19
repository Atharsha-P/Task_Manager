# Task Manager

A full-stack task management app built with React, Node.js, Express, and Firebase Firestore.

## What it does

- Sign in with Google Authentication
- Create tasks with a title, notes, and due date
- View all tasks in a responsive dashboard
- Update task status across Planned, In Progress, and Complete
- Use filters, stats, and quick interactions to keep the interface active and easy to use

## Project Structure

- `client` - React app with Vite
- `server` - Express API backed by Firebase Firestore and deployed as a Firebase Function

## Setup

1. Install dependencies from the repository root:

   ```bash
   npm install
   ```

2. Copy the environment examples and fill in your values:
   - `client/.env.example` -> `client/.env`
   - `server/.env.example` -> `server/.env`

3. Run the app:

   ```bash
   npm run dev
   ```

## Deployment

This project is configured for Firebase-only deployment:

1. Build the frontend and deploy Hosting + Functions:

   ```bash
   npm run deploy:firebase
   ```

2. If you have not authenticated with Firebase CLI yet, run:

   ```bash
   npx firebase-tools login
   ```

3. Ensure project id is `task-manager-d03fc` (already configured in `.firebaserc`).

4. Set function environment variables in Firebase (or Google Cloud runtime config) before deploy.

## Required Environment Variables

Client:

- `VITE_GOOGLE_CLIENT_ID`
- `VITE_API_BASE_URL`

Server:

- `FIREBASE_API_KEY`
- `FIREBASE_AUTH_DOMAIN`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_STORAGE_BUCKET`
- `FIREBASE_MESSAGING_SENDER_ID`
- `FIREBASE_APP_ID`
- `FIREBASE_MEASUREMENT_ID`
- `GOOGLE_CLIENT_ID`
- `JWT_SECRET`
- `CLIENT_ORIGIN`

## Notes

- The frontend talks to the backend through `/api` both in development and in Firebase Hosting rewrites.
- Keep `VITE_API_BASE_URL` empty for same-origin API calls unless you intentionally host the API elsewhere.
- Google sign-in requires the same Google client ID on both the client and server side.
- The task states are fixed to Planned, In Progress, and Complete.
- If Google sign-in shows `invalid_client` or `no registered origin`, add your Firebase Hosting domain and `http://localhost:5173` to the OAuth client’s Authorized JavaScript origins in Google Cloud Console, then restart the frontend dev server.
