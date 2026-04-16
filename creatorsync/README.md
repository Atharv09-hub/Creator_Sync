# CreatorSync

CreatorSync is a React + Vite app for planning content, tracking production, and managing scripts.

## Local Development

1. Install dependencies:

```bash
npm install
```

2. Start the dev server:

```bash
npm run dev
```

## Backend API

The script rewrite feature now runs through a backend API instead of calling OpenAI directly from the browser.

The client calls `POST /api/rewrite`, and the server talks to OpenAI with the secret key.

### 1. Set the server key

Add one of these to your environment or `.env.local`:

```env
OPENAI_API_KEY=your_key_here
```

If you already have `VITE_OPENAI_API_KEY` in `.env.local`, the server will fall back to it during local development.

### 2. Run locally

Open two terminals:

```powershell
npm run server
```

```powershell
npm run dev
```

Vite proxies `/api` to the backend on port `3001`.

## Docker Deployment

This project uses a single production container that serves both the React app and the backend API through the Node server.

### 1. Build the image

```bash
docker build -t creatorsync .
```

### 2. Run the container

```powershell
docker run -d --name creatorsync-app -p 8080:3001 -e OPENAI_API_KEY=your_key_here creatorsync
```

Open:

```text
http://localhost:8080
```

### 3. Rebuild after changes

```powershell
docker build -t creatorsync .
docker rm -f creatorsync-app
docker run -d --name creatorsync-app -p 8080:3001 -e OPENAI_API_KEY=your_key_here creatorsync
```

## Important note

The OpenAI key is now only used on the server. Do not put it in a public frontend-only environment variable anymore.

## Firebase note

The Media Vault and other per-user Firestore collections now expect authenticated reads and writes based on `userId`.
After pulling this change, deploy the Firestore rules from `firestore.rules` to your Firebase project:

```bash
firebase deploy --only firestore:rules
```
