# Policy Reader

**AI-assisted document analysis (LLM extraction, read-only). Two modes: version comparison and rule extraction.**

Built for compliance officers, MLROs, and legal teams who manage AML, crypto and sanctions policies. Policy Reader cuts the manual work of tracking what changed between policy versions and locating specific rules during live investigations. It speeds up reading; it doesn't replace it.

---

## What it does

Compliance policy documents are dense, update frequently, and are almost never structured for fast retrieval. When a regulatory update lands — a new MiCA technical standard, an AMLR delegated act, an internal control revision — a compliance officer has to read the entire document to find what changed. During a live investigation, finding the specific rule that applies to a crypto mixer or an unhosted wallet means scrolling through 40 pages.

Policy Reader solves both problems with two focused modes.

---

## Modes

### Compare mode

Paste two versions of the same policy. The AI identifies the sections that changed, were added, or were removed.

Click a changed section to open it as a side-by-side panel: the previous version on the left, the updated version on the right, with the phrases the AI marked as changed highlighted. The AI works at phrase level, so a threshold change from EUR 5,000 to EUR 3,000 can show up as an inline edit rather than a paragraph rewrite.

**Important:** this is not a deterministic diff. The text in both panels is reproduced by the AI, not copied from your documents, so a change can be missed or mis-copied. Check every material change against the original documents. A real word-level diff is on the roadmap.

Section-level change types:
- **Modified** — section existed in both versions but content changed
- **Added** — section is new in Version 2
- **Removed** — section existed in Version 1 but was deleted

### Analyze mode

Paste any compliance policy document. The AI reads the full text and returns a structured breakdown across four outputs:

1. **Document overview** — inferred title, document type, jurisdiction, and a 2–3 sentence plain-language scope summary
2. **Keywords by section** — each section mapped to its key terms; clicking any keyword filters the rules below
3. **Rules database** — the distinct rules the AI extracts, classified by type, tagged with the section it came from, and grouped by keyword. Rule types: Prohibited / Permitted / Threshold / Required / Conditional
4. **Thresholds summary table** — monetary limits, time periods and conditional thresholds the AI finds, in one table with section references

The rules database is fully searchable in real time across keyword, rule text, section title, and type.

---

## Human-in-the-loop design

Policy Reader is an AI-assisted tool, not an autonomous one. The AI extracts and structures information — the compliance officer interprets and acts on it.

**Why this matters in a regulatory context:**

The AI reads text and identifies patterns. It does not have institutional context, jurisdiction-specific regulatory history, or awareness of how a rule has been interpreted in practice. A phrase classified as "Permitted" by the AI may carry conditions or exceptions that are documented elsewhere in the institution's policy framework. A threshold extracted as "EUR 10,000" may apply differently depending on customer type or product.

**How the human-in-the-loop works in practice:**

In Compare mode, the AI lists the changed sections and highlights the phrases it identifies as changed. The officer decides whether a change is material to their current work, whether it affects an ongoing investigation, and whether a policy update requires a workflow change.

