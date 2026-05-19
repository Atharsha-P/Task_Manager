# Task Manager

A full-stack task management app built with React, Node.js, Express, and MongoDB.

## What it does

- Sign in with Google Authentication
- Create tasks with a title, notes, and due date
- View all tasks in a responsive dashboard
- Update task status across Planned, In Progress, and Complete
- Use filters, stats, and quick interactions to keep the interface active and easy to use

## Project Structure

- `client` - React app with Vite
- `server` - Express API backed by MongoDB

## Setup

1. Install dependencies from the repository root:

   ```bash
   npm install
   ```

2. Copy the environment examples and fill in your values:
   - `client/.env.example` -> `client/.env`
   - `server/.env.example` -> `server/.env`

3. Start MongoDB locally or point `server/.env` to a hosted MongoDB instance.

4. Run the app:

   ```bash
   npm run dev
   ```

## Deployment

Frontend:

- Deploy the `client` folder to Vercel.
- Set `VITE_GOOGLE_CLIENT_ID` and `VITE_API_BASE_URL` in the Vercel project environment variables.
- Set `VITE_API_BASE_URL` to your Render backend URL, for example `https://task-manager-api.onrender.com`.
- Use the `client/vercel.json` file to keep SPA routing stable.

Backend:

- Deploy the `server` folder to Render as a Node service.
- Set `MONGODB_URI`, `GOOGLE_CLIENT_ID`, `JWT_SECRET`, and `CLIENT_ORIGIN` in Render environment variables.
- Set `CLIENT_ORIGIN` to your Vercel app URL, for example `https://your-app.vercel.app`.
- The `render.yaml` file defines the service start command and environment placeholders.

## Required Environment Variables

Client:

- `VITE_GOOGLE_CLIENT_ID`
- `VITE_API_BASE_URL`

Server:

- `MONGODB_URI`
- `GOOGLE_CLIENT_ID`
- `JWT_SECRET`
- `CLIENT_ORIGIN`

## Notes

- The frontend talks to the backend through the Vite proxy at `/api` during development and through `VITE_API_BASE_URL` in production.
- For local development, keep `VITE_API_BASE_URL` empty so the Vite proxy handles API calls.
- Google sign-in requires the same Google client ID on both the client and server side.
- The task states are fixed to Planned, In Progress, and Complete.
- If Google sign-in shows `invalid_client` or `no registered origin`, add your deployed Vercel URL and `http://localhost:5173` to the OAuth client’s Authorized JavaScript origins in Google Cloud Console, then restart the frontend dev server.
