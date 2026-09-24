// "How To Use" and "Place in AML OS" pages, in the same paper / ink / red / yellow style as the tool.

const css = `
  .ip { max-width: 820px; font-size: 13px; line-height: 1.75; color: #141414; }
  .ip-kicker { font-family: 'Permanent Marker', cursive; font-size: 14px; color: #E4161B; display: inline-block; transform: rotate(-1deg); }
  .ip-title { font-family: 'Archivo Black', sans-serif; font-size: 30px; text-transform: uppercase; line-height: 1.05; margin: 4px 0 10px; }
  .ip-lede { color: #5B564C; max-width: 640px; }
  .ip-lede b, .ip b { color: #141414; }
  .ip a { color: #E4161B; text-decoration: underline; text-decoration-color: #FFD60A; text-decoration-thickness: 3px; }
  .ip-hero { padding-bottom: 20px; border-bottom: 3px solid #141414; margin-bottom: 26px; }
  .ip-sec { font-family: 'Permanent Marker', cursive; font-size: 15px; color: #E4161B; display: flex; align-items: center; gap: 10px; margin: 30px 0 14px; }
  .ip-sec::after { content: ""; flex: 1; height: 2px; background: #141414; }
  .ip-card { background: #FFFDF8; border: 2px solid #141414; box-shadow: 4px 5px 0 #141414; padding: 14px 16px; margin-bottom: 14px; }
  .ip-card.human { box-shadow: 4px 5px 0 #E4161B; }
  .ip-card.ai { background: #FFF8D6; }
  .ip-step { display: flex; align-items: baseline; gap: 10px; margin-bottom: 6px; flex-wrap: wrap; }
  .ip-num { font-family: 'Archivo Black', sans-serif; font-size: 22px; color: #E4161B; line-height: 1; }
  .ip-h { font-family: 'Archivo Black', sans-serif; font-size: 15px; text-transform: uppercase; }
  .ip-who { font-family: 'Special Elite', 'Courier New', monospace; font-size: 10px; letter-spacing: .08em; text-transform: uppercase; border: 1.5px solid #141414; padding: 1px 7px; }
  .ip-who.human { color: #E4161B; border-color: #E4161B; }
  .ip-who.ai { background: #FFD60A; }
  .ip-who.code { background: #141414; color: #FFD60A; }
  .ip ol, .ip ul { margin: 4px 0 4px 20px; }
  .ip li { margin: 3px 0; }
  .ip code { font-family: 'Special Elite', 'Courier New', monospace; font-size: 11.5px; background: #F3EFE6; border: 1px solid #D6CFBF; padding: 0 4px; }
  .ip-good { margin-top: 8px; font-size: 12px; color: #5B564C; }
  .ip-warn { display: block; margin-top: 4px; font-family: 'Permanent Marker', cursive; font-size: 13px; color: #E4161B; }
  .ip-note { background: rgba(255,214,10,.25); border: 2px solid #141414; box-shadow: 4px 4px 0 #E4161B; padding: 14px 16px; }
  .ip-note-t { font-family: 'Archivo Black', sans-serif; color: #E4161B; font-size: 12px; text-transform: uppercase; margin-bottom: 4px; }
  .ip-note p { margin: 0 0 8px; } .ip-note p:last-child { margin: 0; }
  .ip-tbl-wrap { overflow-x: auto; }
  .ip-tbl { width: 100%; border-collapse: collapse; font-size: 12px; background: #FFFDF8; border: 2px solid #141414; }
  .ip-tbl th { font-family: 'Special Elite', 'Courier New', monospace; font-size: 10px; letter-spacing: .08em; text-transform: uppercase; text-align: left; padding: 7px 10px; border-bottom: 2px solid #141414; background: #F3EFE6; }
  .ip-tbl td { padding: 7px 10px; border-bottom: 1px solid #ECE6D8; vertical-align: top; }
  .ip-tbl td:first-child { font-weight: 600; }
  .ip-tag { display: inline-block; white-space: nowrap; font-family: 'Special Elite', 'Courier New', monospace; font-size: 10px; font-weight: 600; letter-spacing: .06em; padding: 2px 7px; border: 1px solid; }
  .ip-tag.ok { background: #E3F0E6; color: #1F7A3A; border-color: #1F7A3A; }
  .ip-tag.part { background: #FFF3B0; color: #141414; border-color: #B98900; }
  .ip-tag.no { background: #FDE8E8; color: #B3070C; border-color: #E4161B; }
  .ip-tag.na { background: #ECE6D8; color: #5B564C; border-color: #8A857B; }
  .ip-map { list-style: none; margin: 0; padding: 0; background: #FFFDF8; border: 2px solid #141414; box-shadow: 4px 5px 0 #141414; }
  .ip-map li { display: flex; align-items: center; gap: 12px; padding: 9px 14px; border-bottom: 1.5px solid #D6CFBF; }
  .ip-map li:last-child { border-bottom: none; }
  .ip-map .n { font-family: 'Archivo Black', sans-serif; font-size: 20px; color: #E4161B; width: 18px; flex-shrink: 0; }
  .ip-map .nm { font-family: 'Archivo Black', sans-serif; font-size: 12px; text-transform: uppercase; flex: 1; }
  .ip-map .t { font-family: 'Special Elite', 'Courier New', monospace; font-size: 11px; text-align: right; }
  .ip-map .here { background: #FFD60A; }
  .ip-map .here .t { font-family: 'Archivo Black', sans-serif; background: #141414; color: #FFD60A; padding: 2px 8px; transform: rotate(-1.5deg); }
  .ip-map .dim .n, .ip-map .dim .nm, .ip-map .dim .t { color: #8A857B; }
  .ip-flow { font-family: 'Special Elite', 'Courier New', monospace; font-size: 12px; background: #1A1712; color: #E8E2D2; border: 2px solid #141414; padding: 14px 16px; white-space: pre; overflow-x: auto; line-height: 1.6; }
  .ip-flow b { color: #FFD60A; font-weight: 400; }
  .ip-foot { margin-top: 30px; padding-top: 14px; border-top: 1px solid #D6CFBF; font-family: 'Special Elite', 'Courier New', monospace; font-size: 10px; color: #8A857B; }
  @media (max-width: 600px) {
    .ip-title { font-size: 23px; }
    .ip-map li { flex-wrap: wrap; gap: 2px 10px; }
    .ip-map .t { width: 100%; text-align: left; padding-left: 28px; }
  }
`;

