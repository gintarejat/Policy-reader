
import { useState, useCallback } from "react";

// ── Sample Data ────────────────────────────────────────────────────────────
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

// ── JSON parser (handles markdown-fenced responses) ────────────────────────
function safeJSON(text) {
  let t = text.trim();
  // Strip markdown fences
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) t = fence[1].trim();
  // If still not starting with { or [, find the first one
  const objStart = t.indexOf('{');
  const arrStart = t.indexOf('[');
  const start = objStart === -1 ? arrStart
    : arrStart === -1 ? objStart
    : Math.min(objStart, arrStart);
  if (start > 0) t = t.slice(start);
  // Trim trailing text after the last } or ]
  const lastCurly = t.lastIndexOf('}');
  const lastSquare = t.lastIndexOf(']');
  const end = Math.max(lastCurly, lastSquare);
  if (end !== -1 && end < t.length - 1) t = t.slice(0, end + 1);
  return JSON.parse(t);
}

// ── Inline diff highlight ──────────────────────────────────────────────────
function applyHighlights(text, phrases, cls) {
  if (!phrases?.length) return <span>{text}</span>;
  let parts = [text];
  phrases.forEach(phrase => {
    if (!phrase || phrase.length < 3) return;
    const next = [];
    parts.forEach(p => {
      if (typeof p !== "string") { next.push(p); return; }
      const idx = p.toLowerCase().indexOf(phrase.toLowerCase());
      if (idx === -1) { next.push(p); return; }
      next.push(p.slice(0, idx));
      next.push(<span key={phrase + idx} className={cls}>{p.slice(idx, idx + phrase.length)}</span>);
      next.push(p.slice(idx + phrase.length));
    });
    parts = next;
  });
  return <>{parts}</>;
}

// ── API call ───────────────────────────────────────────────────────────────
async function callClaude(prompt) {
  const res = await fetch("/api/claude", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      messages: [{ role: "user", content: prompt }]
    })
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  const data = await res.json();
  return data.content[0].text;
}

// ── Type badge config ──────────────────────────────────────────────────────
const TYPE_CONFIG = {
  prohibited: { label: "PROHIBITED", bg: "#FCEBEB", color: "#791F1F", border: "#F09595" },
  permitted:  { label: "PERMITTED",  bg: "#EAF3DE", color: "#27500A", border: "#97C459" },
  threshold:  { label: "THRESHOLD",  bg: "#FAEEDA", color: "#633806", border: "#EF9F27" },
  required:   { label: "REQUIRED",   bg: "#E6F1FB", color: "#042C53", border: "#85B7EB" },
  conditional:{ label: "CONDITIONAL",bg: "#EDE7FF", color: "#26215C", border: "#CECBF6" },
  modified:   { label: "MODIFIED",   bg: "#FAEEDA", color: "#633806", border: "#EF9F27" },
  added:      { label: "ADDED",      bg: "#EAF3DE", color: "#27500A", border: "#97C459" },
  removed:    { label: "REMOVED",    bg: "#FCEBEB", color: "#791F1F", border: "#F09595" },
};

function Badge({ type, custom }) {
  const cfg = TYPE_CONFIG[type?.toLowerCase()] || TYPE_CONFIG.conditional;
  return (
    <span style={{
      display: "inline-block",
      fontSize: 9, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600,
      letterSpacing: "0.1em", padding: "2px 7px", borderRadius: 3,
      background: cfg.bg, color: cfg.color,
      border: `1px solid ${cfg.border}`,
    }}>{custom || cfg.label}</span>
  );
}

