# Policy Reader

> Two tools in one. **Compare** shows what changed between two versions of a compliance policy, as a word-level diff computed by code. **Analyze** extracts the rules, thresholds and restrictions in a policy into a searchable, typed list.

**Live:** [policy-reader-fawn.vercel.app](https://policy-reader-fawn.vercel.app) · [How to use](https://policy-reader-fawn.vercel.app/#how-to-use) · [Place in the AML OS](https://policy-reader-fawn.vercel.app/#place-in-aml-os)

Part of the **[AML Operating System](https://ajatauaml.com/aml-operating-system.html)** · Layer 1, Governance (policy → control).

---

## What it is

| | |
|---|---|
| **Category** | AI-assisted document analysis (LLM extraction and classification), with a deterministic diff for Compare |
| **Not** | An agent (no tools, no loop) |
| **Users** | Compliance / policy owners, 2nd-line reviewers, anyone who has to implement a policy update |
| **Output** | On screen: a change list with a word-level diff (Compare), or document profile + keywords + rules + thresholds summary (Analyze) |

## Architecture

```
Browser (React + Vite build)
 ├─ Tabs: ⬡ Compare | ◈ Analyze | How To Use | Place in AML OS
 ├─ Compare: src/policyDiff.js splits both versions into sections, matches them,
 │           runs a word-level LCS diff in the browser (no AI)
 │           → AI writes one-line summaries of the changes it is given
 ├─ Analyze: prompt built in the browser → fetch('/api/claude')
 ├─ Robust JSON parse (strips text before the first { and after the last })
 └─ Render: change cards / rule list, type filter, keyword search
          │
Vercel serverless  api/claude.js
          └─ adds ANTHROPIC_API_KEY → Anthropic Messages API
                (claude-sonnet-4-5; max_tokens 4000 Analyze, 1500 Compare summaries)
```

| File | Role |
|---|---|
| `src/PolicyReader.jsx` | UI, prompts, sample policies (V1/V2) |
| `src/policyDiff.js` | Section matching and word-level diff for Compare |
| `src/InfoPages.jsx` | "How To Use" and "Place in AML OS" pages |
| `api/claude.js` | Server-side key proxy |
| `vite.config.js`, `index.html` | Build |

## What is code and what is AI

| Function | Done by |
|---|---|
| Finding changed sections, showing old and new text with changes highlighted | **Code**: word-level diff of the pasted text |
| Classifying the change (modified / added / removed), NUMBER CHANGED flag | **Code** |
| One-line summary per changed section + overall summary | **AI** (given the diff and both section texts) |
| Document title, type, jurisdiction, scope | **AI** |
| Rule extraction + type (prohibited / permitted / threshold / required / conditional) | **AI** |
| Thresholds summary | **AI** |
| Search, type filter, grouping by keyword, counts | **Code** |

## AI inventory

| Field | Value |
|---|---|
| Purpose | Read policy text; summarise changes and list rules |
| Data in | The pasted policy text (one or two versions) |
| Data out | JSON: change summaries, or document profile + sections + rules + thresholds |
| Model | `claude-sonnet-4-5`; `max_tokens` 4000 (Analyze), 1500 (Compare summaries) |
| Autonomy level | **Read-only**: nothing is written or sent anywhere |
| Human gate | None in the tool. The reader must check it against the source. (Planned: reviewer sign-off) |
| Data caution | Internal policies may be confidential. Only paste text you're allowed to share with an external AI provider. |

## Known limitations

1. **Compare summaries are AI-written.** The diff is exact (it is your own text), but a one-line summary can misdescribe or leave out a change. Read the highlighted changes, not just the summaries.
2. **Compare matches sections by heading.** It recognises "Section 12", "Article 5", "§ 6" and numbered headings like "4.2 Sanctions". Without headings the whole document is compared as one block (still word-level). A renumbered section with a new title shows as removed + added.
3. **Extracted rules aren't traced to a source sentence,** so a rule could be paraphrased wrongly or invented. Planned: the model quotes the exact sentence and anything it can't find verbatim is dropped.
4. **Long documents:** the Analyze output cap of 4,000 tokens can cut the JSON off, and then the parse fails or rules go missing silently. Planned: chunking by section.
5. **Paste only:** no PDF/DOCX upload yet.
6. **Open proxy with no rate limit.** `api/claude.js` forwards any request body to the Anthropic API with the server's key. Planned: a rate limit and a fixed request shape.

## Setup

```bash
git clone https://github.com/gintarejat/Policy-reader
npm install
npm run dev        # UI only; /api/claude needs Vercel
# or
vercel dev         # UI + API together
# Vercel → Environment Variables:
ANTHROPIC_API_KEY=sk-ant-...
```

## Roadmap

- [x] Deterministic word-level diff in Compare
- [ ] Source-sentence trace for every extracted rule
- [ ] Chunking by section for long documents
- [ ] A regex threshold extractor
- [ ] A threshold delta table (`EUR 5,000 → 3,000, −40%`)
- [ ] A control-matrix view (requirement → control → evidence → owner)
- [ ] A gap check against a verified obligation list
- [ ] Version history

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

*Extraction aids reading. It doesn't replace it. Not legal advice. Built by Gintarė Jatautytė · [ajatauaml.com](https://ajatauaml.com)*
