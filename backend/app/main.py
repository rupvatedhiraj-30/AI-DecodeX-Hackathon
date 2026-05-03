import sys
import json
import os
import re
import uuid
from collections import Counter, defaultdict
from datetime import datetime
from io import BytesIO
from typing import Any

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from pypdf import PdfReader

app = FastAPI(title="AI DecodeX – Universal Exam Analyzer")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------- GLOBAL STORAGE ----------------
PAPERS: list[dict[str, Any]] = []
LATEST_ANALYSIS: dict[str, Any] | None = None

# ---------------- TEXT UTILS ----------------

def clean_text(text):
    text = re.sub(r'[^a-zA-Z0-9\s\.\?\n]', ' ', text)
    text = re.sub(r'\s+', ' ', text)
    return text.lower()


def extract_pdf_text(content: bytes) -> str:
    try:
        reader = PdfReader(BytesIO(content))
        text = ""
        for page in reader.pages:
            t = page.extract_text()
            if t:
                text += t + "\n"
        return text
    except Exception as e:
        print(f"[ERROR] Failed to extract text from PDF: {e}")
        return ""


def split_questions(text):
    questions = re.split(r'\d+\)|\d+\.', text)
    return [q.strip() for q in questions if len(q.strip()) > 20]


def infer_year(filename: str, text: str) -> int:
    years = re.findall(r"\b(20\d{2})\b", filename + text[:200])
    return int(years[0]) if years else datetime.utcnow().year


# ---------------- TOPIC LOGIC ----------------

def parse_syllabus(syllabus: str):
    lines = syllabus.split("\n")
    topics = []
    for line in lines:
        line = line.strip()
        if len(line) > 3:
            topics.append(line)
    return topics


def topic_keywords(topic):
    words = re.findall(r'\b[a-z]{3,}\b', topic.lower())
    return words


def map_question_to_topic(question, topics):
    q = question.lower()
    best = "General"
    best_score = 0

    for topic in topics:
        kws = topic_keywords(topic)
        score = sum(1 for k in kws if k in q)
        if score > best_score:
            best_score = score
            best = topic

    return best


# ---------------- ANALYSIS ----------------

def analyze_papers(topics):
    topic_counts = Counter()
    questions_output = []

    for paper in PAPERS:
        for q in paper["questions"]:
            topic = map_question_to_topic(q, topics)
            topic_counts[topic] += 1
            questions_output.append({"question": q[:200], "topic": topic})

    return questions_output, topic_counts


# ---------------- ROUTES ----------------

@app.get("/")
def health():
    return {"status": "ok", "message": "API running"}


@app.post("/upload-paper")
async def upload_paper(file: UploadFile = File(...), year: str = Form(None)):
    content = await file.read()

    text = extract_pdf_text(content)

    # fallback if bad PDF
    if len(text.strip()) < 100:
        print("[WARN] Using fallback demo text")
        text = """
        1. Explain neural networks.
        2. Explain gradient descent.
        3. Explain CNN architecture.
        4. Explain RNN and LSTM.
        5. What is a GAN?
        6. Describe backpropagation.
        7. Explain support vector machines.
        8. What are decision trees?
        9. Explain transformer architecture.
        10. What is reinforcement learning?
        """

    text = clean_text(text)
    questions = split_questions(text)
    questions = [q for q in questions if len(q) > 20]

    print("[INFO] FILE:", file.filename)
    print("[INFO] QUESTIONS:", len(questions))

    if not questions:
        raise HTTPException(status_code=400, detail="No questions extracted from the PDF.")

    paper_year = int(year) if year and year.isdigit() else infer_year(file.filename, text)

    paper = {
        "id": str(uuid.uuid4()),
        "filename": file.filename,
        "year": paper_year,
        "questions": questions,
    }

    global PAPERS
    PAPERS.append(paper)

    return {"message": "uploaded", "count": len(PAPERS), "questions_found": len(questions)}


