import { useState, useCallback } from "react";
import {
  uploadPaper,
  analyzePapers,
  generateStudyPlan,
  resetPapers,
  getDefaultSyllabus,
} from "./lib/api";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend,
} from "recharts";

// ── colour palette for charts ──────────────────────────────────────────────
const PALETTE = [
  "#6366f1", "#8b5cf6", "#14b8a6", "#f87171",
  "#fbbf24", "#34d399", "#38bdf8", "#fb923c",
];

// ── tiny helpers ───────────────────────────────────────────────────────────
const Section = ({ title, children }) => (
  <div className="panel fade-in" style={{ padding: "22px 26px", marginBottom: 20 }}>
    <h2 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 700, color: "var(--text-secondary)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
      {title}
    </h2>
    {children}
  </div>
);

const Badge = ({ label, count, color = PALETTE[0] }) => (
  <div style={{
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "10px 14px", marginBottom: 8,
    background: "var(--bg-surface)", borderRadius: 10,
    border: "1px solid var(--border)",
  }}>
    <span style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: 13 }}>{label}</span>
    <span style={{
      fontWeight: 700, fontSize: 13, padding: "2px 10px",
      borderRadius: 99, background: color + "22", color,
      border: `1px solid ${color}44`,
    }}>{count}</span>
  </div>
);

// ── custom tooltip for recharts ────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: "var(--bg-card)", border: "1px solid var(--border-bright)",
        borderRadius: 10, padding: "10px 14px",
      }}>
        <p style={{ margin: 0, fontWeight: 700, fontSize: 12, color: "var(--text-primary)" }}>{label}</p>
        <p style={{ margin: "4px 0 0", fontSize: 12, color: PALETTE[0] }}>
          {payload[0].value} questions
        </p>
      </div>
    );
  }
  return null;
};

