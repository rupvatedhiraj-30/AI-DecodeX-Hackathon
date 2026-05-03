# AI Past Paper Analyzer

A demo-ready hackathon prototype that analyzes past exam papers, maps topics against a syllabus, ranks high-yield topics, and generates a smart study plan.

## Features

- Upload PDF or text past papers.
- Extract questions and infer topics, marks, and question type.
- Generate topic frequency, year-wise trends, repeated patterns, and syllabus coverage.
- Create prioritized day-wise study plans.
- Generate practice questions for high-yield topics.
- Uses OpenAI when `OPENAI_API_KEY` is available, with local fallback logic when it is not.

## Folder Structure

```text
backend/
  app/main.py
  requirements.txt
  sample_paper_2024.txt
  sample_paper_2025.txt
frontend/
  src/App.jsx
  src/lib/api.js
  src/styles/index.css
  package.json
```

## Backend Setup

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
uvicorn app.main:app --reload --port 8000
```

The API docs will be available at:

```text
http://localhost:8000/docs
```

Optional `.env` values:

```env
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-4o-mini
CORS_ORIGINS=http://localhost:5173
```

## Frontend Setup

Install Node.js 18+ first if `npm` is not available in your terminal.

```bash
cd frontend
npm install
npm run dev
```

Open:

```text
http://localhost:5173
```

If your backend runs on another URL, create `frontend/.env`:

```env
VITE_API_BASE_URL=http://localhost:8000
```

## Fast Demo Flow

1. Start the backend.
2. Start the frontend.
3. Upload `backend/sample_paper_2024.txt` and `backend/sample_paper_2025.txt`.
4. Keep the default syllabus or paste your own.
5. Click **Analyze Papers**.
6. Review the topic chart, trend chart, syllabus mapping, high-yield topics, practice questions, and study plan.

## API Endpoints

- `POST /upload-paper`: multipart upload for `.pdf` or `.txt`.
- `POST /analyze`: analyzes uploaded papers with syllabus text.
- `GET /insights`: returns the latest dashboard insights.
- `POST /generate-study-plan`: creates a day-wise plan from the latest analysis.

## Deployment Notes

Frontend on Vercel:

- Root directory: `frontend`
- Build command: `npm run build`
- Output directory: `dist`
- Environment variable: `VITE_API_BASE_URL=https://your-render-backend.onrender.com`

Backend on Render:

- Root directory: `backend`
- Build command: `pip install -r requirements.txt`
- Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Environment variables: `OPENAI_API_KEY`, `OPENAI_MODEL`, `CORS_ORIGINS`

## Prototype Limits

- Scanned-image OCR is intentionally out of scope for v1.
- The server uses in-memory storage, so uploaded papers reset when the backend restarts.
- Topic extraction is heuristic-first for speed and reliability during demos.
  ## 🎥 Demo Video

Watch the working prototype here:
[https://your-video-link](https://drive.google.com/file/d/1t-54-NDprUxchjgAPdFHY1XvhHQq-b26/view?usp=sharing)
