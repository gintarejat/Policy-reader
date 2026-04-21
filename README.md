# Policy Reader

**AI-powered compliance document intelligence. Two modes: version comparison and rule extraction.**

Built for compliance officers, MLROs, and legal teams who manage policy documents across AML, MiCA, AMLD6, and sanctions frameworks. Policy Reader eliminates the manual work of tracking what changed between policy versions and locating specific rules during live investigations.

---

## What it does

Compliance policy documents are dense, update frequently, and are almost never structured for fast retrieval. When a regulatory update lands — a new MiCA technical standard, an AMLD6 amendment, an internal control revision — a compliance officer has to read the entire document to find what changed. During a live investigation, finding the specific rule that applies to a crypto mixer or an unhosted wallet means scrolling through 40 pages.

Policy Reader solves both problems with two focused modes.

---

## Modes

### Compare mode

Paste two versions of the same policy. The AI identifies every section that changed, was added, or was removed.

Each changed section opens as a side-by-side panel. The previous version appears on the left with exact changed phrases highlighted in red strikethrough. The updated version appears on the right with new phrases highlighted in green. The comparison works at phrase level — not just paragraph level — so a threshold change from EUR 5,000 to EUR 3,000 is visible as a precise inline edit, not a paragraph rewrite.

Section-level change types:
- **Modified** — section existed in both versions but content changed
- **Added** — section is new in Version 2
- **Removed** — section existed in Version 1 but was deleted

### Analyze mode

Paste any compliance policy document. The AI reads the full text and returns a structured breakdown across four outputs:

1. **Document overview** — inferred title, document type, jurisdiction, and a 2–3 sentence plain-language scope summary
2. **Keywords by section** — every section mapped to its key terms; clicking any keyword filters the rules below
3. **Rules database** — every distinct rule extracted, classified by type, tagged with the section it came from, and grouped by keyword. Rule types: Prohibited / Permitted / Threshold / Required / Conditional
4. **Thresholds summary table** — every monetary limit, time period, and conditional threshold pulled into one scannable table with section references

The rules database is fully searchable in real time across keyword, rule text, section title, and type.

---

## Human-in-the-loop design

Policy Reader is an AI-assisted tool, not an autonomous one. The AI extracts and structures information — the compliance officer interprets and acts on it.

**Why this matters in a regulatory context:**

The AI reads text and identifies patterns. It does not have institutional context, jurisdiction-specific regulatory history, or awareness of how a rule has been interpreted in practice. A phrase classified as "Permitted" by the AI may carry conditions or exceptions that are documented elsewhere in the institution's policy framework. A threshold extracted as "EUR 10,000" may apply differently depending on customer type or product.

**How the human-in-the-loop works in practice:**

In Compare mode, the AI surfaces every changed section and highlights the specific phrases that changed. The officer decides whether a change is material to their current work, whether it affects an ongoing investigation, and whether a policy update requires a workflow change.

In Analyze mode, the extracted rules serve as a starting point for investigation, not a definitive answer. When an officer searches for "mixer" and finds a Prohibited rule, they then read the original policy section — linked by section ID — to confirm scope and applicability. The AI saves the time of finding the rule; the officer applies professional judgment in interpreting it.

**What the AI cannot do:**

- Determine whether a rule applies to a specific customer or transaction
- Identify regulatory intent behind a policy change
- Replace a qualified compliance officer's legal assessment
- Operate without review on decisions that affect investigations, SAR filings, or customer actions

---

## Workflow

### Compare workflow

```
1. Obtain both policy versions (PDF export to text, or paste from document)
2. Paste Version 1 (current / original) into the left text area
3. Paste Version 2 (updated) into the right text area
4. Click Run Comparison
5. Review the summary bar — total modified / added / removed sections
6. Click each changed section card to expand the side-by-side diff
7. Read the old and new text; the changed phrases are highlighted inline
8. Assess whether any change is material to your current caseload or workflow
9. Document any material changes in your case management system
```

Typical use cases:
- Quarterly policy review cycle — identifying what changed before sign-off
- Onboarding new team members — showing what the current policy says vs. what a previous version said
- Regulatory inspection preparation — demonstrating that policy changes were tracked and reviewed
- Post-regulatory-update review — finding exactly how an AMLD6 amendment changed internal thresholds

### Analyze workflow

```
1. Obtain the policy document text (copy from PDF, Word, or internal system)
2. Paste into the text area
3. Click Analyse Policy
4. Review the Document Overview — confirm the AI correctly identified the document type and jurisdiction
5. Use the Keywords by Section table to understand the document's scope
6. Click a keyword pill to filter all rules for that topic
7. Or use the search bar to find rules by free text
8. Review each extracted rule — note the section ID, rule type, and threshold
9. For any rule you need to act on, use the section ID to locate the original text
10. Apply professional judgment on interpretation and applicability
```