const Tag = ({ k, children }) => <span className={"ip-tag " + k}>{children}</span>;
const Table = ({ head, rows }) => (
  <div className="ip-tbl-wrap">
    <table className="ip-tbl">
      <thead><tr>{head.map((h) => <th key={h}>{h}</th>)}</tr></thead>
      <tbody>{rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>)}</tbody>
    </table>
  </div>
);
const Step = ({ n, title, who, whoCls, cls = "", children }) => (
  <div className={"ip-card " + cls}>
    <div className="ip-step">
      <span className="ip-num">{n}</span><span className="ip-h">{title}</span>
      {who && <span className={"ip-who " + whoCls}>{who}</span>}
    </div>
    {children}
  </div>
);
const Foot = () => <div className="ip-foot">Extraction aids reading. It doesn't replace it. Not legal advice. Built by Gintarė Jatautytė · ajatauaml.com</div>;

export function HowToUsePage() {
  return (
    <div className="ip">
      <style>{css}</style>
      <div className="ip-hero">
        <div className="ip-kicker">User guide · Policy Reader</div>
        <h1 className="ip-title">How to use</h1>
        <p className="ip-lede"><b>Time:</b> under a minute per run · <b>Input:</b> plain text (copy from PDF/Word and paste).<br />
          Choose a mode at the top: <b>⬡ Compare</b> or <b>◈ Analyze</b>.</p>
      </div>

      <div className="ip-sec">⬡ Compare: what changed between two versions</div>
      <Step n="1" title="Paste both versions" who="You" whoCls="human">
        <ol>
          <li>Paste the old policy into <b>Version 1</b> ("Paste Version 1 here…").</li>
          <li>Paste the new policy into <b>Version 2</b>.<br />
            <i>To try it first:</i> click <b>Load sample policy</b>, which loads a demo AML policy V1 and V2 (the crypto-asset section changes, among others).</li>
        </ol>
      </Step>
      <Step n="2" title="Run the comparison" who="Code, then AI" whoCls="code" cls="ai">
        <ol start={3}>
          <li>Click <b>▶ Run Comparison</b>. The diff appears straight away: it is computed in your browser, word by word, from the text you pasted. A few seconds later the AI adds one-line summaries.</li>
        </ol>
      </Step>
      <Step n="3" title="Read the result" who="You" whoCls="human">
        <ol start={4}>
          <li>
            <b>Comparison summary</b> (marked <i>AI-written</i>), plus counts of <b>MODIFIED / ADDED / REMOVED</b> sections from the code.<br />
            One card per changed section. <b>Click a card to open it</b>:
            <ul>
              <li><i>modified</i>: <b>Previous version</b> and <b>Updated version</b> side by side, deleted words struck through and added words highlighted, plus an <code>old → new</code> chip for each change</li>
              <li><i>added</i>: <b>New section</b></li>
              <li><i>removed</i>: the deleted text</li>
            </ul>
            A red <b>NUMBER CHANGED</b> flag marks sections where an amount, limit or period was changed, added or removed.
          </li>
          <li><b>Before you rely on it:</b> the highlighted text is your own text, so every change the diff shows is real. The one-line summaries are AI-written and can misdescribe a change: read the highlights, not just the summary. Pay special attention to numbers, time limits and negations.
            <span className="ip-warn">If the AI summaries fail, the full diff still shows.</span></li>
          <li><b>Clear</b> resets the result.</li>
        </ol>
        <div className="ip-good"><b>Good uses:</b> preparing a "what's new in policy v3" note for the team, or checking whether a regulatory update actually made it into the policy.</div>
      </Step>

      <div className="ip-sec">◈ Analyze: every rule in one searchable list</div>
      <Step n="1" title="Paste one policy" who="You" whoCls="human">
        <ol>
          <li>Paste one policy into <b>Policy Document</b> ("Paste your policy document here…"), or click <b>Load sample policy</b>.</li>
        </ol>
      </Step>
      <Step n="2" title="Run the analysis" who="AI" whoCls="ai" cls="ai">
        <ol start={2}>
          <li>Click <b>▶ Analyse Policy</b>. The status line shows "Parsing document structure…", then "Extracting keywords and rules…", then "Grouping thresholds…".</li>
        </ol>
      </Step>
      <Step n="3" title="Read and narrow down" who="You" whoCls="human">
        <ol start={3}>
          <li>Read the result from top to bottom:
            <ul>
              <li><b>Document identified:</b> inferred title, type, jurisdiction</li>
              <li><b>Scope summary</b></li>
              <li><b>Keywords by section</b>: click a keyword to filter the rules</li>
              <li><b>Rules</b>, grouped by keyword, each tagged with its section and a type:
                {" "}<code>PROHIBITED</code> · <code>PERMITTED</code> · <code>THRESHOLD</code> · <code>REQUIRED</code> · <code>CONDITIONAL</code></li>
              <li><b>Thresholds summary</b></li>
            </ul>
          </li>
          <li>Narrow down:
            <ul>
              <li><b>Filter by rule type:</b> click a type chip (e.g. <code>THRESHOLD</code>) to see only those rules</li>
              <li><b>Search box:</b> "Search rules by keyword, section, or type…" (e.g. <code>EDD</code>, <code>crypto</code>, <code>stablecoin</code>)</li>
              <li>the counter shows how many rules match; <b>✕ Clear filter</b> resets</li>
            </ul>
          </li>
          <li><b>Check each rule against its section</b> in the source before you turn it into a control. The tool doesn't yet show the source sentence.</li>
        </ol>
        <div className="ip-good"><b>Good uses:</b> building a first draft of a control matrix; answering "what are all our monetary thresholds?"; onboarding someone to a long policy.</div>
      </Step>

      <div className="ip-sec">Tips</div>
      <div className="ip-note">
        <ul>
          <li>Keep the section headings when you paste (<code>SECTION 19 — …</code>, <code>Article 5</code>). Compare uses them to match sections between versions; Analyze uses them to tag rules.</li>
          <li>Very long policies: analyse one part at a time (for example, 5–10 sections per run) until chunking is built.</li>
          <li>Don't paste confidential internal policies into the public demo.</li>
        </ul>
      </div>

      <div className="ip-sec">Troubleshooting</div>
      <Table head={["Symptom", "Likely cause"]} rows={[
        ['"Please paste both policy versions." / "Please paste a policy document."', "Empty input"],
        ['"API error 401"', "API key missing or wrong in Vercel"],
        ['"API error 500" or another code', "The upstream API or the proxy failed; retry"],
        ["Compare: \"AI summaries unavailable\"", "The AI call failed. The diff below it is complete."],
        ["Compare: a renumbered section shows as removed + added", "Sections are matched by number, then title. Check both cards."],
        ["Analyze: parse error / fewer rules than expected on a long policy", "Output hit the 4,000-token cap. Split the document."],
        ["Rule looks wrong", "It may be paraphrased. Check the source section."],
      ]} />
      <Foot />
    </div>
  );
}