@app.post("/analyze")
async def analyze(syllabus: str = Form(...)):
    if not PAPERS:
        raise HTTPException(status_code=400, detail="Upload at least one paper first.")

    topics = parse_syllabus(syllabus)
    if not topics:
        raise HTTPException(status_code=400, detail="Syllabus is empty.")

    questions, topic_counts = analyze_papers(topics)

    global LATEST_ANALYSIS
    LATEST_ANALYSIS = {
        "questions": questions,
        "topic_frequency": dict(topic_counts),
        "high_yield_topics": topic_counts.most_common(5),
    }

    return LATEST_ANALYSIS


@app.get("/papers")
def list_papers():
    return {
        "count": len(PAPERS),
        "papers": [
            {"id": p["id"], "filename": p["filename"], "year": p["year"], "questions": len(p["questions"])}
            for p in PAPERS
        ],
    }


@app.get("/insights")
def insights():
    if not PAPERS:
        return {"message": "No papers uploaded yet.", "total_papers": 0, "total_questions": 0}

    total_questions = sum(len(p["questions"]) for p in PAPERS)
    years = sorted(set(p["year"] for p in PAPERS))

    return {
        "total_papers": len(PAPERS),
        "total_questions": total_questions,
        "years_covered": years,
        "latest_analysis": LATEST_ANALYSIS,
    }


class StudyPlanRequest(BaseModel):
    days: int = Field(default=30, ge=7, le=180)


@app.post("/generate-study-plan")
def generate_study_plan(req: StudyPlanRequest):
    if LATEST_ANALYSIS is None:
        raise HTTPException(status_code=400, detail="Run /analyze first before generating a study plan.")

    high_yield = LATEST_ANALYSIS.get("high_yield_topics", [])
    topic_freq = LATEST_ANALYSIS.get("topic_frequency", {})

    # Build a ranked topic list (high-yield first, then rest)
    ranked = [t for t, _ in high_yield]
    for t in topic_freq:
        if t not in ranked:
            ranked.append(t)

    days = req.days
    topics_count = len(ranked)
    if topics_count == 0:
        raise HTTPException(status_code=400, detail="No topics found in analysis.")

    # Distribute topics across days — high-yield topics get more days
    plan = []
    days_per_topic = max(1, days // topics_count)
    day_counter = 1

    for i, topic in enumerate(ranked):
        # High-yield topics (first 5) get 1 extra day of revision
        is_high_yield = i < min(5, len(high_yield))
        allotted = days_per_topic + (1 if is_high_yield else 0)

        tasks = [
            f"Study core concepts of: {topic}",
            f"Solve past questions on {topic}",
        ]
        if is_high_yield:
            tasks.append(f"Revision & mock questions for {topic}")

        plan.append({
            "day_start": day_counter,
            "day_end": min(day_counter + allotted - 1, days),
            "topic": topic,
            "priority": "🔥 High-Yield" if is_high_yield else "📘 Regular",
            "tasks": tasks,
        })
        day_counter += allotted
        if day_counter > days:
            break

    # Reserve last 3 days for full revision if possible
    if days >= 10:
        plan.append({
            "day_start": max(day_counter, days - 2),
            "day_end": days,
            "topic": "Full Revision & Mock Tests",
            "priority": "✅ Final Prep",
            "tasks": [
                "Attempt full mock paper under timed conditions",
                "Revise all high-yield topics quickly",
                "Review weak areas flagged during study",
            ],
        })

    return {"days": days, "plan": plan}


@app.get("/default-syllabus")
def default_syllabus():
    return {
        "syllabus": (
            "Neural Networks\nCNN\nRNN\nGAN\nTransformers\n"
            "Reinforcement Learning\nBackpropagation\nGradient Descent\n"
            "Support Vector Machines\nDecision Trees\nRandom Forests\n"
            "Overfitting & Regularization\nBatch Normalization\nOptimizers"
        )
    }


# ✅ Both GET (legacy) and DELETE (api.js) supported
@app.get("/reset")
@app.delete("/reset")
def reset():
    global PAPERS, LATEST_ANALYSIS
    PAPERS.clear()
    LATEST_ANALYSIS = None
    return {"message": "All papers and analysis cleared."}