// ── Main App ───────────────────────────────────────────────────────────────
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
    if (mode === "compare") { setV1(SAMPLE_V1); setV2(SAMPLE_V2); }
    else setAnalyzeText(SAMPLE_V2);
  };

  const runCompare = useCallback(async () => {
    if (!v1.trim() || !v2.trim()) { setError("Please paste both policy versions."); return; }
    setError(""); setLoading(true); setCompareResult(null);
    setLoadMsg("Reading Version 1…");
    setTimeout(() => setLoadMsg("Comparing sections…"), 1200);
    setTimeout(() => setLoadMsg("Identifying changes…"), 2500);
    try {
      const prompt = `You are a compliance document analyst. Compare these two policy versions precisely.

VERSION 1:
${v1}

VERSION 2:
${v2}

Return ONLY a JSON object (no markdown, no explanation) with this exact structure:
{
  "summary": "1–2 sentence overall summary of what changed",
  "total_changes": 4,
  "changes": [
    {
      "section": "Section number and title e.g. Section 19 — Crypto Asset Controls",
      "type": "modified",
      "summary": "One sentence describing what changed in this section",
      "old_text": "Full text of this section from Version 1 (empty string if new section)",
      "new_text": "Full text of this section from Version 2 (empty string if removed section)",
      "old_highlights": ["exact phrase from old_text that was removed or changed", "another changed phrase"],
      "new_highlights": ["exact phrase from new_text that is new or changed", "another new phrase"]
    }
  ]
}
Type must be: "modified", "added", or "removed".
old_highlights: exact substrings from old_text that were deleted or replaced.
new_highlights: exact substrings from new_text that are new or replaced.
Return only valid JSON.`;
      const raw = await callClaude(prompt);
      setCompareResult(safeJSON(raw));
    } catch (e) {
      setError("Analysis failed: " + e.message);
    } finally {
      setLoading(false); setLoadMsg("");
    }
  }, [v1, v2]);

  const runAnalyze = useCallback(async () => {
    if (!analyzeText.trim()) { setError("Please paste a policy document."); return; }
    setError(""); setLoading(true); setAnalyzeResult(null);
    setLoadMsg("Parsing document structure…");
    setTimeout(() => setLoadMsg("Extracting keywords and rules…"), 1500);
    setTimeout(() => setLoadMsg("Grouping thresholds…"), 3000);
    try {
      const prompt = `You are a compliance document analyst. Analyze this policy document.

CRITICAL: Your entire response must be a single raw JSON object. No markdown. No backticks. No explanation. No text before or after. Start your response with { and end with }. Any other output will cause a system error.

POLICY DOCUMENT:
${analyzeText}

Return this exact structure:
{
  "document_title": "inferred title",
  "document_type": "e.g. AML Policy",
  "jurisdiction": "e.g. EU / Nordic",
  "scope_summary": "2-3 sentence plain-language summary",
  "sections": [
    { "id": "19", "title": "Crypto Asset Controls", "keywords": ["crypto","bitcoin","mixer"] }
  ],
  "rules": [
    {
      "section_id": "19",
      "section_title": "Crypto Asset Controls",
      "keyword": "crypto mixer",
      "type": "prohibited",
      "rule_text": "The company does not accept deposits from cryptocurrency mixers.",
      "threshold": null,
      "applies_to": "all customers"
    }
  ],
  "thresholds_summary": [
    {
      "section_id": "19",
      "section_title": "Crypto Asset Controls",
      "subject": "Bitcoin / Ethereum daily transactions",
      "limit": "EUR 3,000 per day",
      "condition": "Standard accounts"
    }
  ]
}
Types: prohibited, permitted, threshold, required, conditional. Return ONLY the JSON object.`;

POLICY DOCUMENT:
${analyzeText}

Return ONLY a JSON object (no markdown, no explanation) with this exact structure:
{
  "document_title": "Inferred title of the policy",
  "document_type": "e.g. AML Policy, KYC Policy, Crypto Asset Policy",
  "jurisdiction": "Inferred jurisdiction e.g. EU / Nordic / Global",
  "scope_summary": "2–3 sentence plain-language summary of what this policy covers and who it applies to",
  "sections": [
    {
      "id": "19",
      "title": "Crypto Asset Controls",
      "keywords": ["crypto", "bitcoin", "mixer", "FATF"]
    }
  ],
  "rules": [
    {
      "section_id": "19",
      "section_title": "Crypto Asset Controls",
      "keyword": "crypto mixer",
      "type": "prohibited",
      "rule_text": "The company does not accept deposits originating from cryptocurrency mixers, tumblers, or privacy-enhancing protocols.",
      "threshold": null,
      "applies_to": "all customers"
    },
    {
      "section_id": "19",
      "section_title": "Crypto Asset Controls",
      "keyword": "bitcoin",
      "type": "threshold",
      "rule_text": "Bitcoin and Ethereum transactions are permitted up to EUR 3,000 per day.",
      "threshold": "EUR 3,000 per day",
      "applies_to": "all customers"
    }
  ],
  "thresholds_summary": [
    {
      "section_id": "19",
      "section_title": "Crypto Asset Controls",
      "subject": "Bitcoin / Ethereum daily transactions",
      "limit": "EUR 3,000 per day",
      "condition": "Standard accounts"
    }
  ]
}
Types: "prohibited", "permitted", "threshold", "required", "conditional".
Extract every distinct rule. For thresholds, always include the exact amount and period.
Return only valid JSON.`;
      const raw = await callClaude(prompt);
      setAnalyzeResult(safeJSON(raw));
    } catch (e) {
      setError("Analysis failed: " + e.message);
    } finally {
      setLoading(false); setLoadMsg("");
    }
  }, [analyzeText]);

  // Filter rules by search
  const filteredRules = analyzeResult?.rules?.filter(r => {
    if (!search) return true;
    const q = search.toLowerCase();
    return r.keyword?.toLowerCase().includes(q) ||
           r.rule_text?.toLowerCase().includes(q) ||
           r.section_title?.toLowerCase().includes(q) ||
           r.type?.toLowerCase().includes(q);
  }) ?? [];

  // Group filtered rules by keyword
  const groupedRules = filteredRules.reduce((acc, rule) => {
    const key = rule.keyword || "general";
    if (!acc[key]) acc[key] = [];
    acc[key].push(rule);
    return acc;
  }, {});

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", minHeight: "100vh", background: "#F7F8FA", color: "#0F1117" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=JetBrains+Mono:wght@400;500&family=DM+Sans:wght@300;400;500;600&display=swap');
        * { box-sizing: border-box; }
        textarea { font-family: 'JetBrains Mono', monospace; font-size: 11px; line-height: 1.65; resize: vertical; width: 100%; padding: 12px 14px; background: #fff; border: 1px solid #DDE1E7; border-radius: 8px; color: #1C2333; outline: none; transition: border-color 0.15s; }
        textarea:focus { border-color: #185FA5; }
        textarea::placeholder { color: #AAB0BA; }
        button { cursor: pointer; transition: all 0.15s; }
        .diff-del { background: #FDEEEE; color: #7B0000; text-decoration: line-through; text-decoration-color: #C0392B; text-decoration-thickness: 2px; border-radius: 2px; padding: 0 2px; font-weight: 500; }
        .diff-add { background: #E8F5E1; color: #1A5E2A; border-radius: 2px; padding: 0 2px; font-weight: 500; }
        .section-card { background: #fff; border: 1px solid #DDE1E7; border-radius: 10px; overflow: hidden; margin-bottom: 12px; }
        .section-card:hover { border-color: #AAB0BA; }
        .rule-card { background: #fff; border: 1px solid #E8EAED; border-radius: 8px; padding: 11px 13px; margin-bottom: 8px; }
        .keyword-group { margin-bottom: 18px; }
        .spin { animation: spin 0.8s linear infinite; display: inline-block; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .fade-in { animation: fadeIn 0.4s ease; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-track { background: #F0F2F5; } ::-webkit-scrollbar-thumb { background: #CCC; border-radius: 3px; }
      `}</style>

      {/* Header */}
      <div style={{ background: "#0D1B2A", padding: "0 28px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 52 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 28, height: 28, background: "#185FA5", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="1" width="5.5" height="12" rx="1" fill="white" opacity="0.9"/><rect x="7.5" y="1" width="5.5" height="12" rx="1" fill="white" opacity="0.5"/><rect x="3" y="3.5" width="2" height="1" fill="#0D1B2A" opacity="0.6" rx="0.5"/><rect x="3" y="5.5" width="2" height="1" fill="#0D1B2A" opacity="0.6" rx="0.5"/><rect x="3" y="7.5" width="2" height="1" fill="#0D1B2A" opacity="0.6" rx="0.5"/></svg>
          </div>
          <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 600, color: "#fff", letterSpacing: "0.01em" }}>Policy Reader</span>
          <span style={{ fontSize: 9, fontFamily: "'JetBrains Mono', monospace", color: "#4A7FA5", letterSpacing: "0.1em", marginLeft: 2 }}>AFC INTELLIGENCE SUITE</span>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {["compare", "analyze"].map(m => (
            <button key={m} onClick={() => { setMode(m); setError(""); setSearch(""); }}
              style={{
                padding: "5px 14px", borderRadius: 5, fontSize: 11, fontWeight: 600,
                letterSpacing: "0.06em", textTransform: "uppercase", border: "none",
                background: mode === m ? "#185FA5" : "transparent",
                color: mode === m ? "#fff" : "#6B8CAE",
              }}>
              {m === "compare" ? "⬡ Compare" : "◈ Analyze"}
            </button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 20px" }}>

        {/* ── COMPARE MODE ───────────────────────────────────────── */}
        {mode === "compare" && (
          <>
            <div style={{ marginBottom: 16 }}>
              <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, margin: "0 0 4px", color: "#0D1B2A" }}>Policy Version Comparator</h1>
              <p style={{ margin: 0, fontSize: 12.5, color: "#6B7A8D" }}>Paste two versions of a policy document. The AI will identify every changed section and highlight exactly what was added, removed, or modified.</p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <span style={{ width: 18, height: 18, background: "#FAEEDA", border: "1px solid #EF9F27", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: "#633806", fontFamily: "JetBrains Mono" }}>V1</span>
                  <label style={{ fontSize: 11.5, fontWeight: 600, color: "#344054", letterSpacing: "0.03em" }}>Current / Original Policy</label>
                </div>
                <textarea rows={12} placeholder="Paste Version 1 here…" value={v1} onChange={e => setV1(e.target.value)} />
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <span style={{ width: 18, height: 18, background: "#EAF3DE", border: "1px solid #97C459", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: "#27500A", fontFamily: "JetBrains Mono" }}>V2</span>
                  <label style={{ fontSize: 11.5, fontWeight: 600, color: "#344054", letterSpacing: "0.03em" }}>Updated / New Policy</label>
                </div>
                <textarea rows={12} placeholder="Paste Version 2 here…" value={v2} onChange={e => setV2(e.target.value)} />
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 20 }}>
              <button onClick={runCompare} disabled={loading}
                style={{ background: loading ? "#ABB2B9" : "#0D1B2A", color: "#fff", border: "none", borderRadius: 7, padding: "9px 20px", fontSize: 12, fontWeight: 600, letterSpacing: "0.04em", display: "flex", alignItems: "center", gap: 7 }}>
                {loading ? <><span className="spin" style={{ width: 13, height: 13, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block" }} />{loadMsg || "Analysing…"}</> : "▶  Run Comparison"}
              </button>
              <button onClick={loadSample} style={{ background: "transparent", border: "1px solid #DDE1E7", borderRadius: 7, padding: "8px 14px", fontSize: 11.5, color: "#6B7A8D", fontWeight: 500 }}>Load sample policy</button>
              {compareResult && <button onClick={() => setCompareResult(null)} style={{ background: "transparent", border: "1px solid #DDE1E7", borderRadius: 7, padding: "8px 14px", fontSize: 11.5, color: "#6B7A8D" }}>Clear</button>}
            </div>

            {error && <div style={{ background: "#FCEBEB", border: "1px solid #F09595", borderRadius: 7, padding: "9px 13px", fontSize: 12, color: "#791F1F", marginBottom: 14 }}>{error}</div>}

            {compareResult && (
              <div className="fade-in">
                {/* Summary bar */}
                <div style={{ background: "#0D1B2A", borderRadius: 8, padding: "12px 18px", marginBottom: 16, display: "flex", alignItems: "center", gap: 16 }}>
                  <div>
                    <div style={{ fontSize: 9, fontFamily: "'JetBrains Mono', monospace", color: "#4A7FA5", letterSpacing: "0.1em", marginBottom: 2 }}>COMPARISON SUMMARY</div>
                    <div style={{ fontSize: 13, color: "#fff", fontWeight: 500 }}>{compareResult.summary}</div>
                  </div>
                  <div style={{ marginLeft: "auto", display: "flex", gap: 12, flexShrink: 0 }}>
                    {["modified","added","removed"].map(t => {
                      const count = compareResult.changes?.filter(c => c.type === t).length || 0;
                      if (!count) return null;
                      const cfg = TYPE_CONFIG[t];
                      return <div key={t} style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 20, fontWeight: 700, color: cfg.border, fontFamily: "'JetBrains Mono', monospace" }}>{count}</div>
                        <div style={{ fontSize: 8, color: "#6B8CAE", textTransform: "uppercase", letterSpacing: "0.1em" }}>{t}</div>
                      </div>;
                    })}
                  </div>
                </div>

                {compareResult.changes?.map((change, i) => (
                  <div key={i} className="section-card">
                    {/* Section header */}
                    <div
                      style={{ padding: "10px 16px", display: "flex", alignItems: "center", gap: 10, borderBottom: "1px solid #F0F2F5", cursor: "pointer", background: expandedSection === i ? "#F9FAFB" : "#fff" }}
                      onClick={() => setExpandedSection(expandedSection === i ? null : i)}
                    >
                      <Badge type={change.type} />
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 600, color: "#0D1B2A", flex: 1 }}>{change.section}</span>
                      <span style={{ fontSize: 11, color: "#6B7A8D", maxWidth: 340, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{change.summary}</span>
                      <span style={{ fontSize: 13, color: "#AAB0BA", marginLeft: 6 }}>{expandedSection === i ? "▲" : "▼"}</span>
                    </div>

                    {expandedSection === i && (
                      <div style={{ padding: "14px 16px" }}>
                        <div style={{ display: "grid", gridTemplateColumns: change.type === "added" ? "1fr" : change.type === "removed" ? "1fr" : "1fr 1fr", gap: 12 }}>
                          {/* OLD TEXT */}
                          {change.type !== "added" && change.old_text && (
                            <div>
                              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 7 }}>
                                <span style={{ width: 16, height: 16, background: "#FAEEDA", border: "1px solid #EF9F27", borderRadius: 3, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, fontWeight: 700, color: "#633806" }}>V1</span>
                                <span style={{ fontSize: 10, fontWeight: 600, color: "#854F0B", letterSpacing: "0.05em", textTransform: "uppercase" }}>Previous version</span>
                              </div>
                              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10.5, lineHeight: 1.7, color: "#2C1810", background: "#FFFDF7", border: "1px solid #F5D99A", borderLeft: "3px solid #EF9F27", borderRadius: "0 6px 6px 0", padding: "10px 12px" }}>
                                {applyHighlights(change.old_text, change.old_highlights, "diff-del")}
                              </div>
                            </div>
                          )}
                          {/* NEW TEXT */}
                          {change.type !== "removed" && change.new_text && (
                            <div>
                              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 7 }}>
                                <span style={{ width: 16, height: 16, background: "#EAF3DE", border: "1px solid #97C459", borderRadius: 3, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, fontWeight: 700, color: "#27500A" }}>V2</span>
                                <span style={{ fontSize: 10, fontWeight: 600, color: "#3B6D11", letterSpacing: "0.05em", textTransform: "uppercase" }}>{change.type === "added" ? "New section" : "Updated version"}</span>
                              </div>
                              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10.5, lineHeight: 1.7, color: "#0D2B0D", background: "#F7FDF5", border: "1px solid #B8E094", borderLeft: "3px solid #639922", borderRadius: "0 6px 6px 0", padding: "10px 12px" }}>
                                {applyHighlights(change.new_text, change.new_highlights, "diff-add")}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Changed phrases legend */}
                        {change.type === "modified" && ((change.old_highlights?.length || 0) + (change.new_highlights?.length || 0)) > 0 && (
                          <div style={{ marginTop: 10, padding: "8px 11px", background: "#F7F8FA", borderRadius: 6, display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                            <span style={{ fontSize: 9, fontFamily: "'JetBrains Mono', monospace", color: "#AAB0BA", textTransform: "uppercase", letterSpacing: "0.1em", marginRight: 4 }}>Changes:</span>
                            {change.old_highlights?.map((p, j) => <span key={"del"+j} className="diff-del" style={{ fontSize: 9 }}>{p}</span>)}
                            {change.new_highlights?.map((p, j) => <span key={"add"+j} className="diff-add" style={{ fontSize: 9 }}>{p}</span>)}
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

        {/* ── ANALYZE MODE ───────────────────────────────────────── */}
        {mode === "analyze" && (
          <>
            <div style={{ marginBottom: 16 }}>
              <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, margin: "0 0 4px", color: "#0D1B2A" }}>Policy Analyser</h1>
              <p style={{ margin: 0, fontSize: 12.5, color: "#6B7A8D" }}>Paste any compliance policy. The AI extracts keywords by section, then groups every rule, threshold, and restriction into a searchable, structured view.</p>
            </div>

            <div style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <span style={{ width: 18, height: 18, background: "#E6F1FB", border: "1px solid #85B7EB", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: "#042C53", fontFamily: "JetBrains Mono" }}>◈</span>
                <label style={{ fontSize: 11.5, fontWeight: 600, color: "#344054" }}>Policy Document</label>
              </div>
              <textarea rows={10} placeholder="Paste your policy document here…" value={analyzeText} onChange={e => setAnalyzeText(e.target.value)} />
            </div>

            <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
              <button onClick={runAnalyze} disabled={loading}
                style={{ background: loading ? "#ABB2B9" : "#0D1B2A", color: "#fff", border: "none", borderRadius: 7, padding: "9px 20px", fontSize: 12, fontWeight: 600, letterSpacing: "0.04em", display: "flex", alignItems: "center", gap: 7 }}>
                {loading ? <><span className="spin" style={{ width: 13, height: 13, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block" }} />{loadMsg || "Analysing…"}</> : "▶  Analyse Policy"}
              </button>
              <button onClick={loadSample} style={{ background: "transparent", border: "1px solid #DDE1E7", borderRadius: 7, padding: "8px 14px", fontSize: 11.5, color: "#6B7A8D", fontWeight: 500 }}>Load sample policy</button>
              {analyzeResult && <button onClick={() => { setAnalyzeResult(null); setSearch(""); }} style={{ background: "transparent", border: "1px solid #DDE1E7", borderRadius: 7, padding: "8px 14px", fontSize: 11.5, color: "#6B7A8D" }}>Clear</button>}
            </div>

            {error && <div style={{ background: "#FCEBEB", border: "1px solid #F09595", borderRadius: 7, padding: "9px 13px", fontSize: 12, color: "#791F1F", marginBottom: 14 }}>{error}</div>}

            {analyzeResult && (
              <div className="fade-in">
                {/* Document overview card */}
                <div style={{ background: "#0D1B2A", borderRadius: 10, padding: "16px 20px", marginBottom: 16, display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 20, alignItems: "start" }}>
                  <div style={{ gridColumn: "1 / -1", borderBottom: "1px solid #1E3550", paddingBottom: 10, marginBottom: 4 }}>
                    <div style={{ fontSize: 9, fontFamily: "'JetBrains Mono', monospace", color: "#4A7FA5", letterSpacing: "0.1em", marginBottom: 3 }}>DOCUMENT IDENTIFIED</div>
                    <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 17, fontWeight: 700, color: "#fff" }}>{analyzeResult.document_title || "Policy Document"}</div>
                  </div>
                  {[
                    ["Type", analyzeResult.document_type],
                    ["Jurisdiction", analyzeResult.jurisdiction],
                    ["Sections", analyzeResult.sections?.length + " sections"],
                    ["Rules extracted", analyzeResult.rules?.length + " rules"],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <div style={{ fontSize: 8.5, fontFamily: "'JetBrains Mono', monospace", color: "#4A7FA5", letterSpacing: "0.1em", marginBottom: 3 }}>{k.toUpperCase()}</div>
                      <div style={{ fontSize: 12, color: "#E0E8F0", fontWeight: 500 }}>{v}</div>
                    </div>
                  ))}
                  <div style={{ gridColumn: "1 / -1", paddingTop: 8, borderTop: "1px solid #1E3550" }}>
                    <div style={{ fontSize: 8.5, fontFamily: "'JetBrains Mono', monospace", color: "#4A7FA5", letterSpacing: "0.1em", marginBottom: 5 }}>SCOPE SUMMARY</div>
                    <div style={{ fontSize: 12, color: "#B8C8D8", lineHeight: 1.6 }}>{analyzeResult.scope_summary}</div>
                  </div>
                </div>

                {/* Section keywords */}
                <div style={{ background: "#fff", border: "1px solid #DDE1E7", borderRadius: 10, padding: "14px 16px", marginBottom: 14 }}>
                  <div style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, color: "#6B7A8D", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 11 }}>Keywords by Section</div>
                  {analyzeResult.sections?.map(sec => (
                    <div key={sec.id} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "7px 0", borderBottom: "0.5px solid #F0F2F5" }}>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 600, color: "#185FA5", minWidth: 28, paddingTop: 2 }}>§{sec.id}</span>
                      <span style={{ fontSize: 11, fontWeight: 600, color: "#344054", minWidth: 180, paddingTop: 2 }}>{sec.title}</span>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                        {sec.keywords?.map(kw => (
                          <button key={kw} onClick={() => setSearch(kw)}
                            style={{ fontSize: 9, fontFamily: "'JetBrains Mono', monospace", padding: "2px 8px", borderRadius: 10, background: "#F0F4FF", border: "1px solid #C5D2F0", color: "#1E3A8A", cursor: "pointer", fontWeight: 500 }}>
                            {kw}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Rule type legend */}
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12, alignItems: "center" }}>
                  <span style={{ fontSize: 10, color: "#6B7A8D", marginRight: 4 }}>Filter by rule type:</span>
                  {Object.entries(TYPE_CONFIG).filter(([k]) => ["prohibited","permitted","threshold","required","conditional"].includes(k)).map(([k, cfg]) => (
                    <button key={k} onClick={() => setSearch(k)}
                      style={{ fontSize: 9, fontFamily: "'JetBrains Mono', monospace", padding: "3px 9px", borderRadius: 10, background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color, cursor: "pointer", fontWeight: 600, letterSpacing: "0.06em" }}>
                      {cfg.label}
                    </button>
                  ))}
                  {search && <button onClick={() => setSearch("")} style={{ fontSize: 9, padding: "3px 9px", borderRadius: 10, background: "#F0F2F5", border: "1px solid #DDE1E7", color: "#6B7A8D", cursor: "pointer" }}>✕ Clear filter</button>}
                </div>

                {/* Search */}
                <div style={{ position: "relative", marginBottom: 14 }}>
                  <input
                    type="text"
                    placeholder="Search rules by keyword, section, or type…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{ width: "100%", padding: "9px 12px 9px 34px", borderRadius: 8, border: "1px solid #DDE1E7", fontSize: 12, background: "#fff", outline: "none", fontFamily: "'DM Sans', sans-serif" }}
                  />
                  <span style={{ position: "absolute", left: 11, top: 10, fontSize: 14, color: "#AAB0BA" }}>⌕</span>
                  <span style={{ position: "absolute", right: 12, top: 10, fontSize: 10, color: "#AAB0BA", fontFamily: "'JetBrains Mono', monospace" }}>{filteredRules.length} rules</span>
                </div>

                {/* Rules grouped by keyword */}
                {Object.keys(groupedRules).length === 0 && <div style={{ textAlign: "center", padding: "24px", color: "#AAB0BA", fontSize: 12 }}>No rules match your search.</div>}

                {Object.entries(groupedRules).map(([keyword, rules]) => (
                  <div key={keyword} className="keyword-group">
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
                      <div style={{ height: 1, flex: 1, background: "#E8EAED" }} />
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 600, color: "#185FA5", letterSpacing: "0.08em", background: "#EFF4FF", border: "1px solid #C5D2F0", borderRadius: 10, padding: "2px 10px" }}># {keyword}</span>
                      <div style={{ height: 1, flex: 1, background: "#E8EAED" }} />
                    </div>
                    {rules.map((rule, i) => {
                      const cfg = TYPE_CONFIG[rule.type?.toLowerCase()] || TYPE_CONFIG.conditional;
                      return (
                        <div key={i} className="rule-card" style={{ borderLeft: `3px solid ${cfg.border}` }}>
                          <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 6 }}>
                            <Badge type={rule.type} />
                            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: "#185FA5", background: "#EFF4FF", border: "1px solid #C5D2F0", borderRadius: 3, padding: "2px 6px" }}>§{rule.section_id} — {rule.section_title}</span>
                            {rule.applies_to && <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: "#6B7A8D", marginLeft: "auto" }}>applies to: {rule.applies_to}</span>}
                          </div>
                          <div style={{ fontSize: 12, lineHeight: 1.6, color: "#1C2333" }}>{rule.rule_text}</div>
                          {rule.threshold && (
                            <div style={{ marginTop: 7, display: "inline-flex", alignItems: "center", gap: 5, background: "#FAEEDA", border: "1px solid #EF9F27", borderRadius: 4, padding: "3px 9px" }}>
                              <span style={{ fontSize: 9, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: "#633806", textTransform: "uppercase", letterSpacing: "0.08em" }}>THRESHOLD</span>
                              <span style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, color: "#854F0B" }}>{rule.threshold}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}

                {/* Thresholds summary */}
                {analyzeResult.thresholds_summary?.length > 0 && (
                  <div style={{ background: "#fff", border: "1px solid #DDE1E7", borderRadius: 10, padding: "14px 16px", marginTop: 6 }}>
                    <div style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, color: "#6B7A8D", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>Thresholds Summary</div>
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                        <thead>
                          <tr style={{ background: "#F7F8FA" }}>
                            {["§", "Section", "Subject", "Limit", "Condition"].map(h => (
                              <th key={h} style={{ padding: "6px 10px", textAlign: "left", fontSize: 9, fontFamily: "'JetBrains Mono', monospace", color: "#6B7A8D", fontWeight: 600, letterSpacing: "0.08em", borderBottom: "1px solid #E8EAED" }}>{h.toUpperCase()}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {analyzeResult.thresholds_summary.map((t, i) => (
                            <tr key={i} style={{ borderBottom: "0.5px solid #F0F2F5" }}>
                              <td style={{ padding: "7px 10px", fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "#185FA5", fontWeight: 600 }}>§{t.section_id}</td>
                              <td style={{ padding: "7px 10px", color: "#344054", fontWeight: 500 }}>{t.section_title}</td>
                              <td style={{ padding: "7px 10px", color: "#344054" }}>{t.subject}</td>
                              <td style={{ padding: "7px 10px" }}>
                                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 700, color: "#854F0B", background: "#FAEEDA", border: "1px solid #EF9F27", borderRadius: 3, padding: "1px 6px" }}>{t.limit}</span>
                              </td>
                              <td style={{ padding: "7px 10px", color: "#6B7A8D", fontSize: 11 }}>{t.condition || "—"}</td>
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
