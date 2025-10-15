# MeetMate - AI-Powered Meeting Transcription & Summarization

> **Cloudflare Early Talent**

<p align="center">
  <img src="./assets/banner.png"/>
</p>

MeetMate is a Chrome extension that leverages Cloudflare Workers AI to automatically transcribe and summarize Google Meet conversations in real-time. Built entirely on Cloudflare's infrastructure with Workers, D1 Database, R2 Storage, and Workers AI.

![MeetMate](https://img.shields.io/badge/Status-Production%20Ready-brightgreen)
![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-orange)
![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-blue)

---

## ✨ Introducing MeetMate
MeetMate transforms your Google Meet sessions into organized, searchable knowledge.  
Built entirely on **Cloudflare Workers, D1, R2, and Workers AI**, it transcribes and summarizes meetings with speed, security, and elegance.

![Introducing MeetMat](./assets/slides/intro.png)

---

## 🪪 Sign In Seamlessly
Log in with Google and stay connected wherever you go. MeetMat securely stores your account so your meetings and transcripts are always within reach.

![Sign In Screen](./assets/slides/login.png)

---

## 🏠 Your Home Dashboard
Jump right into work with quick access to recent meetings and one-tap recording. A clean, distraction-free interface built for focus and productivity.

![Home Dashboard](./assets/slides/home.png)

---

## 📜 Meeting History, Organized
Revisit past meetings effortlessly. View or download transcripts in Markdown or plain text — your entire conversation archive, neatly managed.

![Meeting History](./assets/slides/history.png)

---

## 🧠 AI Transcript & Summary
Experience your meetings reimagined. Switch between structured and Markdown views to explore full transcriptions and AI-generated insights side by side.

![Transcript & Summary](./assets/slides/transcript.png)

---

## 🪄 Structured AI Summary
See your meeting distilled into key points, action items, and decisions — beautifully formatted and instantly shareable. Clarity powered by Cloudflare AI.

![Structured Summary](./assets/slides/summary.png)


## Table of Contents

- [Features](#-features)
- [Architecture](#-architecture)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Setup & Installation](#-setup--installation)
- [Cloudflare Configuration](#-cloudflare-configuration)
- [Usage](#-usage)
- [API Documentation](#-api-documentation)
- [Database Schema](#-database-schema)
- [Development](#-development)
- [Deployment](#-deployment)
- [Challenges & Solutions](#-challenges--solutions)
- [Future Enhancements](#-future-enhancements)

##  Features

### Core Functionality
- **Real-time Audio Recording** - Capture Google Meet audio directly from the browser
- **AI Transcription** - Powered by Cloudflare Workers AI (Whisper model)
- **Smart Summarization** - Uses Llama 3.3 70B to generate structured summaries
- **Cloud Storage** - Secure storage with Cloudflare R2
- **Google OAuth** - Seamless authentication
- **Email Notifications** - Get summaries delivered to your inbox
- **Meeting History** - Browse and search past meetings
- **Real-time Processing** - See transcriptions as the meeting progresses

### AI-Powered Insights
- **Structured Summaries** - Title, participants, topics, decisions, action items
- **Markdown Export** - Clean, formatted summaries ready to share
- **Key Decisions Tracking** - Never miss important conclusions
- **Action Items Extraction** - Automatic to-do list generation
- **Tone Analysis** - Understand meeting sentiment

## Architecture

```
┌─────────────────┐
│ Chrome Extension│
│  (Frontend)     │
└────────┬────────┘
         │
         │ HTTPS
         │
┌────────▼────────────────────────────────────┐
│     Cloudflare Workers (Backend)            │
│  ┌──────────────────────────────────────┐   │
│  │  API Routes                          │   │
│  │  - Auth (Google OAuth)               │   │
│  │  - Recordings Management             │   │
│  │  - Meeting History                   │   │
│  └──────────┬───────────────────────────┘   │
│             │                                │
│  ┌──────────▼───────────┐                   │
│  │   Workers AI         │                   │
│  │  - Whisper (Audio)   │                   │
│  │  - Llama 3.3 70B     │                   │
│  └──────────────────────┘                   │
└─────────┬───────────┬───────────────────────┘
          │           │
          │           │
  ┌───────▼──┐   ┌────▼─────┐
  │ D1 DB    │   │ R2 Bucket│
  │ (SQLite) │   │ (Storage)│
  └──────────┘   └──────────┘
```

## 🛠️ Tech Stack

### Frontend (Chrome Extension)
- **HTML/CSS/JavaScript** - Vanilla JS for lightweight performance
- **Chrome Extension APIs** - Tab capture, storage, messaging
- **MediaRecorder API** - Audio recording

### Backend (Cloudflare Workers)
- **Cloudflare Workers** - Serverless compute platform
- **Workers AI** - AI inference at the edge
  - `@cf/openai/whisper` - Speech-to-text transcription
  - `@cf/meta/llama-3.3-70b-instruct-fp8-fast` - Text summarization
- **D1 Database** - Serverless SQL database
- **R2 Storage** - Object storage for audio files
- **Itty Router** - Lightweight routing

### Authentication
- **Google OAuth 2.0** - Secure user authentication

## 📁 Project Structure

```
meetmate-backend/                      # ⚙️ Cloudflare Workers backend
├── migrations/                        # SQL schema & migration scripts for D1 database
│   ├── 0001_init.sql                  # Initial database setup
│   └── 0002.sql                       # Additional schema updates
├── package-lock.json                  # Dependency lock file
├── package.json                       # Backend dependencies & scripts
├── src/                               # Source code for Worker logic
│   └── index.js                       # Main Worker entry point
├── test/                              # Unit and integration tests
│   └── index.spec.js                  # Tests for main Worker functionality
├── vitest.config.js                   # Vitest testing framework configuration
└── wrangler.jsonc                     # Cloudflare Wrangler configuration file


meetmate-extension/                    # 🧩 Chrome Extension (Vite + React)
├── eslint.config.js                   # ESLint configuration for linting
├── index.html                         # Root HTML entry point for Vite
├── package-lock.json                  # Dependency lock file
├── package.json                       # Extension dependencies & scripts
├── postcss.config.js                  # PostCSS configuration for Tailwind CSS
├── public/                            # Static assets served directly
│   └── vite.svg                       # Default Vite logo
├── README.md                          # Project documentation
├── src/                               # Source code for the Chrome extension
│   ├── App.css                        # App-wide CSS
│   ├── App.jsx                        # Root React component
│   ├── assets/                        # Images and static media
│   │   └── react.svg                  # React logo
│   ├── background.js                  # Background service worker
│   ├── components/                    # React UI components
│   │   ├── Dashboard.jsx              # Main dashboard view
│   │   ├── Login.jsx                  # Authentication view
│   │   ├── PreviousSummaries.jsx      # Displays past meeting summaries
│   │   ├── RecordingPanel.jsx         # Active recording interface
│   │   └── SummaryView.jsx            # Summary details page
│   ├── content.js                     # Content script injected into Google Meet
│   ├── hooks/                         # Custom React hooks
│   │   └── useStore.js                # Zustand or React state management hook
│   ├── index.css                      # Base styling
│   ├── main.jsx                       # React app entry file
│   ├── manifest.json                  # Chrome extension manifest
│   ├── offscreen.html                 # Offscreen document for background recording
│   ├── offscreen.js                   # Logic handling offscreen audio/video processing
│   ├── popup.html                     # Popup UI for quick actions
│   ├── services/                      # API and business logic
│   │   ├── api.js                     # API service for backend communication
│   │   ├── auth.js                    # Authentication utilities
│   │   └── recording.js               # Recording and transcript handling
│   └── styles/                        # Global and shared styles
│       └── global.css                 # Tailwind & custom global styles
├── tailwind.config.js                 # Tailwind CSS configuration
└── vite.config.js                     # Vite bundler configuration
```

## Setup & Installation

### Prerequisites
- Node.js 18+ and npm
- Cloudflare account (free tier works!)
- Google Cloud Console account (for OAuth)
- Chrome browser

### 1. Clone the Repository

```bash
gh repo clone ineffablesam/cf_ai_meetmate
cd meetmate
```

### 2. Backend Setup (Cloudflare Workers)

```bash
cd meetmate-backend
npm install
```

**Install Wrangler CLI (if not already installed):**
```bash
npm install -g wrangler
```

**Login to Cloudflare:**
```bash
wrangler login
```

**Create D1 Database:**
```bash
wrangler d1 create meetmate-db
```

Copy the database ID from the output and update `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "meetmate-db"
database_id = "YOUR_DATABASE_ID_HERE"
```

**Initialize Database Schema:**
```bash
wrangler d1 execute meetmate-db --file=./schema.sql
```

**Create R2 Bucket:**
```bash
wrangler r2 bucket create meetmate-audio
```

**Configure Environment Variables:**

Create a `.dev.vars` file:
```env
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=https://your-worker.workers.dev/api/auth/callback
EXTENSION_ID=your_extension_id
```

Update `wrangler.toml` with production variables (use `wrangler secret put` for sensitive data):
```bash
wrangler secret put GOOGLE_CLIENT_ID
wrangler secret put GOOGLE_CLIENT_SECRET
```

### 3. Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable **Google+ API**
4. Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
5. Application type: **Web application**
6. Authorized redirect URIs:
   - `https://your-worker.workers.dev/api/auth/callback`
   - `https://<extension-id>.chromiumapp.org/` (for extension)
7. Copy Client ID and Client Secret

### 4. Extension Setup

```bash
cd ../meetmate-extension
```

**Update configuration in `popup.js`:**
```javascript
const API_BASE_URL = 'https://your-worker.workers.dev';
const GOOGLE_CLIENT_ID = 'your_google_client_id';
```

**Load Extension in Chrome:**
1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `meetmate-extension` folder
5. Copy the Extension ID and update backend environment variables

## ☁️ Cloudflare Configuration

### wrangler.toml

```toml
name = "meetmate-backend"
main = "src/index.js"
compatibility_date = "2024-01-01"

[ai]
binding = "AI"

[[d1_databases]]
binding = "DB"
database_name = "meetmate-db"
database_id = "your_database_id"

[[r2_buckets]]
binding = "BUCKET"
bucket_name = "meetmate-audio"

[vars]
EXTENSION_ID = "your_extension_id"
GOOGLE_REDIRECT_URI = "https://your-worker.workers.dev/api/auth/callback"
```

### Database Schema (schema.sql)

```sql
-- Users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  google_id TEXT UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Meetings table
CREATE TABLE IF NOT EXISTS meetings (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  meeting_name TEXT NOT NULL,
  transcript TEXT,
  summary TEXT,
  status TEXT DEFAULT 'recording',
  processing_started_at TIMESTAMP,
  processing_completed_at TIMESTAMP,
  processing_duration_ms INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Processing status tracking
CREATE TABLE IF NOT EXISTS processing_status (
  id TEXT PRIMARY KEY,
  meeting_id TEXT NOT NULL,
  step TEXT NOT NULL,
  status TEXT NOT NULL,
  error_message TEXT,
  duration_ms INTEGER,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (meeting_id) REFERENCES meetings(id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_meetings_user_id ON meetings(user_id);
CREATE INDEX IF NOT EXISTS idx_meetings_created_at ON meetings(created_at);
CREATE INDEX IF NOT EXISTS idx_processing_status_meeting_id ON processing_status(meeting_id);
```

## 💻 Usage

### For Users

1. **Install the Extension** - Load from Chrome Web Store (or locally)
2. **Join a Google Meet** - Open any Google Meet call
3. **Click Extension Icon** - Sign in with Google
4. **Start Recording** - Click "Start Recording" button
5. **AI Processing** - Watch real-time transcription (expiremental)
6. **Get Summary** - Receive AI-generated summary when meeting ends
7. **Access History** - View all past meetings in the extension

### For Developers

**Run Backend Locally:**
```bash
cd meetmate-backend
wrangler dev
```

**Test API Endpoints:**
```bash
# Health check
curl https://localhost:8787/

# Get meetings (requires auth)
curl https://localhost:8787/api/meetings?userId=USER_ID
```

**Deploy to Production:**
```bash
wrangler deploy
```

## 📡 API Documentation

### Authentication Endpoints

#### `GET /api/auth/google/start`
Start Google OAuth flow

**Query Parameters:**
- `state` (optional) - OAuth state parameter
- `code_challenge` (optional) - PKCE challenge
- `scope` (optional) - OAuth scopes

**Response:** Redirects to Google OAuth

#### `POST /api/auth/google`
Exchange OAuth code for tokens

**Request Body:**
```json
{
  "code": "oauth_code",
  "redirect_uri": "redirect_uri",
  "code_verifier": "pkce_verifier"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "name": "User Name"
  },
  "accessToken": "google_access_token"
}
```

### Recording Endpoints

#### `POST /api/recordings/start`
Start a new recording session

**Request Body:**
```json
{
  "meetingName": "Meeting Name",
  "userId": "user_id",
  "realtimeProcessing": true
}
```

**Response:**
```json
{
  "success": true,
  "meetingId": "meeting_id",
  "realtimeProcessing": true
}
```

#### `POST /api/recordings/:meetingId/complete`
Complete recording and process with AI

**Request Body:**
```json
{
  "audioBlob": "base64_audio_data"
}
```

**Response:**
```json
{
  "success": true,
  "meetingId": "meeting_id",
  "transcript": "Full transcript...",
  "summaryJSON": {
    "title": "Meeting Summary",
    "overall_summary": "...",
    "topics": [...],
    "key_decisions": [...],
    "next_steps": [...]
  },
  "summaryMarkdown": "# Meeting Summary\n...",
  "timing": {
    "transcriptionMs": 5000,
    "summarizationMs": 8000,
    "totalMs": 13000
  }
}
```

#### `POST /api/recordings/:meetingId/cancel`
Cancel an ongoing recording

### Meeting Endpoints

#### `GET /api/meetings?userId=USER_ID`
Get all meetings for a user

**Response:**
```json
{
  "success": true,
  "meetings": [
    {
      "id": "meeting_id",
      "meeting_name": "Team Standup",
      "status": "completed",
      "created_at": "2025-01-15T10:00:00Z",
      "summary": { ... },
      "processingTimeSeconds": "13.50"
    }
  ]
}
```

#### `GET /api/meetings/:meetingId`
Get specific meeting details with processing history

## 🗄️ Database Schema

### Tables

**users**
- `id` (TEXT, PK) - UUID
- `email` (TEXT, UNIQUE) - User email
- `name` (TEXT) - User name
- `google_id` (TEXT, UNIQUE) - Google OAuth ID
- `created_at` (TIMESTAMP) - Account creation time

**meetings**
- `id` (TEXT, PK) - UUID
- `user_id` (TEXT, FK) - User ID
- `meeting_name` (TEXT) - Meeting title
- `transcript` (TEXT) - Full transcript
- `summary` (TEXT) - JSON summary
- `status` (TEXT) - recording/processing/completed/failed/cancelled
- `processing_duration_ms` (INTEGER) - Processing time
- `created_at` (TIMESTAMP) - Meeting creation time

**processing_status**
- `id` (TEXT, PK) - UUID
- `meeting_id` (TEXT, FK) - Meeting ID
- `step` (TEXT) - Processing step name
- `status` (TEXT) - success/failed/processing
- `error_message` (TEXT) - Error details if failed
- `duration_ms` (INTEGER) - Step duration
- `timestamp` (TIMESTAMP) - Step timestamp

## 🔧 Development

### Testing Locally

**Backend:**
```bash
cd meetmate-backend
wrangler dev --local
```

**Extension:**
1. Make changes to extension files
2. Go to `chrome://extensions/`
3. Click refresh icon on MeetMate extension
4. Test in a Google Meet

### Debugging

**Backend Logs:**
```bash
wrangler tail
```

**Extension Console:**
- Right-click extension icon → "Inspect popup"
- Use Chrome DevTools

### Common Issues

**Issue: AI not returning summaries**
- Check Wrangler logs for AI response structure
- Verify Workers AI binding in wrangler.toml
- Increase max_tokens if summaries are truncated

**Issue: CORS errors**
- Ensure backend URL is correct in extension
- Check Cloudflare Workers CORS headers

**Issue: Database errors**
- Run schema.sql again: `wrangler d1 execute meetmate-db --file=./schema.sql`
- Check D1 binding in wrangler.toml

## 🚢 Deployment

### Deploy Backend

```bash
cd meetmate-backend

# Deploy to production
wrangler deploy

# Set production secrets
wrangler secret put GOOGLE_CLIENT_ID
wrangler secret put GOOGLE_CLIENT_SECRET
```

### Publish Extension

1. **Create ZIP:**
```bash
cd meetmate-extension
zip -r meetmate-extension.zip . -x "*.git*" "*.DS_Store"
```

2. **Chrome Web Store:**
- Go to [Chrome Developer Dashboard](https://chrome.google.com/webstore/devconsole)
- Create new item
- Upload ZIP file
- Fill in store listing details
- Submit for review

## 🎥 Demo Video

[Link to demo video showing the extension in action]

**Demo covers:**
- Installation process
- Starting a recording in Google Meet
- Real-time transcription
- AI summary generation
- Viewing meeting history
- Exporting summaries

## 🏆 Challenges & Solutions

### Challenge 1: Real-time Audio Capture
**Problem:** Capturing Google Meet audio without screen sharing permissions

**Solution:** Used Chrome's `tabCapture` API with `audioConstraints` to capture tab audio directly. Implemented MediaRecorder with WebM format for efficient streaming.

### Challenge 2: AI Response Parsing
**Problem:** Llama 3.3 sometimes returned malformed JSON or wrapped in markdown

**Solution:** Implemented multi-stage parsing with regex fallbacks and automatic structure validation. Added comprehensive error handling with fallback summaries.

### Challenge 3: Large Audio Files
**Problem:** Meeting recordings could exceed Workers request size limits

**Solution:** Implemented chunked uploads to R2, with streaming transcription for longer meetings. Used Cloudflare's edge network for fast uploads.

### Challenge 4: Authentication Flow
**Problem:** Complex OAuth flow between extension, popup, and backend

**Solution:** Implemented PKCE flow with state management. Used Chrome storage API for secure token persistence.


## 🙏 Acknowledgments

- **Cloudflare** - For the amazing Workers platform and AI infrastructure
- **OpenAI** - Whisper model for transcription
- **Meta** - Llama 3.3 for summarization
- **Google** - OAuth

## 👨‍💻 Author

**[Samuel Philip]**
- GitHub: [@ineffablesam](https://github.com/ineffablesam)
- Email: samuelphilip2k3@gmail.com
- LinkedIn: [Open LinkedIn](http://linkedin.com/in/samuel-philip-v/)

---

**Built with ❤️ for Cloudflare Early Talent 2026**

*This project demonstrates practical applications of Cloudflare's edge computing, serverless databases, object storage, and AI capabilities in solving real-world productivity challenges.*