// ══════════════════════════════════════════════════════════════════════════
export default function App() {
  // ── state ──────────────────────────────────────────────────────────────
  const [files, setFiles]           = useState([]);
  const [uploadedPapers, setUploadedPapers] = useState([]);
  const [syllabus, setSyllabus]     = useState("Neural Networks\nCNN\nRNN\nGAN\nTransformers\nReinforcement Learning\nBackpropagation\nGradient Descent\nSupport Vector Machines\nDecision Trees");
  const [analysis, setAnalysis]     = useState(null);
  const [studyPlan, setStudyPlan]   = useState(null);
  const [studyDays, setStudyDays]   = useState(30);
  const [loading, setLoading]       = useState("");
  const [error, setError]           = useState("");
  const [dragging, setDragging]     = useState(false);
  const [tab, setTab]               = useState("upload"); // upload | analysis | studyplan

  const setErr = (msg) => { setError(msg); setTimeout(() => setError(""), 5000); };

  // ── drag & drop ────────────────────────────────────────────────────────
  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    const dropped = Array.from(e.dataTransfer.files).filter(f => f.type === "application/pdf");
    if (dropped.length) setFiles(prev => [...prev, ...dropped]);
    else setErr("Only PDF files are accepted.");
  }, []);

  // ── upload papers ──────────────────────────────────────────────────────
  const handleUpload = async () => {
    if (!files.length) { setErr("Add at least one PDF."); return; }
    setLoading("upload");
    try {
      const results = [];
      for (const f of files) {
        const res = await uploadPaper(f);
        results.push({ name: f.name, count: res.count });
      }
      setUploadedPapers(results);
      setFiles([]);
      setError("");
      setTab("analysis");
    } catch (e) {
      setErr(e.message || "Upload failed.");
    } finally {
      setLoading("");
    }
  };

  // ── analyze ────────────────────────────────────────────────────────────
  const handleAnalyze = async () => {
    if (!syllabus.trim()) { setErr("Enter syllabus topics."); return; }
    setLoading("analyze");
    try {
      const data = await analyzePapers(syllabus);
      setAnalysis(data);
      setError("");
    } catch (e) {
      setErr(e.message || "Analysis failed.");
    } finally {
      setLoading("");
    }
  };

  // ── study plan ─────────────────────────────────────────────────────────
  const handleStudyPlan = async () => {
    setLoading("plan");
    try {
      const data = await generateStudyPlan(Number(studyDays));
      setStudyPlan(data);
      setError("");
      setTab("studyplan");
    } catch (e) {
      setErr(e.message || "Study plan generation failed.");
    } finally {
      setLoading("");
    }
  };

  // ── reset ──────────────────────────────────────────────────────────────
  const handleReset = async () => {
    setLoading("reset");
    try {
      await resetPapers();
      setUploadedPapers([]);
      setAnalysis(null);
      setStudyPlan(null);
      setError("");
      setTab("upload");
    } catch (e) {
      setErr(e.message || "Reset failed.");
    } finally {
      setLoading("");
    }
  };

  // ── chart data ─────────────────────────────────────────────────────────
  const barData = analysis
    ? Object.entries(analysis.topic_frequency || {})
        .sort((a, b) => b[1] - a[1])
        .slice(0, 12)
        .map(([name, value]) => ({ name: name.length > 18 ? name.slice(0, 18) + "…" : name, value }))
    : [];

  const pieData = analysis
    ? (analysis.high_yield_topics || []).map(([name, value]) => ({ name, value }))
    : [];

  // ══════════════════════════════════════════════════════════════════════
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-base)", display: "flex", flexDirection: "column" }}>

      {/* ── HEADER ── */}
      <header style={{
        background: "var(--bg-surface)",
        borderBottom: "1px solid var(--border)",
        padding: "0 32px",
        height: 64,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        position: "sticky", top: 0, zIndex: 100,
        backdropFilter: "blur(10px)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: "linear-gradient(135deg, var(--accent), var(--accent-2))",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18, boxShadow: "0 0 14px var(--accent-glow)",
          }}>🧠</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16, color: "var(--text-primary)" }}>AI DecodeX</div>
            <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: -2 }}>Universal Exam Analyzer</div>
          </div>
        </div>

        <nav style={{ display: "flex", gap: 6 }}>
          {[
            { id: "upload",    label: "📄 Upload" },
            { id: "analysis",  label: "📊 Analysis" },
            { id: "studyplan", label: "📅 Study Plan" },
          ].map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              style={{
                padding: "7px 16px",
                borderRadius: 9,
                border: tab === id ? "1px solid var(--accent)" : "1px solid transparent",
                background: tab === id ? "rgba(99,102,241,0.15)" : "transparent",
                color: tab === id ? "#a5b4fc" : "var(--text-secondary)",
                fontWeight: 600, fontSize: 13, cursor: "pointer",
                transition: "all 0.18s",
              }}
            >{label}</button>
          ))}
        </nav>

        <button
          id="btn-reset"
          onClick={handleReset}
          disabled={loading === "reset"}
          className="secondary-button"
          style={{ fontSize: 12, padding: "7px 14px" }}
        >
          {loading === "reset" ? <span className="spin">⟳</span> : "🗑 Reset All"}
        </button>
      </header>

      {/* ── ERROR BANNER ── */}
      {error && (
        <div style={{
          background: "rgba(248,113,113,0.12)", border: "1px solid rgba(248,113,113,0.35)",
          color: "#fca5a5", padding: "12px 32px", fontSize: 13, textAlign: "center",
          animation: "fadeIn 0.25s ease",
        }}>{error}</div>
      )}

      {/* ── MAIN ── */}
      <main style={{ flex: 1, maxWidth: 960, width: "100%", margin: "32px auto", padding: "0 24px" }}>

        {/* ══════════════ UPLOAD TAB ══════════════ */}
        {tab === "upload" && (
          <div className="fade-in">
            {/* drop zone */}
            <Section title="📄 Upload Question Papers (PDF)">
              <div
                id="drop-zone"
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                style={{
                  border: `2px dashed ${dragging ? "var(--accent)" : "var(--border-bright)"}`,
                  borderRadius: 12,
                  padding: "40px 24px",
                  textAlign: "center",
                  background: dragging ? "rgba(99,102,241,0.08)" : "var(--bg-surface)",
                  transition: "all 0.2s",
                  cursor: "pointer",
                }}
                onClick={() => document.getElementById("file-input").click()}
              >
                <div style={{ fontSize: 40, marginBottom: 10 }}>📂</div>
                <p style={{ color: "var(--text-secondary)", margin: 0, fontSize: 14 }}>
                  Drag & drop PDFs here, or <span style={{ color: "#a5b4fc", fontWeight: 600 }}>click to browse</span>
                </p>
                <p style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 6 }}>Supports multiple files</p>
              </div>
              <input
                id="file-input"
                type="file"
                accept="application/pdf"
                multiple
                style={{ display: "none" }}
                onChange={(e) => setFiles(prev => [...prev, ...Array.from(e.target.files)])}
              />

              {/* pending file list */}
              {files.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  {files.map((f, i) => (
                    <div key={i} style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "8px 14px", background: "var(--bg-surface)", borderRadius: 9,
                      border: "1px solid var(--border)", marginBottom: 6,
                    }}>
                      <span style={{ fontSize: 13, color: "var(--text-primary)" }}>📄 {f.name}</span>
                      <button
                        onClick={() => setFiles(prev => prev.filter((_, j) => j !== i))}
                        style={{ background: "none", border: "none", color: "var(--coral)", cursor: "pointer", fontSize: 16 }}
                      >✕</button>
                    </div>
                  ))}
                  <button
                    id="btn-upload"
                    onClick={handleUpload}
                    disabled={loading === "upload"}
                    className="primary-button"
                    style={{ marginTop: 12, width: "100%" }}
                  >
                    {loading === "upload"
                      ? <><span className="spin" style={{ display: "inline-block" }}>⟳</span> Uploading…</>
                      : `🚀 Upload ${files.length} Paper${files.length > 1 ? "s" : ""}`}
                  </button>
                </div>
              )}

              {/* already uploaded */}
              {uploadedPapers.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <p style={{ color: "var(--green)", fontWeight: 600, fontSize: 13, marginBottom: 8 }}>
                    ✅ {uploadedPapers.length} paper{uploadedPapers.length > 1 ? "s" : ""} uploaded
                  </p>
                  {uploadedPapers.map((p, i) => (
                    <div key={i} style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "7px 12px", background: "rgba(52,211,153,0.08)",
                      border: "1px solid rgba(52,211,153,0.2)", borderRadius: 8, marginBottom: 5,
                    }}>
                      <span style={{ fontSize: 12, color: "var(--green)" }}>✓ {p.name}</span>
                      <span style={{ fontSize: 11, color: "var(--text-muted)" }}>total: {p.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </Section>

            {/* syllabus */}
            <Section title="📝 Syllabus Topics">
              <p style={{ color: "var(--text-secondary)", fontSize: 13, marginTop: 0, marginBottom: 12 }}>
                Enter one topic per line. These will be used to map exam questions.
              </p>
              <textarea
                id="syllabus-input"
                className="field"
                value={syllabus}
                onChange={(e) => setSyllabus(e.target.value)}
                rows={10}
                placeholder="Neural Networks&#10;CNN&#10;Backpropagation&#10;..."
                style={{ resize: "vertical", fontFamily: "monospace", fontSize: 13 }}
              />
              <button
                id="btn-analyze"
                onClick={handleAnalyze}
                disabled={loading === "analyze" || uploadedPapers.length === 0}
                className="primary-button"
                style={{ marginTop: 14, width: "100%" }}
              >
                {loading === "analyze"
                  ? <><span className="spin" style={{ display: "inline-block" }}>⟳</span> Analyzing…</>
                  : "🔍 Analyze Papers"}
              </button>
              {uploadedPapers.length === 0 && (
                <p style={{ fontSize: 12, color: "var(--text-muted)", textAlign: "center", marginTop: 8 }}>
                  Upload at least one paper first.
                </p>
              )}
            </Section>
          </div>
        )}

        {/* ══════════════ ANALYSIS TAB ══════════════ */}
        {tab === "analysis" && (
          <div className="fade-in">
            {!analysis ? (
              <div style={{ textAlign: "center", padding: "80px 0", color: "var(--text-muted)" }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
                <p style={{ fontSize: 15 }}>No analysis yet. Upload papers and run analysis first.</p>
                <button className="primary-button" style={{ marginTop: 16 }} onClick={() => setTab("upload")}>
                  Go to Upload
                </button>
              </div>
            ) : (
              <>
                {/* high yield topics */}
                <Section title="🏆 High-Yield Topics">
                  {(analysis.high_yield_topics || []).map(([topic, count], i) => (
                    <Badge key={i} label={topic} count={`${count} Qs`} color={PALETTE[i % PALETTE.length]} />
                  ))}
                  {(!analysis.high_yield_topics || analysis.high_yield_topics.length === 0) && (
                    <p style={{ color: "var(--text-muted)", fontSize: 13 }}>No topics found.</p>
                  )}
                </Section>

                {/* bar chart */}
                {barData.length > 0 && (
                  <Section title="📈 Topic Frequency — Bar Chart">
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={barData} margin={{ top: 8, right: 8, bottom: 40, left: 0 }}>
                        <XAxis
                          dataKey="name"
                          tick={{ fill: "var(--text-secondary)", fontSize: 10 }}
                          angle={-35}
                          textAnchor="end"
                          interval={0}
                        />
                        <YAxis tick={{ fill: "var(--text-secondary)", fontSize: 10 }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                          {barData.map((_, i) => (
                            <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </Section>
                )}

                {/* pie chart */}
                {pieData.length > 0 && (
                  <Section title="🥧 High-Yield Distribution — Pie Chart">
                    <ResponsiveContainer width="100%" height={280}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          labelLine={false}
                        >
                          {pieData.map((_, i) => (
                            <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                          ))}
                        </Pie>
                        <Legend iconType="circle" wrapperStyle={{ fontSize: 11, color: "var(--text-secondary)" }} />
                        <Tooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </Section>
                )}

                {/* all questions */}
                <Section title="❓ Mapped Questions">
                  <div style={{ maxHeight: 340, overflowY: "auto", paddingRight: 4 }}>
                    {(analysis.questions || []).slice(0, 60).map((q, i) => (
                      <div key={i} style={{
                        padding: "10px 14px", marginBottom: 7,
                        background: "var(--bg-surface)", borderRadius: 9,
                        border: "1px solid var(--border)",
                        display: "flex", gap: 12, alignItems: "flex-start",
                      }}>
                        <span style={{ color: "var(--text-muted)", fontSize: 11, minWidth: 24, fontWeight: 600 }}>
                          {i + 1}.
                        </span>
                        <div>
                          <p style={{ margin: 0, fontSize: 13, color: "var(--text-primary)", lineHeight: 1.5 }}>
                            {q.question}
                          </p>
                          <span className="tag tag-accent" style={{ marginTop: 6, display: "inline-flex" }}>
                            {q.topic}
                          </span>
                        </div>
                      </div>
                    ))}
                    {(analysis.questions || []).length > 60 && (
                      <p style={{ color: "var(--text-muted)", fontSize: 12, textAlign: "center" }}>
                        Showing first 60 of {analysis.questions.length} questions.
                      </p>
                    )}
                  </div>
                </Section>

                {/* study plan trigger */}
                <Section title="📅 Generate Study Plan">
                  <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                    <label style={{ color: "var(--text-secondary)", fontSize: 13 }}>Days available:</label>
                    <input
                      id="study-days-input"
                      type="number"
                      min={7} max={180}
                      value={studyDays}
                      onChange={(e) => setStudyDays(e.target.value)}
                      className="field"
                      style={{ width: 100 }}
                    />
                    <button
                      id="btn-study-plan"
                      onClick={handleStudyPlan}
                      disabled={loading === "plan"}
                      className="primary-button"
                    >
                      {loading === "plan"
                        ? <><span className="spin" style={{ display: "inline-block" }}>⟳</span> Generating…</>
                        : "📅 Generate Plan"}
                    </button>
                  </div>
                </Section>
              </>
            )}
          </div>
        )}

        {/* ══════════════ STUDY PLAN TAB ══════════════ */}
        {tab === "studyplan" && (
          <div className="fade-in">
            {!studyPlan ? (
              <div style={{ textAlign: "center", padding: "80px 0", color: "var(--text-muted)" }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>📅</div>
                <p style={{ fontSize: 15 }}>No study plan yet. Run analysis first, then generate a plan.</p>
                <button className="primary-button" style={{ marginTop: 16 }} onClick={() => setTab("analysis")}>
                  Go to Analysis
                </button>
              </div>
            ) : (
              <>
                <Section title={`📅 ${studyDays}-Day Study Plan`}>
                  {studyPlan.plan && Array.isArray(studyPlan.plan) ? (
                    studyPlan.plan.map((week, wi) => (
                      <div key={wi} style={{ marginBottom: 20 }}>
                        <h3 style={{ color: PALETTE[wi % PALETTE.length], fontSize: 13, fontWeight: 700, marginBottom: 10 }}>
                          {week.week || `Week ${wi + 1}`}
                        </h3>
                        {(week.days || []).map((day, di) => (
                          <div key={di} style={{
                            padding: "10px 14px", marginBottom: 6,
                            background: "var(--bg-surface)", borderRadius: 9,
                            border: "1px solid var(--border)",
                          }}>
                            <div style={{ fontWeight: 600, fontSize: 13, color: "var(--text-primary)", marginBottom: 4 }}>
                              Day {day.day}: {day.topic}
                            </div>
                            {day.tasks && (
                              <ul style={{ margin: 0, paddingLeft: 18, color: "var(--text-secondary)", fontSize: 12 }}>
                                {day.tasks.map((t, ti) => <li key={ti}>{t}</li>)}
                              </ul>
                            )}
                          </div>
                        ))}
                      </div>
                    ))
                  ) : (
                    /* fallback: render raw JSON if structure is different */
                    <pre style={{
                      background: "var(--bg-surface)", border: "1px solid var(--border)",
                      borderRadius: 10, padding: 16, fontSize: 12,
                      color: "var(--text-secondary)", overflowX: "auto", maxHeight: 500,
                    }}>
                      {JSON.stringify(studyPlan, null, 2)}
                    </pre>
                  )}
                </Section>
              </>
            )}
          </div>
        )}
      </main>

      {/* ── FOOTER ── */}
      <footer style={{
        textAlign: "center", padding: "20px 0",
        color: "var(--text-muted)", fontSize: 12,
        borderTop: "1px solid var(--border)",
      }}>
        AI DecodeX — Universal Exam Analyzer &nbsp;·&nbsp; Built for Hackathon 2026
      </footer>
    </div>
  );
}