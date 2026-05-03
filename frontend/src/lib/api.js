const API_BASE_URL = "http://127.0.0.1:8000"; // ✅ matches uvicorn port

async function parseResponse(response) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.detail || "Something went wrong contacting the API.");
  }
  return payload;
}

export async function uploadPaper(file, year) {
  const formData = new FormData();
  formData.append("file", file);
  if (year) formData.append("year", year);

  return parseResponse(
    await fetch(`${API_BASE_URL}/upload-paper`, {
      method: "POST",
      body: formData,
    })
  );
}

export async function analyzePapers(syllabus = "") {
  const formData = new FormData();
  formData.append("syllabus", syllabus); // ✅ FIXED

  return parseResponse(
    await fetch(`${API_BASE_URL}/analyze`, {
      method: "POST",
      body: formData,
    })
  );
}

export async function getInsights() {
  return parseResponse(await fetch(`${API_BASE_URL}/insights`));
}

export async function generateStudyPlan(days) {
  return parseResponse(
    await fetch(`${API_BASE_URL}/generate-study-plan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" }, // ✅ this one is correct
      body: JSON.stringify({ days }),
    })
  );
}

export async function resetPapers() {
  return parseResponse(
    await fetch(`${API_BASE_URL}/reset`, { method: "DELETE" })
  );
}

export async function getDefaultSyllabus() {
  return parseResponse(await fetch(`${API_BASE_URL}/default-syllabus`));
}

export async function getPapers() {
  return parseResponse(await fetch(`${API_BASE_URL}/papers`));
}