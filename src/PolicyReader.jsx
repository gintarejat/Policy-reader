import { useState, useCallback } from "react";

const SAMPLE_V1 = `SECTION 1 — SCOPE AND APPLICATION
This policy applies to all customer accounts opened after 1 January 2023. Daily transaction limits are set at EUR 5,000 for standard accounts. Customers must provide full KYC documentation within 30 days of account opening. Non-compliance results in account restriction.

SECTION 12 — SANCTIONS SCREENING
All customers must be screened against the EU Consolidated Sanctions List and OFAC SDN List at onboarding. Re-screening is conducted on an annual basis. Matches are reviewed by the Compliance team within 48 hours.

SECTION 19 — CRYPTO ASSET CONTROLS
The company does not accept deposits originating from cryptocurrency mixers. Bitcoin and Ethereum transactions are permitted up to EUR 5,000 per day. Transactions from high-risk jurisdictions flagged by FATF must be referred for EDD review. Stablecoins are permitted without restriction. Source of Funds verification is required for deposits above EUR 10,000.

SECTION 22 — PEP REQUIREMENTS
All Politically Exposed Persons require prior senior management approval before account opening. Enhanced due diligence is mandatory for all PEP accounts. Annual review is required for all active PEP relationships.`;

const SAMPLE_V2 = `SECTION 1 — SCOPE AND APPLICATION
This policy applies to all customer accounts opened after 1 January 2023. Daily transaction limits are set at EUR 10,000 for standard accounts and EUR 3,000 for newly onboarded accounts in the first 90 days. Customers must provide full KYC documentation within 14 days of account opening. Non-compliance results in immediate account suspension.

SECTION 12 — SANCTIONS SCREENING
All customers must be screened against the EU Consolidated Sanctions List, OFAC SDN List, and UN Consolidated List at onboarding and upon any material change to customer profile. Re-screening is conducted on a quarterly basis for high-risk customers and annually for standard customers. Matches are reviewed by the MLRO within 24 hours. OFAC hits require immediate asset freeze and reporting within 10 business days.

SECTION 19 — CRYPTO ASSET CONTROLS
The company does not accept deposits originating from cryptocurrency mixers, tumblers, or privacy-enhancing protocols. Bitcoin and Ethereum transactions are permitted up to EUR 3,000 per day. Monero, Zcash, and Dash are strictly prohibited. Transactions from FATF grey-listed or black-listed jurisdictions are prohibited. Stablecoins are permitted up to EUR 25,000 per month subject to Source of Funds verification. All crypto-to-fiat conversions above EUR 5,000 require blockchain analytics clearance.

SECTION 20 — DEFI AND SMART CONTRACT EXPOSURE [NEW SECTION]
Interactions with DeFi protocols require enhanced blockchain analytics review prior to processing. Transactions involving Tornado Cash smart contracts are prohibited under OFAC Executive Order 13694. Cross-chain bridge transactions above EUR 5,000 require MLRO pre-approval. NFT transactions above EUR 10,000 require Source of Funds documentation.

SECTION 22 — PEP REQUIREMENTS
All Politically Exposed Persons require prior senior management approval before account opening. Enhanced due diligence is mandatory for all PEP accounts. Quarterly review is required for all active PEP relationships. A written Source of Wealth assessment must be completed and filed within 30 days of PEP identification. PEP exit monitoring continues for 24 months after the individual leaves public office.`;

function safeJSON(text) {
  let t = text.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) t = fence[1].trim();
  const objStart = t.indexOf("{");
  const arrStart = t.indexOf("[");
  const start =
    objStart === -1 ? arrStart
    : arrStart === -1 ? objStart
    : Math.min(objStart, arrStart);
  if (start > 0) t = t.slice(start);
  const lastCurly = t.lastIndexOf("}");
  const lastSquare = t.lastIndexOf("]");
  const end = Math.max(lastCurly, lastSquare);
  if (end !== -1 && end < t.length - 1) t = t.slice(0, end + 1);
  return JSON.parse(t);
}