Typical use cases:
- Live investigation — quickly finding the rule that governs the specific activity under review
- Onboarding — building a fast reference map of a new policy
- Threshold audit — checking all monetary limits in one view before a transaction decision
- Training — understanding which section governs each compliance obligation

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React (JSX) |
| AI engine | Claude API — `POST /v1/messages` |
| Model | `claude-sonnet-4-20250514` |
| Output format | Structured JSON schema |
| Streaming | Server-sent events for Compare mode |
| Diff rendering | Custom inline phrase-level highlighter |
| Styling | CSS variables + Google Fonts (Playfair Display, JetBrains Mono, DM Sans) |

---

## Running locally

**Prerequisites:** Node.js 18+, a valid Anthropic API key from `console.anthropic.com`

```bash
# 1. Create a React project
npm create vite@latest policy-reader -- --template react
cd policy-reader

# 2. Replace src/App.jsx with PolicyReader.jsx

# 3. Add your API key to the fetch call in PolicyReader.jsx:
#    Find the fetch() call and add these headers:
#    "x-api-key": "sk-ant-api03-YOUR-KEY-HERE",
#    "anthropic-version": "2023-06-01"

# 4. Install and run
npm install
npm run dev
# → http://localhost:5173
```

---

## API key security

The API key must never be in frontend code that is deployed publicly. For local use on your own machine it is acceptable. For any shared or public deployment, move the key to a backend proxy:

```
Browser → Your backend (Node/Express or Python/FastAPI) → Anthropic API
                ↑
         Key stored here as environment variable
         Never reaches the browser
```

Minimal Express proxy example:

```js
// server.js
const express = require('express');
const app = express();
app.use(express.json());

app.post('/api/claude', async (req, res) => {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(req.body),
  });
  const data = await response.json();
  res.json(data);
});

app.listen(3001);
```

In the React app, point the fetch to `/api/claude` instead of `https://api.anthropic.com/v1/messages`.

---

## Known limitations — Beta v0.1

- **Long documents:** Policies above approximately 15,000 words may exceed token limits. Split the document into sections before pasting.
- **Scanned PDFs:** The tool accepts plain text only. Scanned PDF images must be converted to text first using an OCR tool before pasting.
- **Non-English policies:** The AI can read and extract rules in most European languages but the UI labels (badge text, filter names) are in English. Nordic-language policies work well.
- **Complex table structures:** Rules embedded inside complex HTML or Word tables may not extract cleanly. Paste the text content of tables as plain text.
- **AI classification errors:** The AI occasionally misclassifies a Conditional rule as Permitted or vice versa. Always verify rule type against the original text for any rule you act on.
- **API key in frontend:** The current build includes the key directly in the React component. This is suitable for local/portfolio use only — not for shared deployment. See API key security above.

---

## Roadmap — v0.2 and beyond

- [ ] Secure backend proxy — move API key server-side
- [ ] Multi-document batch analysis — load 3+ policies simultaneously
- [ ] Cross-document conflict detection — flag rules that contradict across policies
- [ ] Export to PDF and Excel — downloadable rule database and threshold table
- [ ] Version history tracking — compare any two versions from a stored history, not just pasted text
- [ ] File upload — drag-and-drop PDF/Word/TXT rather than paste
- [ ] Audit log — record every comparison and analysis with timestamp for regulatory review trail

---

## Regulatory context

Policy Reader was designed with the following regulatory frameworks in mind. Rules and thresholds extracted by the tool should always be verified against the original text of these instruments:

- **EU AMLD6** (Directive 2018/1673) — AML obligations for obliged entities
- **MiCA** (Regulation EU 2023/1114) — Crypto-asset service provider requirements
- **TFR** (Transfer of Funds Regulation) — Travel Rule data requirements
- **OFAC 31 CFR** — US sanctions programme obligations
- **FATF Recommendations** — International AML/CFT standards
- **EBA AML/CFT Guidelines** — European Banking Authority guidance for CASPs

---

## Part of the AFC Intelligence Suite

Policy Reader is one of three tools in development:

| Tool | Status | Purpose |
|---|---|---|
| SAR Document Generator | Beta v0.1 | AI-generated SAR/STR narratives with L1→L2 QC workflow |
| Policy Reader | Beta v0.1 | Policy version comparison and rule extraction |
| Compliance Guides | Draft v0.5 | Six dual-level AML/crypto regulatory reference guides |

---

## Disclaimer

Policy Reader is an AI-assisted productivity tool for compliance professionals. It is not legal advice. Extracted rules, classifications, and threshold values must be verified against source documents before being relied upon for regulatory decisions, SAR filings, customer actions, or any other compliance determination. The tool is provided as-is with no warranty of accuracy or completeness. Always consult qualified legal and compliance counsel for regulatory interpretation.

---

*Built by Gintarė Jatautytė · ajatauaml.com · AML Compliance · 2026*