export function PlacePage() {
  return (
    <div className="ip">
      <style>{css}</style>
      <div className="ip-hero">
        <div className="ip-kicker">AML Operating System · Layer 1</div>
        <h1 className="ip-title">Place in the AML OS</h1>
        <p className="ip-lede"><b>Primary layer: 1 · Governance</b> (policy → control mapping). <b>Partial coverage.</b>{" "}
          <a href="https://ajatauaml.com/aml-operating-system.html">See the full map ↗</a></p>
      </div>

      <div className="ip-sec">Where it sits</div>
      <ol className="ip-map">
        <li className="here"><span className="n">1</span><span className="nm">Governance</span><span className="t">POLICY READER — partial</span></li>
        <li className="dim"><span className="n">2</span><span className="nm">Risk assessment</span><span className="t">not built</span></li>
        <li><span className="n">3</span><span className="nm">Customer lifecycle</span><span className="t">Scamnot</span></li>
        <li><span className="n">4</span><span className="nm">Control systems</span><span className="t">Scamnot partial; TM Lab planned</span></li>
        <li><span className="n">5</span><span className="nm">Investigation &amp; reporting</span><span className="t">SAR Draft Automation</span></li>
        <li className="dim"><span className="n">6</span><span className="nm">Effectiveness</span><span className="t">not built</span></li>
      </ol>

      <div className="ip-sec">Layer 1 · Governance</div>
      <Table head={["Element (from the AML OS map)", "Status", "Honest note"]} rows={[
        ["Policy → control mapping", <Tag k="part">⚠ First step</Tag>, <>It extracts <i>rules</i>. It doesn't yet map them to <i>controls</i>. Planned: a control matrix.</>],
        ["An owner for every control", <Tag k="no">✗ Not built</Tag>, "The planned control matrix has an Owner column filled in by a human"],
        ["✱ MLRO / escalation authority", <Tag k="na">— Human</Tag>, "Outside the tool"],
        ["Three lines of defence", <Tag k="na">— n/a</Tag>, "Not covered"],
        ["Quality assurance", <Tag k="part">⚠ Partial</Tag>, "Compare supports policy QA with a word-level diff computed by code; its one-line summaries are AI-written. There is no reviewer sign-off yet."],
        ["Independent testing & audit", <Tag k="part">⚠ Partial</Tag>, "Version history and source-sentence tracing (both planned) would make it audit-usable"],
      ]} />

      <div className="ip-sec">Why Governance is the top of the stack</div>
      <p>Every other layer depends on it. The <b>threshold</b> Policy Reader extracts (e.g. "EDD for crypto transactions above EUR 3,000") is the parameter a <b>Layer 4</b> TM rule should use, and the <b>required</b> actions are what a <b>Layer 5</b> investigation checks against.</p>
      <div className="ip-flow">{`Policy text ──(Policy Reader)──► rule: "EDD if crypto tx > EUR 3,000"
                                        │
                                        ▼
                     TM Lab rule parameter :min_amt = 3000   (Layer 4, planned)
                                        │
                                        ▼
               Alert → SAR Draft Automation checklist         (Layer 5)`}</div>
      <p style={{ marginTop: 12 }}><b>Planned link (worth building):</b> export extracted thresholds as JSON that the TM Lab can import as rule parameters, and flag <b>drift</b> when the policy changes but the rule parameters haven't. Both a regulatory change and an operational change should trigger that review.</p>

      <div className="ip-sec">Upstream and downstream</div>
      <Table head={["Direction", "Link"]} rows={[
        ["Upstream", "Regulation (AMLR, MiCA, TFR, national law), board-approved policy versions"],
        ["Downstream → Layer 4", "Threshold and rule parameters for screening and TM (planned)"],
        ["Downstream → Layer 5", "Required actions become investigation checklist items"],
        ["Downstream → Layer 6", "Version history and change log as audit evidence (planned)"],
      ]} />

      <div className="ip-sec">Human gates (✱ in the map)</div>
      <Step n="1" title="Reviewer checks every change and rule against the source" who="Today, manual" whoCls="human" cls="human" />
      <Step n="2" title="Policy owner confirms each control-matrix row and assigns an owner" who="Planned" whoCls="" cls="human" />
      <Step n="3" title="Reviewer sign-off before export" who="Planned" whoCls="" cls="human" />

      <div className="ip-sec">Why this layer matters</div>
      <div className="ip-note">
        <div className="ip-note-t">Defensible in front of an auditor</div>
        <p>Governance work means turning law, licence conditions and policy into requirements, with each requirement traced to a specific provision and anything that can't be traced removed, and then turning those requirements into configuration: thresholds and rule sets. An auditor will also ask for policy version control and a change log.</p>
        <p>Policy Reader already does the extraction, and Compare now shows every change as a word-level diff of the source text. <b>Source-sentence tracing plus version history</b> is what makes it fully defensible in front of an auditor.</p>
      </div>
      <Foot />
    </div>
  );
}