In Analyze mode, the extracted rules serve as a starting point for investigation, not a definitive answer. When an officer searches for "mixer" and finds a Prohibited rule, they then read the original policy section — referenced by its section ID — to confirm scope and applicability. The AI saves the time of finding the rule; the officer applies professional judgment in interpreting it.

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
8. Confirm each material change against the original documents (the panel text is AI-reproduced)
9. Assess whether any change is material to your current caseload or workflow
10. Document any material changes in your case management system
```

Typical use cases:
- Quarterly policy review cycle — identifying what changed before sign-off
- Onboarding new team members — showing what the current policy says vs. what a previous version said
- Regulatory inspection preparation — demonstrating that policy changes were tracked and reviewed
- Post-regulatory-update review — finding how a regulatory change moved internal thresholds

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
| Frontend | React (JSX), built with Vite |
| Backend | Vercel serverless proxy `api/claude.js` (keeps the API key server-side) |
| AI engine | Claude API — `POST /v1/messages` |
| Model | `claude-sonnet-4-5`, `max_tokens: 4000` |
| Output format | JSON requested in the prompt, parsed in the browser |
| Streaming | None — one request, one response |
| Change highlighting | Highlights the phrases the AI lists as changed |
| Styling | Inline styles + Google Fonts (Archivo Black, Special Elite) |

---

## Running locally

**Prerequisites:** Node.js 18+, an Anthropic API key, the Vercel CLI for the API route.

```bash
git clone https://github.com/gintarejat/Policy-reader
cd Policy-reader
npm install
vercel dev          # runs the Vite app and /api/claude together
# set ANTHROPIC_API_KEY in Vercel (Project → Settings → Environment Variables)
# or in a local .env file for vercel dev
```

`npm run dev` alone starts the interface, but the analysis calls need `/api/claude`, so use `vercel dev` for full local testing.

---

## API key security

The key lives only in Vercel's server-side environment. The browser calls `/api/claude`; `api/claude.js` adds the key and forwards the request to Anthropic. The key is never in the frontend bundle.

---

## Known limitations — Beta v1.0

- **Long documents:** the answer is capped at 4,000 tokens, so a long policy with many rules can produce cut-off JSON (parse error or missing rules). Analyse a few sections at a time.
- **Scanned PDFs:** The tool accepts plain text only. Scanned PDF images must be converted to text first using an OCR tool before pasting.
- **Non-English policies:** the model can read most European languages, but this hasn't been systematically tested here, and the UI labels are in English.
- **Complex table structures:** Rules embedded inside complex HTML or Word tables may not extract cleanly. Paste the text content of tables as plain text.
- **AI classification errors:** The AI occasionally misclassifies a Conditional rule as Permitted or vice versa. Always verify rule type against the original text for any rule you act on.
- **Not a deterministic diff:** Compare-mode text is reproduced by the AI. Verify against the source documents.
- **No source-sentence trace:** extracted rules show the section ID, not the exact sentence they came from.
- **No rate limit on the API route** yet.

---

## Roadmap — v2.0 and beyond

- [x] Secure backend proxy — API key server-side
- [ ] Deterministic word-level diff in Compare mode
- [ ] Source-sentence trace for every extracted rule
- [ ] Multi-document batch analysis — load 3+ policies simultaneously
- [ ] Cross-document conflict detection — flag rules that contradict across policies
- [ ] Export to PDF and Excel — downloadable rule database and threshold table
- [ ] Version history tracking — compare any two versions from a stored history, not just pasted text
- [ ] File upload — drag-and-drop PDF/Word/TXT rather than paste
- [ ] Audit log — record every comparison and analysis with timestamp for regulatory review trail

---

## Regulatory context

Policy Reader was designed with the following regulatory frameworks in mind. Rules and thresholds extracted by the tool should always be verified against the original text of these instruments:

- **AMLD4/5** (Directive (EU) 2015/849) and, from July 2027, **AMLR** (Regulation (EU) 2024/1624) — AML obligations for obliged entities
- **AMLD6** (Directive (EU) 2018/1673) — criminal-law offences of money laundering
- **MiCA** (Regulation EU 2023/1114) — Crypto-asset service provider requirements
- **TFR** (Regulation (EU) 2023/1113) — Travel Rule data requirements
- **OFAC (31 CFR Chapter V)** — US sanctions programme obligations
- **FATF Recommendations** — International AML/CFT standards
- **EBA ML/TF risk factors guidelines** — European Banking Authority guidance, including for CASPs

---

## Part of the AML Operating System

Policy Reader is one of three live beta tools mapped on the [AML Operating System](https://ajatauaml.com/aml-operating-system.html):

| Tool | Layer | Purpose |
|---|---|---|
| [Policy Reader](https://github.com/gintarejat/Policy-reader) | 1 · Governance | Policy version comparison and rule extraction |
| [Scamnot](https://github.com/gintarejat/scamnot) | 3 · Customer lifecycle | OSINT / KYB investigation agent with a human verdict |
| [SAR Draft Automation](https://github.com/gintarejat/SAR-Draft-Automation) | 5 · Investigation & reporting | SAR/STR drafting workflow with a human review gate |

---

## Disclaimer

Policy Reader is an AI-assisted productivity tool for compliance professionals. It is not legal advice. Extracted rules, classifications, and threshold values must be verified against source documents before being relied upon for regulatory decisions, SAR filings, customer actions, or any other compliance determination. The tool is provided as-is with no warranty of accuracy or completeness. Always consult qualified legal and compliance counsel for regulatory interpretation.

---

*Built by Gintarė Jatautytė · ajatauaml.com · AML Compliance · 2026*