async function callClaude(payload) {
  const res = await fetch("/api/claude", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  const data = await res.json();
  return data.content[0].text;
}

const TYPE_CONFIG = {
  prohibited:  { label: "PROHIBITED",  bg: "#FDE8E8", color: "#B3070C", border: "#E4161B" },
  permitted:   { label: "PERMITTED",   bg: "#E3F0E6", color: "#1F7A3A", border: "#1F7A3A" },
  threshold:   { label: "THRESHOLD",   bg: "#FFF3B0", color: "#141414", border: "#B98900" },
  required:    { label: "REQUIRED",    bg: "#FFFDF8", color: "#141414", border: "#141414" },
  conditional: { label: "CONDITIONAL", bg: "#ECE6D8", color: "#141414", border: "#8A857B" },
  modified:    { label: "MODIFIED",    bg: "#FFF3B0", color: "#141414", border: "#B98900" },
  added:       { label: "ADDED",       bg: "#E3F0E6", color: "#1F7A3A", border: "#1F7A3A" },
  removed:     { label: "REMOVED",     bg: "#FDE8E8", color: "#B3070C", border: "#E4161B" },
};

function Badge({ type }) {
  const cfg = TYPE_CONFIG[type?.toLowerCase()] || TYPE_CONFIG.conditional;
  return (
    <span style={{
      display: "inline-block", fontSize: 9,
      fontFamily: "'Special Elite', 'Courier New', monospace", fontWeight: 600,
      letterSpacing: "0.1em", padding: "2px 7px", borderRadius: 0,
      background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
    }}>{cfg.label}</span>
  );
}

function applyHighlights(text, phrases, cls) {
  if (!phrases || phrases.length === 0) return <span>{text}</span>;
  let parts = [text];
  phrases.forEach((phrase) => {
    if (!phrase || phrase.length < 3) return;
    const next = [];
    parts.forEach((p) => {
      if (typeof p !== "string") { next.push(p); return; }
      const idx = p.toLowerCase().indexOf(phrase.toLowerCase());
      if (idx === -1) { next.push(p); return; }
      next.push(p.slice(0, idx));
      next.push(
        <span key={phrase + idx} className={cls}>
          {p.slice(idx, idx + phrase.length)}
        </span>
      );
      next.push(p.slice(idx + phrase.length));
    });
    parts = next;
  });
  return <>{parts}</>;
}

export default function PolicyReader() {
  const [mode, setMode] = useState("compare");
  const [v1, setV1] = useState("");
  const [v2, setV2] = useState("");
  const [analyzeText, setAnalyzeText] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadMsg, setLoadMsg] = useState("");
  const [compareResult, setCompareResult] = useState(null);
  const [analyzeResult, setAnalyzeResult] = useState(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [expandedSection, setExpandedSection] = useState(null);

  const loadSample = () => {
    if (mode === "compare") {
      setV1(SAMPLE_V1);
      setV2(SAMPLE_V2);
    } else {
      setAnalyzeText(SAMPLE_V2);
    }
  };

  const runCompare = useCallback(async () => {
    if (!v1.trim() || !v2.trim()) {
      setError("Please paste both policy versions.");
      return;
    }
    setError("");
    setLoading(true);
    setCompareResult(null);
    setLoadMsg("Reading Version 1…");
    const t1 = setTimeout(() => setLoadMsg("Comparing sections…"), 1200);
    const t2 = setTimeout(() => setLoadMsg("Identifying changes…"), 2500);
    try {
   const prompt = "You are a compliance document analyst. Compare these two policy versions precisely.\n\n" +
  "VERSION 1:\n" + v1 + "\n\n" +
  "VERSION 2:\n" + v2 + "\n\n" +
  "CRITICAL: Your entire response must be a single raw JSON object. No markdown. No backticks. No explanation. No text before or after. Start with { and end with }.\n\n" +
  "Return this exact structure:\n" +
  '{"summary":"1-2 sentence overall summary","total_changes":4,"changes":[{"section":"Section 19 — Crypto Asset Controls","type":"modified","summary":"One sentence","old_text":"Full text from V1","new_text":"Full text from V2","old_highlights":["changed phrase"],"new_highlights":["new phrase"]}]}\n\n' +
  "Type must be: modified, added, or removed. Return ONLY the JSON object.";
      
      const raw = await callClaude({
        model: "claude-sonnet-4-5",
        max_tokens: 4000,
        messages: [{ role: "user", content: prompt }],
      });
      setCompareResult(safeJSON(raw));
    } catch (e) {
      setError("Analysis failed: " + e.message);
    } finally {
      clearTimeout(t1);
      clearTimeout(t2);
      setLoading(false);
      setLoadMsg("");
    }
  }, [v1, v2]);

  const runAnalyze = useCallback(async () => {
    if (!analyzeText.trim()) {
      setError("Please paste a policy document.");
      return;
    }
    setError("");
    setLoading(true);
    setAnalyzeResult(null);
    setLoadMsg("Parsing document structure…");
    const t1 = setTimeout(() => setLoadMsg("Extracting keywords and rules…"), 1500);
    const t2 = setTimeout(() => setLoadMsg("Grouping thresholds…"), 3000);
    try {
      const prompt = "You are a compliance document analyst. Analyze this policy document.\n\n" +
  "CRITICAL: Your entire response must be a single raw JSON object. No markdown. No backticks. No explanation. No text before or after. Start your response with { and end with }.\n\n" +
  "POLICY DOCUMENT:\n" + analyzeText + "\n\n" +
  "Return this exact structure:\n" +
  '{"document_title":"inferred title","document_type":"e.g. AML Policy","jurisdiction":"e.g. EU / Nordic","scope_summary":"2-3 sentence summary","sections":[{"id":"19","title":"Crypto Asset Controls","keywords":["crypto","bitcoin"]}],"rules":[{"section_id":"19","section_title":"Crypto Asset Controls","keyword":"crypto mixer","type":"prohibited","rule_text":"The company does not accept deposits from mixers.","threshold":null,"applies_to":"all customers"}],"thresholds_summary":[{"section_id":"19","section_title":"Crypto Asset Controls","subject":"BTC/ETH daily","limit":"EUR 3,000 per day","condition":"Standard accounts"}]}\n\n' +
  "Types: prohibited, permitted, threshold, required, conditional. Extract every distinct rule. Return ONLY the JSON object.";

      const raw = await callClaude({
        model: 'claude-sonnet-4-5',
        max_tokens: 4000,
        messages: [{ role: "user", content: prompt }],
      });
      setAnalyzeResult(safeJSON(raw));
    } catch (e) {
      setError("Analysis failed: " + e.message);
    } finally {
      clearTimeout(t1);
      clearTimeout(t2);
      setLoading(false);
      setLoadMsg("");
    }
  }, [analyzeText]);

  const filteredRules =
    analyzeResult?.rules?.filter((r) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        r.keyword?.toLowerCase().includes(q) ||
        r.rule_text?.toLowerCase().includes(q) ||
        r.section_title?.toLowerCase().includes(q) ||
        r.type?.toLowerCase().includes(q)
      );
    }) ?? [];

  const groupedRules = filteredRules.reduce((acc, rule) => {
    const key = rule.keyword || "general";
    if (!acc[key]) acc[key] = [];
    acc[key].push(rule);
    return acc;
  }, {});

  return (
    <div style={{ fontFamily: "'Archivo', system-ui, sans-serif", minHeight: "100vh", background: "#F3EFE6", color: "#141414" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Archivo+Black&family=Archivo:wght@400;500;600;700&family=Permanent+Marker&family=Special+Elite&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        textarea { font-family: 'Special Elite', 'Courier New', monospace; font-size: 11px; line-height: 1.65; resize: vertical; width: 100%; padding: 12px 14px; background: #FFFDF8; border: 1px solid #141414; border-radius: 0; color: #141414; outline: none; transition: border-color 0.15s; }
        textarea:focus { border-color: #E4161B; }
        textarea::placeholder { color: #8A857B; }
        button { cursor: pointer; transition: all 0.15s; }
        .diff-del { background: #FDE8E8; color: #B3070C; text-decoration: line-through; text-decoration-color: #E4161B; text-decoration-thickness: 2px; border-radius: 0; padding: 0 2px; font-weight: 500; }
        .diff-add { background: #E3F0E6; color: #1F7A3A; border-radius: 0; padding: 0 2px; font-weight: 500; }
        .section-card { background: #FFFDF8; border: 1px solid #141414; border-radius: 0; overflow: hidden; margin-bottom: 12px; }
        .section-card:hover { border-color: #8A857B; }
        .rule-card { background: #FFFDF8; border: 1px solid #D6CFBF; border-radius: 0; padding: 11px 13px; margin-bottom: 8px; }
        .keyword-group { margin-bottom: 18px; }
        .spin { animation: spin 0.8s linear infinite; display: inline-block; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .fade-in { animation: fadeIn 0.4s ease; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        /* ══ AML Operating System theme ══ */
        body { background: #F3EFE6; }
        body::before { content: ""; position: fixed; inset: -50%; pointer-events: none; z-index: 9999; opacity: .18; mix-blend-mode: multiply; animation: grain .5s steps(1) infinite;
          background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .5 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>"); }
        @keyframes grain { 0%{transform:translate(0,0)} 25%{transform:translate(-3%,2%)} 50%{transform:translate(2%,-3%)} 75%{transform:translate(-1%,-2%)} }
        @media (prefers-reduced-motion: reduce) { body::before { animation: none; } }
        h1 { text-transform: uppercase; letter-spacing: -0.01em; font-weight: 400 !important; }
        textarea { border-width: 1.5px; }
        textarea:focus { box-shadow: 3px 3px 0 #FFD60A; }
        .section-card { border-width: 2px; box-shadow: 4px 5px 0 #141414; transition: transform .18s steps(3,end), box-shadow .18s steps(3,end); }
        .section-card:hover { border-color: #141414; transform: translate(-2px,-2px); box-shadow: 6px 7px 0 #141414; }
        .rule-card { border-width: 1.5px; transition: transform .18s steps(3,end), box-shadow .18s steps(3,end); }
        .rule-card:hover { transform: translate(-2px,-2px); box-shadow: 4px 4px 0 #141414; }
        button { transition: transform .15s steps(2,end), box-shadow .15s steps(2,end); font-family: 'Archivo Black', sans-serif; letter-spacing: .04em; }
        button:hover:not(:disabled) { transform: translate(-2px,-2px); box-shadow: 3px 3px 0 #141414; }
        .diff-add { background: #FFF3B0; }
        .fade-in { animation: fadeIn .4s steps(4,end); }
        .aos-back { position: fixed; right: 16px; bottom: 14px; z-index: 10000; font-family: 'Archivo Black', sans-serif; font-size: 12px; letter-spacing: .03em;
          text-decoration: none; color: #FFFDF8; background: #141414; padding: 7px 11px 6px; transform: rotate(-2deg); box-shadow: 3px 3px 0 #E4161B; }
        .aos-back:hover { transform: rotate(-2deg) translate(-2px,-2px); box-shadow: 5px 5px 0 #E4161B; }
      `}</style>
      <a className="aos-back" href="https://ajatauaml.com/aml-operating-system.html">&larr; AML Operating System</a>

      <div style={{ background: "#141414", padding: "0 28px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 52 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 28, height: 28, background: "#E4161B", borderRadius: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="1" y="1" width="5.5" height="12" rx="1" fill="white" opacity="0.9" />
              <rect x="7.5" y="1" width="5.5" height="12" rx="1" fill="white" opacity="0.5" />
              <rect x="3" y="3.5" width="2" height="1" fill="#141414" opacity="0.6" rx="0.5" />
              <rect x="3" y="5.5" width="2" height="1" fill="#141414" opacity="0.6" rx="0.5" />
              <rect x="3" y="7.5" width="2" height="1" fill="#141414" opacity="0.6" rx="0.5" />
            </svg>
          </div>
          <span style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 16, fontWeight: 600, color: "#FFFDF8" }}>Policy Reader</span>
          <span style={{ fontSize: 9, fontFamily: "'Special Elite', 'Courier New', monospace", color: "#FFD60A", letterSpacing: "0.1em" }}>AFC INTELLIGENCE SUITE</span>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {["compare", "analyze"].map((m) => (
            <button key={m}
              onClick={() => { setMode(m); setError(""); setSearch(""); }}
              style={{
                padding: "5px 14px", borderRadius: 0, fontSize: 11, fontWeight: 600,
                letterSpacing: "0.06em", textTransform: "uppercase", border: "none",
                background: mode === m ? "#E4161B" : "transparent",
                color: mode === m ? "#FFFDF8" : "#BDB6A6",
              }}>
              {m === "compare" ? "⬡ Compare" : "◈ Analyze"}
            </button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 20px" }}>

        {mode === "compare" && (
          <>
            <div style={{ marginBottom: 16 }}>
              <h1 style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 22, fontWeight: 700, margin: "0 0 4px", color: "#141414" }}>Policy Version Comparator</h1>
              <p style={{ margin: 0, fontSize: 12.5, color: "#5B564C" }}>Paste two versions of a policy document. The AI lists the changed sections and highlights what it finds added, removed, or modified. The text shown is reproduced by the AI, so check material changes against the originals.</p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <span style={{ width: 18, height: 18, background: "#FFF3B0", border: "1px solid #B98900", borderRadius: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: "#141414" }}>V1</span>
                  <label style={{ fontSize: 11.5, fontWeight: 600, color: "#141414" }}>Current / Original Policy</label>
                </div>
                <textarea rows={12} placeholder="Paste Version 1 here…" value={v1} onChange={(e) => setV1(e.target.value)} />
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <span style={{ width: 18, height: 18, background: "#E3F0E6", border: "1px solid #1F7A3A", borderRadius: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: "#1F7A3A" }}>V2</span>
                  <label style={{ fontSize: 11.5, fontWeight: 600, color: "#141414" }}>Updated / New Policy</label>
                </div>
                <textarea rows={12} placeholder="Paste Version 2 here…" value={v2} onChange={(e) => setV2(e.target.value)} />
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 20 }}>
              <button onClick={runCompare} disabled={loading}
                style={{ background: loading ? "#8A857B" : "#141414", color: "#FFFDF8", border: "none", borderRadius: 0, padding: "9px 20px", fontSize: 12, fontWeight: 600, letterSpacing: "0.04em", display: "flex", alignItems: "center", gap: 7 }}>
                {loading
                  ? <><span className="spin" style={{ width: 13, height: 13, border: "2px solid rgba(255,253,248,0.3)", borderTopColor: "#FFFDF8", borderRadius: "50%", display: "inline-block" }} />{loadMsg || "Analysing…"}</>
                  : "▶  Run Comparison"}
              </button>
              <button onClick={loadSample} style={{ background: "transparent", border: "1px solid #141414", borderRadius: 0, padding: "8px 14px", fontSize: 11.5, color: "#5B564C", fontWeight: 500 }}>Load sample policy</button>
              {compareResult && (
                <button onClick={() => setCompareResult(null)} style={{ background: "transparent", border: "1px solid #141414", borderRadius: 0, padding: "8px 14px", fontSize: 11.5, color: "#5B564C" }}>Clear</button>
              )}
            </div>

            {error && (
              <div style={{ background: "#FDE8E8", border: "1px solid #E4161B", borderRadius: 0, padding: "9px 13px", fontSize: 12, color: "#B3070C", marginBottom: 14 }}>{error}</div>
            )}

            {compareResult && (
              <div className="fade-in">
                <div style={{ background: "#141414", borderRadius: 0, padding: "12px 18px", marginBottom: 16, display: "flex", alignItems: "center", gap: 16 }}>
                  <div>
                    <div style={{ fontSize: 9, fontFamily: "'Special Elite', 'Courier New', monospace", color: "#FFD60A", letterSpacing: "0.1em", marginBottom: 2 }}>COMPARISON SUMMARY</div>
                    <div style={{ fontSize: 13, color: "#FFFDF8", fontWeight: 500 }}>{compareResult.summary}</div>
                  </div>
                  <div style={{ marginLeft: "auto", display: "flex", gap: 12, flexShrink: 0 }}>
                    {["modified", "added", "removed"].map((t) => {
                      const count = compareResult.changes?.filter((c) => c.type === t).length || 0;
                      if (!count) return null;
                      const cfg = TYPE_CONFIG[t];
                      return (
                        <div key={t} style={{ textAlign: "center" }}>
                          <div style={{ fontSize: 20, fontWeight: 700, color: cfg.border, fontFamily: "'Special Elite', 'Courier New', monospace" }}>{count}</div>
                          <div style={{ fontSize: 8, color: "#BDB6A6", textTransform: "uppercase", letterSpacing: "0.1em" }}>{t}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {compareResult.changes?.map((change, i) => (
                  <div key={i} className="section-card">
                    <div
                      style={{ padding: "10px 16px", display: "flex", alignItems: "center", gap: 10, borderBottom: "1px solid #ECE6D8", cursor: "pointer", background: expandedSection === i ? "#F7F3EA" : "#FFFDF8" }}
                      onClick={() => setExpandedSection(expandedSection === i ? null : i)}>
                      <Badge type={change.type} />
                      <span style={{ fontFamily: "'Special Elite', 'Courier New', monospace", fontSize: 11, fontWeight: 600, color: "#141414", flex: 1 }}>{change.section}</span>
                      <span style={{ fontSize: 11, color: "#5B564C", maxWidth: 340, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{change.summary}</span>
                      <span style={{ fontSize: 13, color: "#8A857B", marginLeft: 6 }}>{expandedSection === i ? "▲" : "▼"}</span>
                    </div>

                    {expandedSection === i && (
                      <div style={{ padding: "14px 16px" }}>
                        <div style={{ display: "grid", gridTemplateColumns: change.type === "added" || change.type === "removed" ? "1fr" : "1fr 1fr", gap: 12 }}>
                          {change.type !== "added" && change.old_text && (
                            <div>
                              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 7 }}>
                                <span style={{ width: 16, height: 16, background: "#FFF3B0", border: "1px solid #B98900", borderRadius: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, fontWeight: 700, color: "#141414" }}>V1</span>
                                <span style={{ fontSize: 10, fontWeight: 600, color: "#6B5000", textTransform: "uppercase" }}>Previous version</span>
                              </div>
                              <div style={{ fontFamily: "'Special Elite', 'Courier New', monospace", fontSize: 10.5, lineHeight: 1.7, color: "#141414", background: "#FFFDF8", border: "1px solid #E6CB5A", borderLeft: "3px solid #B98900", borderRadius: 0, padding: "10px 12px" }}>
                                {applyHighlights(change.old_text, change.old_highlights, "diff-del")}
                              </div>
                            </div>
                          )}
                          {change.type !== "removed" && change.new_text && (
                            <div>
                              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 7 }}>
                                <span style={{ width: 16, height: 16, background: "#E3F0E6", border: "1px solid #1F7A3A", borderRadius: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, fontWeight: 700, color: "#1F7A3A" }}>V2</span>
                                <span style={{ fontSize: 10, fontWeight: 600, color: "#1F7A3A", textTransform: "uppercase" }}>{change.type === "added" ? "New section" : "Updated version"}</span>
                              </div>
                              <div style={{ fontFamily: "'Special Elite', 'Courier New', monospace", fontSize: 10.5, lineHeight: 1.7, color: "#141414", background: "#F4FAF5", border: "1px solid #8FC49E", borderLeft: "3px solid #1F7A3A", borderRadius: 0, padding: "10px 12px" }}>
                                {applyHighlights(change.new_text, change.new_highlights, "diff-add")}
                              </div>
                            </div>
                          )}
                        </div>
                        {change.type === "modified" && ((change.old_highlights?.length || 0) + (change.new_highlights?.length || 0)) > 0 && (
                          <div style={{ marginTop: 10, padding: "8px 11px", background: "#F3EFE6", borderRadius: 0, display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                            <span style={{ fontSize: 9, fontFamily: "'Special Elite', 'Courier New', monospace", color: "#8A857B", textTransform: "uppercase", letterSpacing: "0.1em", marginRight: 4 }}>Changes:</span>
                            {change.old_highlights?.map((p, j) => <span key={"del" + j} className="diff-del" style={{ fontSize: 9 }}>{p}</span>)}
                            {change.new_highlights?.map((p, j) => <span key={"add" + j} className="diff-add" style={{ fontSize: 9 }}>{p}</span>)}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {mode === "analyze" && (
          <>
            <div style={{ marginBottom: 16 }}>
              <h1 style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 22, fontWeight: 700, margin: "0 0 4px", color: "#141414" }}>Policy Analyser</h1>
              <p style={{ margin: 0, fontSize: 12.5, color: "#5B564C" }}>Paste any compliance policy. The AI extracts keywords by section, then groups the rules, thresholds, and restrictions it finds into a searchable, structured view. Check each rule against its section before acting on it.</p>
            </div>

            <div style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <span style={{ width: 18, height: 18, background: "#FFF3B0", border: "1px solid #141414", borderRadius: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: "#141414" }}>◈</span>
                <label style={{ fontSize: 11.5, fontWeight: 600, color: "#141414" }}>Policy Document</label>
              </div>
              <textarea rows={10} placeholder="Paste your policy document here…" value={analyzeText} onChange={(e) => setAnalyzeText(e.target.value)} />
            </div>

            <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
              <button onClick={runAnalyze} disabled={loading}
                style={{ background: loading ? "#8A857B" : "#141414", color: "#FFFDF8", border: "none", borderRadius: 0, padding: "9px 20px", fontSize: 12, fontWeight: 600, letterSpacing: "0.04em", display: "flex", alignItems: "center", gap: 7 }}>
                {loading
                  ? <><span className="spin" style={{ width: 13, height: 13, border: "2px solid rgba(255,253,248,0.3)", borderTopColor: "#FFFDF8", borderRadius: "50%", display: "inline-block" }} />{loadMsg || "Analysing…"}</>
                  : "▶  Analyse Policy"}
              </button>
              <button onClick={loadSample} style={{ background: "transparent", border: "1px solid #141414", borderRadius: 0, padding: "8px 14px", fontSize: 11.5, color: "#5B564C", fontWeight: 500 }}>Load sample policy</button>
              {analyzeResult && (
                <button onClick={() => { setAnalyzeResult(null); setSearch(""); }}
                  style={{ background: "transparent", border: "1px solid #141414", borderRadius: 0, padding: "8px 14px", fontSize: 11.5, color: "#5B564C" }}>Clear</button>
              )}
            </div>

            {error && (
              <div style={{ background: "#FDE8E8", border: "1px solid #E4161B", borderRadius: 0, padding: "9px 13px", fontSize: 12, color: "#B3070C", marginBottom: 14 }}>{error}</div>
            )}

            {analyzeResult && (
              <div className="fade-in">
                <div style={{ background: "#141414", borderRadius: 0, padding: "16px 20px", marginBottom: 16, display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 20, alignItems: "start" }}>
                  <div style={{ gridColumn: "1 / -1", borderBottom: "1px solid #3A3630", paddingBottom: 10, marginBottom: 4 }}>
                    <div style={{ fontSize: 9, fontFamily: "'Special Elite', 'Courier New', monospace", color: "#FFD60A", letterSpacing: "0.1em", marginBottom: 3 }}>DOCUMENT IDENTIFIED</div>
                    <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 17, fontWeight: 700, color: "#FFFDF8" }}>{analyzeResult.document_title || "Policy Document"}</div>
                  </div>
                  {[
                    ["Type", analyzeResult.document_type],
                    ["Jurisdiction", analyzeResult.jurisdiction],
                    ["Sections", (analyzeResult.sections?.length || 0) + " sections"],
                    ["Rules extracted", (analyzeResult.rules?.length || 0) + " rules"],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <div style={{ fontSize: 8.5, fontFamily: "'Special Elite', 'Courier New', monospace", color: "#FFD60A", letterSpacing: "0.1em", marginBottom: 3 }}>{k.toUpperCase()}</div>
                      <div style={{ fontSize: 12, color: "#FFFDF8", fontWeight: 500 }}>{v}</div>
                    </div>
                  ))}
                  <div style={{ gridColumn: "1 / -1", paddingTop: 8, borderTop: "1px solid #3A3630" }}>
                    <div style={{ fontSize: 8.5, fontFamily: "'Special Elite', 'Courier New', monospace", color: "#FFD60A", letterSpacing: "0.1em", marginBottom: 5 }}>SCOPE SUMMARY</div>
                    <div style={{ fontSize: 12, color: "#D8D2C4", lineHeight: 1.6 }}>{analyzeResult.scope_summary}</div>
                  </div>
                </div>

                <div style={{ background: "#FFFDF8", border: "1px solid #141414", borderRadius: 0, padding: "14px 16px", marginBottom: 14 }}>
                  <div style={{ fontSize: 10, fontFamily: "'Special Elite', 'Courier New', monospace", fontWeight: 600, color: "#5B564C", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 11 }}>Keywords by Section</div>
                  {analyzeResult.sections?.map((sec) => (
                    <div key={sec.id} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "7px 0", borderBottom: "0.5px solid #ECE6D8" }}>
                      <span style={{ fontFamily: "'Special Elite', 'Courier New', monospace", fontSize: 10, fontWeight: 600, color: "#E4161B", minWidth: 28, paddingTop: 2 }}>§{sec.id}</span>
                      <span style={{ fontSize: 11, fontWeight: 600, color: "#141414", minWidth: 180, paddingTop: 2 }}>{sec.title}</span>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                        {sec.keywords?.map((kw) => (
                          <button key={kw} onClick={() => setSearch(kw)}
                            style={{ fontSize: 9, fontFamily: "'Special Elite', 'Courier New', monospace", padding: "2px 8px", borderRadius: 0, background: "#FFF3B0", border: "1px solid #141414", color: "#141414", cursor: "pointer", fontWeight: 500 }}>
                            {kw}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12, alignItems: "center" }}>
                  <span style={{ fontSize: 10, color: "#5B564C", marginRight: 4 }}>Filter by rule type:</span>
                  {Object.entries(TYPE_CONFIG)
                    .filter(([k]) => ["prohibited", "permitted", "threshold", "required", "conditional"].includes(k))
                    .map(([k, cfg]) => (
                      <button key={k} onClick={() => setSearch(k)}
                        style={{ fontSize: 9, fontFamily: "'Special Elite', 'Courier New', monospace", padding: "3px 9px", borderRadius: 0, background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color, cursor: "pointer", fontWeight: 600, letterSpacing: "0.06em" }}>
                        {cfg.label}
                      </button>
                    ))}
                  {search && (
                    <button onClick={() => setSearch("")}
                      style={{ fontSize: 9, padding: "3px 9px", borderRadius: 0, background: "#ECE6D8", border: "1px solid #141414", color: "#5B564C", cursor: "pointer" }}>
                      ✕ Clear filter
                    </button>
                  )}
                </div>

                <div style={{ position: "relative", marginBottom: 14 }}>
                  <input type="text" placeholder="Search rules by keyword, section, or type…" value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    style={{ width: "100%", padding: "9px 12px 9px 34px", borderRadius: 0, border: "1px solid #141414", fontSize: 12, background: "#FFFDF8", outline: "none", fontFamily: "'Archivo', system-ui, sans-serif" }} />
                  <span style={{ position: "absolute", left: 11, top: 10, fontSize: 14, color: "#8A857B" }}>⌕</span>
                  <span style={{ position: "absolute", right: 12, top: 10, fontSize: 10, color: "#8A857B", fontFamily: "'Special Elite', 'Courier New', monospace" }}>{filteredRules.length} rules</span>
                </div>

                {Object.keys(groupedRules).length === 0 && (
                  <div style={{ textAlign: "center", padding: "24px", color: "#8A857B", fontSize: 12 }}>No rules match your search.</div>
                )}

                {Object.entries(groupedRules).map(([keyword, rules]) => (
                  <div key={keyword} className="keyword-group">
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
                      <div style={{ height: 1, flex: 1, background: "#D6CFBF" }} />
                      <span style={{ fontFamily: "'Special Elite', 'Courier New', monospace", fontSize: 10, fontWeight: 600, color: "#E4161B", letterSpacing: "0.08em", background: "#FFF3B0", border: "1px solid #141414", borderRadius: 0, padding: "2px 10px" }}># {keyword}</span>
                      <div style={{ height: 1, flex: 1, background: "#D6CFBF" }} />
                    </div>
                    {rules.map((rule, i) => {
                      const cfg = TYPE_CONFIG[rule.type?.toLowerCase()] || TYPE_CONFIG.conditional;
                      return (
                        <div key={i} className="rule-card" style={{ borderLeft: `3px solid ${cfg.border}` }}>
                          <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 6 }}>
                            <Badge type={rule.type} />
                            <span style={{ fontFamily: "'Special Elite', 'Courier New', monospace", fontSize: 9, color: "#E4161B", background: "#FFF3B0", border: "1px solid #141414", borderRadius: 0, padding: "2px 6px" }}>
                              §{rule.section_id} — {rule.section_title}
                            </span>
                            {rule.applies_to && (
                              <span style={{ fontFamily: "'Special Elite', 'Courier New', monospace", fontSize: 9, color: "#5B564C", marginLeft: "auto" }}>applies to: {rule.applies_to}</span>
                            )}
                          </div>
                          <div style={{ fontSize: 12, lineHeight: 1.6, color: "#141414" }}>{rule.rule_text}</div>
                          {rule.threshold && (
                            <div style={{ marginTop: 7, display: "inline-flex", alignItems: "center", gap: 5, background: "#FFF3B0", border: "1px solid #B98900", borderRadius: 0, padding: "3px 9px" }}>
                              <span style={{ fontSize: 9, fontFamily: "'Special Elite', 'Courier New', monospace", fontWeight: 700, color: "#141414", textTransform: "uppercase", letterSpacing: "0.08em" }}>THRESHOLD</span>
                              <span style={{ fontSize: 11, fontFamily: "'Special Elite', 'Courier New', monospace", fontWeight: 600, color: "#6B5000" }}>{rule.threshold}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}

                {analyzeResult.thresholds_summary?.length > 0 && (
                  <div style={{ background: "#FFFDF8", border: "1px solid #141414", borderRadius: 0, padding: "14px 16px", marginTop: 6 }}>
                    <div style={{ fontSize: 10, fontFamily: "'Special Elite', 'Courier New', monospace", fontWeight: 600, color: "#5B564C", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>Thresholds Summary</div>
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                        <thead>
                          <tr style={{ background: "#F3EFE6" }}>
                            {["§", "Section", "Subject", "Limit", "Condition"].map((h) => (
                              <th key={h} style={{ padding: "6px 10px", textAlign: "left", fontSize: 9, fontFamily: "'Special Elite', 'Courier New', monospace", color: "#5B564C", fontWeight: 600, letterSpacing: "0.08em", borderBottom: "1px solid #D6CFBF" }}>{h.toUpperCase()}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {analyzeResult.thresholds_summary.map((t, i) => (
                            <tr key={i} style={{ borderBottom: "0.5px solid #ECE6D8" }}>
                              <td style={{ padding: "7px 10px", fontFamily: "'Special Elite', 'Courier New', monospace", fontSize: 10, color: "#E4161B", fontWeight: 600 }}>§{t.section_id}</td>
                              <td style={{ padding: "7px 10px", color: "#141414", fontWeight: 500 }}>{t.section_title}</td>
                              <td style={{ padding: "7px 10px", color: "#141414" }}>{t.subject}</td>
                              <td style={{ padding: "7px 10px" }}>
                                <span style={{ fontFamily: "'Special Elite', 'Courier New', monospace", fontSize: 11, fontWeight: 700, color: "#6B5000", background: "#FFF3B0", border: "1px solid #B98900", borderRadius: 0, padding: "1px 6px" }}>{t.limit}</span>
                              </td>
                              <td style={{ padding: "7px 10px", color: "#5B564C", fontSize: 11 }}>{t.condition || "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
