# Full Batch 3 Prompts (For a Brand New AI Session)

Since your credits expired and the new AI has no memory of Batch 1 or Batch 2, we have to feed it the entire project context (including all the gorgeous CSS we wrote) so it can perfectly match the design. Paste these 4 prompts in sequence.

## PROMPT 1: Architecture, CSS, and Layout
```text
I am building a Next.js cybersecurity learning platform called Cyber Box. I have already built the core framework, the dashboard, and the learning paths. I need your help to refactor the Homework section (which I call Batch 3) to match my premium UI style.

Please read the following context files representing my global CSS and main layout shell. Do NOT write any code yet. Just reply 'Styles and layout absorbed.'

--- BEGIN FILE: src/app/globals.css ---
:root {
  color-scheme: dark;
  --bg: #090e14;
  --surface: #101820;
  --border: #24313c;
  --text: #edf3f7;
  --muted: #a0afbd;
  --green: #b8f777;
  --purple: #c4b5fd;
}

* { box-sizing: border-box; }

body {
  margin: 0;
  background: var(--bg);
  color: var(--text);
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, sans-serif;
  font-size: 15px;
  line-height: 1.65;
}

button, a, summary { -webkit-tap-highlight-color: transparent; }
button { font: inherit; cursor: pointer; }
button:disabled { cursor: default; opacity: .65; }
a { color: inherit; text-decoration: none; }
button, a, summary { outline-offset: 5px; }
:focus-visible { outline: 2px solid var(--green); }
::selection { background: #b8f777; color: #101820; }
h1, h2, h3, p { margin-top: 0; }
h2, h3 { line-height: 1.35; }
p { color: var(--muted); }
svg { flex-shrink: 0; }
.accent { color: var(--green); }

.app-shell { display: flex; min-height: 100vh; }
.skip-link {
  position: fixed; top: 10px; left: 10px; z-index: 100;
  padding: 10px 18px; background: var(--green); color: var(--bg);
  transform: translateY(-160%);
}
.skip-link:focus { transform: translateY(0); }

.sidebar {
  width: 260px; flex-shrink: 0; padding: 32px 20px 24px;
  border-right: 1px solid var(--border); background: #0c1219;
  position: sticky; top: 0; height: 100vh;
  overflow-y: auto; display: flex; flex-direction: column;
}
.brand {
  display: flex; align-items: center; gap: 11px;
  padding: 0 10px; font-size: 23px; font-weight: 800;
  letter-spacing: -.8px;
}
.brand-icon, .avatar {
  display: grid; place-items: center; flex-shrink: 0;
  width: 39px; height: 39px; border-radius: 12px;
  background: #b8f777; color: #14210d;
}
.workspace-label {
  font-size: 10px; letter-spacing: 1.7px;
  color: var(--muted); margin: 48px 12px 18px;
}
.sidebar-section {
  display: flex; align-items: center; gap: 10px;
  padding: 0 12px; font-size: 13px; font-weight: 650;
}
.lesson-navigation { display: grid; gap: 8px; margin-top: 20px; }
.lesson-link {
  display: flex; align-items: center; gap: 10px; width: 100%;
  padding: 13px 10px; border: 1px solid transparent;
  border-radius: 10px; background: transparent;
  color: var(--muted); text-align: left; font-size: 12px;
}
.lesson-link > span:nth-child(2) { flex: 1; }
.lesson-link:hover { background: #151e27; color: var(--text); }
.lesson-link.active {
  color: var(--green); background: #17231c; border-color: #304333;
}
.lesson-number {
  width: 26px; height: 26px; display: grid; place-items: center;
  border: 1px solid var(--border); border-radius: 7px; font-size: 10px;
}
.sidebar-progress {
  margin-top: auto; padding: 36px 12px 25px; font-size: 12px;
}
.icon-label { display: inline-flex; align-items: center; gap: 9px; }
.sidebar-progress .icon-label { color: var(--green); }
progress {
  width: 100%; height: 6px; margin: 16px 0 7px;
  border: 0; border-radius: 20px; overflow: hidden;
  background: #22302a; accent-color: var(--green);
}
progress::-webkit-progress-bar { background: #22302a; }
progress::-webkit-progress-value { background: var(--green); }
progress::-moz-progress-bar { background: var(--green); }
.sidebar-progress p { margin-bottom: 0; }
.sidebar-progress small, .sidebar-footer small { color: var(--muted); }
.sidebar-footer {
  display: flex; align-items: center; gap: 11px;
  border-top: 1px solid var(--border); padding: 22px 6px 0;
}
.avatar { background: #29243c; color: #e0d5ff; font-weight: 700; }
.sidebar-footer strong, .sidebar-footer small {
  display: block; font-size: 11px;
}

.main { min-width: 0; width: 100%; max-width: 1500px; margin: 0 auto; padding: 0 48px 70px; }
.topbar {
  min-height: 85px; display: flex; align-items: center;
  justify-content: space-between; gap: 16px;
  border-bottom: 1px solid var(--border);
}
.breadcrumb {
  display: flex; flex-wrap: wrap; align-items: center;
  gap: 10px; color: var(--muted); font-size: 12px;
}
.breadcrumb span { color: var(--text); }
.pill, .offline-badge {
  border: 1px solid var(--border); border-radius: 999px;
  padding: 5px 10px; font-size: 10px; letter-spacing: 1px;
  white-space: nowrap; color: var(--muted);
}
.hero {
  display: flex; align-items: center; justify-content: space-between;
  gap: 28px; padding: 55px 0 44px;
}
.hero > div:first-child { max-width: 660px; }
.eyebrow { font-size: 10px; font-weight: 750; letter-spacing: 1.8px; }
h1 {
  margin: 14px 0 18px; font-size: clamp(36px, 4.5vw, 62px);
  line-height: 1.05; letter-spacing: -2.8px; font-weight: 750;
}
.hero p { max-width: 560px; margin-bottom: 22px; font-size: 15px; }
.lesson-meta { display: flex; flex-wrap: wrap; gap: 20px; font-size: 11px; }
.lesson-meta span + span::before {
  content: "·"; color: var(--muted); margin-right: 20px;
}
.hero-art {
  position: relative; width: 170px; height: 170px;
  flex-shrink: 0; display: grid; place-items: center;
}
.orbit { position: absolute; border: 1px solid #2b3d31; border-radius: 50%; }
.orbit-one { width: 164px; height: 164px; }
.orbit-two { width: 125px; height: 125px; border-style: dashed; }
.hero-terminal {
  width: 82px; height: 82px; display: grid; place-items: center;
  border: 1px solid #49663a; border-radius: 23px;
  color: var(--green); background: #1c2d20;
  transform: rotate(-8deg); box-shadow: 0 0 65px #b8f77712;
}
.orbit-dot {
  position: absolute; width: 11px; height: 11px; border-radius: 50%;
  background: var(--green); top: 28px; right: 18px;
  box-shadow: 0 0 18px #b8f77770;
}

.content-layout {
  display: grid; grid-template-columns: minmax(0, 1fr) 245px;
  gap: 30px; align-items: start;
}
.lesson-content { min-width: 0; display: grid; gap: 25px; }
.note { padding: 5px 0; }
.note h2 { font-size: 23px; letter-spacing: -.6px; margin-bottom: 13px; }
.note p { margin-bottom: 0; white-space: pre-line; }
.code-card, .lab-card, .quiz-card, .mission-card, .completion-card {
  border: 1px solid var(--border); border-radius: 16px;
  background: var(--surface); overflow: hidden;
}
.panel-heading {
  display: flex; justify-content: space-between; align-items: center;
  flex-wrap: wrap; gap: 12px; padding: 14px 20px;
  border-bottom: 1px solid var(--border); font-size: 12px;
}
.panel-heading .eyebrow { color: var(--muted); }
pre {
  margin: 0; padding: 22px; background: #0b1217;
  white-space: pre-wrap; overflow-wrap: anywhere;
}
code { color: var(--green); font-family: "SFMono-Regular", Consolas, monospace; font-size: 13px; }
.code-caption { padding: 15px 20px; margin: 0; font-size: 12px; }
.tip {
  display: flex; align-items: flex-start; gap: 13px; padding: 21px;
  border: 1px solid #3a3153; background: #1a1727; border-radius: 13px;
}
.tip > svg { color: var(--purple); margin-top: 3px; }
.tip h3 { color: #e0d5ff; font-size: 14px; margin-bottom: 7px; }
.tip p { margin-bottom: 0; color: #b9b0ce; font-size: 13px; }
.lab-card { border-color: transparent; background: #090f13; }
.lab-card .panel-heading { background: #152119; }
.terminal-placeholder {
  display: flex; flex-direction: column; align-items: center;
  padding: 36px 24px; text-align: center;
  background-color: #090f13;
  background-image: radial-gradient(#26392c 1px, transparent 1px);
  background-size: 20px 20px;
}
.terminal-symbol {
  display: grid; place-items: center; width: 55px; height: 55px;
  margin-bottom: 15px; border-radius: 15px;
  background: #17241b; color: var(--green); border: 1px solid #324738;
}
.terminal-placeholder h3 { margin-bottom: 6px; font-size: 17px; }
.terminal-placeholder p { max-width: 330px; font-size: 12px; }
.primary-button, .secondary-button {
  display: inline-flex; align-items: center; justify-content: center;
  gap: 8px; padding: 10px 15px; border-radius: 9px;
  border: 1px solid transparent; font-size: 12px; font-weight: 700;
}
.primary-button { background: var(--green); color: #15210d; }
.primary-button:hover:not(:disabled) { background: #cefaa4; }
.secondary-button { background: #18231e; border-color: #334b3a; color: #c1d8c7; }
.lab-instructions { padding: 21px; }
.lab-instructions .eyebrow { color: var(--green); }
.lab-instructions p { margin: 9px 0 15px; font-size: 13px; }
details { border-top: 1px solid var(--border); padding-top: 12px; }
summary { cursor: pointer; color: var(--green); font-size: 12px; }
details p { overflow-wrap: anywhere; }

.quiz-card { padding: 23px; }
.quiz-card > .eyebrow { color: var(--purple); }
.quiz-card h3 { margin: 11px 0 18px; font-size: 18px; }
.quiz-options { display: grid; gap: 9px; }
.quiz-option {
  display: flex; align-items: center; gap: 12px; padding: 12px;
  text-align: left; background: #0c131a; color: var(--text);
  border: 1px solid var(--border); border-radius: 10px; font-size: 13px;
}
.quiz-option:hover { border-color: #60764d; }
.quiz-option.selected { border-color: var(--green); background: #1b291e; }
.quiz-option > svg { margin-left: auto; color: var(--green); }
.option-letter {
  display: grid; place-items: center; width: 25px; height: 25px;
  border: 1px solid var(--border); border-radius: 6px;
  font-size: 10px; color: var(--muted);
}
.quiz-feedback { margin: 15px 0 0; font-size: 12px; min-height: 20px; }
.mission-card { padding: 24px; position: sticky; top: 25px; }
.mission-icon {
  display: grid; place-items: center; width: 45px; height: 45px;
  background: #272138; color: var(--purple); border-radius: 13px;
  margin-bottom: 23px;
}
.mission-card > .eyebrow { color: var(--muted); }
.mission-card h2 { font-size: 26px; letter-spacing: -.9px; margin: 12px 0; }
.mission-card p, .mission-card li { font-size: 12px; }
.mission-card ol { padding-left: 20px; margin: 20px 0 26px; }
.mission-card li { padding-left: 6px; margin-bottom: 15px; }
.mission-card li::marker { color: var(--green); font-weight: 700; }
.mission-note {
  padding-top: 18px; border-top: 1px solid var(--border);
  color: var(--muted); font-size: 11px;
}
.completion-card {
  display: flex; align-items: center; justify-content: space-between;
  flex-wrap: wrap; gap: 16px; padding: 23px;
}
.completion-card h3 { margin-bottom: 5px; font-size: 16px; }
.completion-card p { margin-bottom: 0; font-size: 12px; }
.completion-card .save-notice { width: 100%; color: var(--green); }
.save-notice:empty { display: none; }

@media (max-width: 1150px) {
  .main { padding-inline: 30px; }
  .content-layout { grid-template-columns: minmax(0, 1fr); }
  .mission-card { position: static; grid-row: 1; }
  .mission-card h2 br { display: none; }
  .mission-card ol { margin-bottom: 0; }
  .mission-card .mission-note, .mission-icon { display: none; }
  .hero-art { width: 140px; }
}

@media (max-width: 760px) {
  .app-shell { display: block; }
  .sidebar {
    position: static; width: 100%; height: auto; padding: 20px;
    border-right: 0; border-bottom: 1px solid var(--border);
  }
  .brand { padding: 0; }
  .workspace-label, .sidebar-section, .sidebar-footer { display: none; }
  .lesson-navigation { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .lesson-link { font-size: 11px; }
  .lesson-link > svg { display: none; }
  .sidebar-progress { padding: 20px 0 0; }
  .sidebar-progress progress { margin-top: 10px; }
  .main { padding: 0 20px 40px; }
  .topbar { min-height: 65px; }
  .topbar .pill { display: none; }
  .hero { padding: 34px 0; }
  .hero-art { display: none; }
  h1 { letter-spacing: -1.8px; }
  .lesson-meta { gap: 10px; }
  .lesson-meta span + span::before { margin-right: 10px; }
  .content-layout { gap: 23px; }
}

@media (prefers-reduced-motion: no-preference) {
  button { transition: background-color .15s ease, border-color .15s ease; }
}

.live-lab { min-width: 0; }

.terminal-controls {
  display: flex;
  align-items: flex-end;
  gap: 12px;
  padding: 18px 20px;
  border-bottom: 1px solid var(--border);
  background: #101a15;
}

.terminal-code {
  display: grid;
  gap: 7px;
  flex: 1;
  min-width: 0;
}

.terminal-code > span {
  color: var(--muted);
  font-size: 11px;
  font-weight: 650;
}

.terminal-code input {
  width: 100%;
  min-width: 0;
  padding: 11px 12px;
  border: 1px solid #344738;
  border-radius: 9px;
  background: #090f13;
  color: var(--text);
  font: inherit;
  font-size: 12px;
}

.terminal-code input::placeholder { color: #92a196; }
.terminal-code input:disabled { opacity: .6; }

.terminal-window {
  position: relative;
  padding: 14px;
  background: #090f13;
}

.terminal-screen {
  height: 500px;
  min-width: 0;
}

.terminal-screen .xterm { height: 100%; }

.terminal-empty {
  position: absolute;
  inset: 0;
  display: grid;
  place-content: center;
  margin: 0;
  padding: 24px;
  text-align: center;
  pointer-events: none;
  font-size: 13px;
}

.terminal-status {
  margin: 0;
  padding: 12px 20px;
  border-top: 1px solid var(--border);
  color: #bfd3c2;
  background: #101a15;
  font-size: 12px;
}

@media (max-width: 600px) {
  .terminal-controls {
    align-items: stretch;
    flex-direction: column;
  }

  .terminal-screen { height: 400px; }
  .terminal-window { padding: 10px; }
}
.login-shell {
  min-height: 100svh;
  display: grid;
  place-items: center;
  padding: 24px;
}

.login-card {
  width: 100%;
  max-width: 410px;
  padding: 30px;
}

.login-card .brand { padding: 0; }

.login-card h1 {
  margin: 28px 0 12px;
  font-size: 32px;
  letter-spacing: -1.2px;
}

.login-card > p { font-size: 13px; }

.login-form {
  display: grid;
  gap: 16px;
  margin-top: 24px;
}

.login-form .quiz-feedback {
  margin: 0;
  color: var(--purple);
}
.workspace-shell { background: var(--bg); }
.workspace-shell .main { max-width: 1080px; }
.workspace-shell .sidebar-footer { margin-top: auto; }

.workspace-shell .hero { padding: 44px 0 32px; }
.workspace-shell .hero p { margin-bottom: 0; }

.workspace-shell h1 {
  margin: 0 0 12px;
  font-size: clamp(28px, 4vw, 40px);
  line-height: 1.15;
  letter-spacing: -1.2px;
}

.overview-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 24px 56px;
  margin: 0;
  padding-bottom: 28px;
  border-bottom: 1px solid var(--border);
}

.overview-stats dt { color: var(--muted); font-size: 12px; }

.overview-stats dd {
  margin: 6px 0 0;
  font-size: 30px;
  line-height: 1.2;
  font-weight: 700;
}

.overview-info {
  margin: 16px 0 32px;
  color: var(--muted);
  font-size: 12px;
}

.next-step { padding: 26px; margin-bottom: 40px; gap: 24px; }
.next-step .eyebrow { color: var(--muted); }
.next-step h2 { margin: 10px 0 8px; font-size: 20px; }
.next-step p { margin: 0; font-size: 13px; }
.overview-section > h2 { margin-bottom: 18px; font-size: 18px; }

.certificate-list,
.path-grid {
  display: grid;
  gap: 14px;
  padding: 0;
  margin: 0;
  list-style: none;
}

.certificate-row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px 22px;
}

.certificate-row > svg { color: var(--purple); }
.certificate-row strong { display: block; font-size: 13px; }
.certificate-row small {
  display: block;
  margin-top: 3px;
  color: var(--muted);
  font-size: 12px;
}

.path-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.path-card { display: block; height: 100%; padding: 26px; }

.path-title {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.path-title h2 { margin: 0; font-size: 19px; }
.path-title > svg { margin-top: 4px; color: var(--muted); }
.path-card > p { margin: 12px 0 24px; font-size: 12px; }
.path-tags { display: flex; flex-wrap: wrap; gap: 8px; }
.path-tags .pill { font-size: 11px; letter-spacing: 0; }

.path-title h2,
.certificate-row strong,
.next-step h2 { overflow-wrap: anywhere; }

.path-card:hover,
.certificate-row:hover { border-color: #48613d; }

@media (max-width: 1000px) {
  .path-grid { grid-template-columns: minmax(0, 1fr); }
}

@media (max-width: 760px) {
  .workspace-shell .hero { padding: 32px 0 28px; }
  .next-step, .path-card { padding: 22px; }
}
.terminal-screen .xterm-viewport { overflow-x: hidden !important; }
.homework-form {
  display: grid;
  gap: 10px;
  margin: 20px 0;
}

.homework-form label {
  color: var(--text);
  font-size: 13px;
  font-weight: 650;
}

.homework-form input[type="file"] {
  width: 100%;
  min-width: 0;
  padding: 10px;
  border: 1px solid var(--border);
  border-radius: 9px;
  background: var(--bg);
  color: var(--muted);
  font: inherit;
  font-size: 12px;
}

.homework-form input::file-selector-button {
  margin-right: 12px;
  padding: 7px 10px;
  border: 1px solid #334b3a;
  border-radius: 6px;
  background: #18231e;
  color: #c1d8c7;
  cursor: pointer;
}

.homework-form small { color: var(--muted); }
.homework-form .primary-button { justify-self: start; }

.homework-card .homework-best strong,
.homework-card .homework-summary strong {
  color: var(--green);
}

.homework-card .homework-error { color: #ff8b8b; }

.homework-results {
  display: grid;
  gap: 10px;
  margin: 18px 0 0;
  padding: 0;
  list-style: none;
}

.homework-test {
  padding: 14px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: #0c131a;
}

.homework-test[data-passed="true"] { border-color: #344738; }

.homework-test-heading {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
}

.homework-test-heading > span { flex: 1; }
.homework-test-heading small { white-space: nowrap; }

.homework-test[data-passed="true"] svg { color: var(--green); }
.homework-test[data-passed="false"] svg { color: #ff8b8b; }

.homework-test details,
.homework-diagnostics {
  margin-top: 12px;
}

.homework-card pre {
  max-height: 220px;
  margin-top: 10px;
  padding: 12px;
  overflow: auto;
  font-size: 12px;
}

.homework-path-card,
.homework-question {
  border: 1px solid var(--border);
  border-radius: 16px;
  background: var(--surface);
}

.homework-list {
  display: grid;
  gap: 16px;
}

.homework-question {
  padding-top: 0;
  overflow: hidden;
}

.homework-question-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 20px 24px;
  color: var(--text);
}

.homework-question-heading strong {
  display: block;
  font-size: 15px;
}

.homework-question-heading small {
  display: block;
  margin-top: 4px;
  color: var(--muted);
  font-size: 12px;
}

.homework-best {
  color: var(--green);
  font-size: 12px;
  white-space: nowrap;
}

.homework-question[open] > summary {
  border-bottom: 1px solid var(--border);
}

.homework-question-body {
  padding: 24px;
}

.homework-objective {
  white-space: pre-line;
}

.homework-upload {
  display: grid;
  gap: 12px;
  margin: 24px 0;
}

.homework-upload label {
  font-size: 13px;
  font-weight: 700;
}

.homework-upload input {
  width: 100%;
  padding: 14px;
  border: 1px dashed var(--border);
  border-radius: 10px;
  background: var(--bg);
  color: var(--text);
}

.homework-upload small {
  color: var(--muted);
}

.homework-upload button {
  justify-self: start;
}

.homework-error,
.test-fail {
  color: #ff8b8b;
}

.homework-error:empty {
  display: none;
}

.test-pass {
  color: var(--green);
}

.submission-list,
.homework-results {
  display: grid;
  gap: 12px;
  padding: 0;
  margin: 18px 0;
  list-style: none;
}

.submission-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  width: 100%;
  padding: 14px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--bg);
  color: var(--text);
  text-align: left;
  cursor: pointer;
  transition: border-color 0.15s ease, background-color 0.15s ease;
}

.submission-row:hover {
  border-color: var(--green);
  background: #151e27;
}

.submission-row[aria-pressed="true"] {
  border-color: var(--green);
  background: rgba(184, 247, 119, 0.06);
}

.submission-row small {
  display: block;
  color: var(--muted);
  font-size: 11px;
}

.homework-question > summary {
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.homework-question > summary:hover {
  background: #151e27;
}

.homework-results details > summary {
  cursor: pointer;
}

.homework-results details > summary:hover {
  opacity: 0.85;
}

.submission-detail {
  margin-top: 28px;
  padding-top: 24px;
  border-top: 1px solid var(--border);
}

.submission-detail pre {
  margin-top: 12px;
  max-height: 420px;
  overflow: auto;
}

.homework-results p {
  margin: 14px 0 4px;
  font-size: 12px;
}

@media (max-width: 600px) {
  .homework-question-heading,
  .submission-row {
    align-items: flex-start;
    flex-direction: column;
  }

  .homework-question-body {
    padding: 18px;
  }
}

.homework-upload input::file-selector-button {
  margin-right: 12px;
  padding: 8px 16px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--surface);
  color: var(--text);
  font-family: inherit;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s ease;
}
.homework-upload input::file-selector-button:hover {
  background: var(--border);
}


--- END FILE: src/app/globals.css ---

--- BEGIN FILE: src/app/workspace.css ---
/* Batch 1 workspace navigation and dashboard.
   Existing lesson, homework, CTF, and xterm styling stays in globals.css. */

   .workspace-frame {
    --workspace-width: 1360px;
    --workspace-line: #25323d;
    --workspace-soft: #111a23;
  
    display: flex;
    flex-direction: column;
    min-height: 100svh;
    background:
      radial-gradient(ellipse at 8% 0%, #263c2a26, transparent 38rem),
      radial-gradient(ellipse at 95% 18%, #302d4920, transparent 36rem),
      var(--bg);
  }
  
  .workspace-header {
    position: sticky;
    top: 0;
    z-index: 40;
    border-bottom: 1px solid #29353e;
    background: #0b1219f2;
    backdrop-filter: blur(18px);
  }
  
  .workspace-header-inner {
    display: flex;
    align-items: center;
    gap: 36px;
    width: 100%;
    max-width: calc(var(--workspace-width) + 80px);
    min-height: 82px;
    margin-inline: auto;
    padding-inline: 40px;
  }
  
  .workspace-brand {
    display: inline-flex;
    align-items: center;
    gap: 11px;
    flex-shrink: 0;
    font-size: 21px;
    font-weight: 750;
    letter-spacing: -.7px;
  }
  
  .workspace-brand-mark {
    display: grid;
    place-items: center;
    width: 37px;
    height: 37px;
    border: 1px solid #92bd653d;
    border-radius: 11px;
    color: var(--green);
    background: linear-gradient(145deg, #293925, #14231a);
    box-shadow: inset 0 1px 0 #d7ffc018;
  }
  
  .workspace-navigation {
    display: flex;
    align-items: stretch;
    align-self: stretch;
    gap: 8px;
    margin-inline: auto;
  }
  
  .workspace-nav-link {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 15px;
    color: var(--muted);
    font-size: 12px;
    font-weight: 600;
    white-space: nowrap;
  }
  
  .workspace-nav-link::after {
    position: absolute;
    right: 15px;
    bottom: 0;
    left: 15px;
    height: 2px;
    border-radius: 2px 2px 0 0;
    background: var(--green);
    content: "";
    transform: scaleX(0);
    transform-origin: center;
  }
  
  .workspace-nav-link:hover,
  .workspace-nav-link.is-active {
    color: var(--text);
    background: linear-gradient(0deg, #b8f77708, transparent 75%);
  }
  
  .workspace-nav-link:hover::after {
    transform: scaleX(.55);
  }
  
  .workspace-nav-link.is-active::after {
    transform: scaleX(1);
    box-shadow: 0 -3px 16px #b8f77726;
  }
  
  .workspace-profile {
    display: inline-flex;
    align-items: center;
    gap: 9px;
    flex-shrink: 0;
    padding: 6px 11px 6px 6px;
    border: 1px solid #2a3643;
    border-radius: 999px;
    background: #121b25;
    font-size: 12px;
    font-weight: 600;
  }
  
  .workspace-profile:hover {
    border-color: #687d58;
    background: #17221f;
  }
  
  .workspace-profile-icon {
    display: grid;
    place-items: center;
    width: 29px;
    height: 29px;
    border: 1px solid #443e57;
    border-radius: 50%;
    color: #d9cff7;
    background: #292439;
  }
  
  .workspace-main {
    flex: 1;
    width: 100%;
    max-width: calc(var(--workspace-width) + 80px);
    min-width: 0;
    margin-inline: auto;
    padding: 0 40px 64px;
  }
  
  .workspace-footer {
    display: flex;
    justify-content: space-between;
    gap: 20px;
    width: calc(100% - 80px);
    max-width: var(--workspace-width);
    margin-inline: auto;
    padding: 22px 0;
    border-top: 1px solid var(--workspace-line);
    color: var(--muted);
    font-size: 11px;
  }
  
  .workspace-footer > span:first-child {
    color: #c5d1d9;
    font-weight: 650;
  }
  
  .workspace-frame h1 {
    font-size: clamp(30px, 3.6vw, 46px);
    line-height: 1.14;
    letter-spacing: -1.6px;
  }
  
  .workspace-frame > .workspace-main > .hero {
    padding-block: 42px 34px;
  }
  
  .workspace-frame .primary-button,
  .workspace-frame .secondary-button {
    min-height: 40px;
  }
  
  .workspace-frame .primary-button {
    box-shadow: inset 0 1px 0 #ffffff38;
  }
  
  .workspace-frame .secondary-button:hover {
    border-color: #627c53;
    background: #213027;
  }
  
  /* Dashboard */
  .dashboard-page {
    padding-top: 42px;
  }
  
  .dashboard-heading {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    gap: 28px;
    margin-bottom: 30px;
  }
  
  .dashboard-kicker {
    display: inline-block;
    color: #91a38f;
    font-size: 10px;
    font-weight: 750;
    letter-spacing: 1.7px;
    text-transform: uppercase;
  }
  
  .dashboard-heading h1 {
    margin: 10px 0 12px;
  }
  
  .dashboard-heading p {
    max-width: 650px;
    margin: 0;
    font-size: 14px;
  }
  
  .dashboard-account-note {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
    margin-bottom: 4px;
    color: var(--muted);
    font-size: 11px;
  }
  
  .dashboard-account-note > span {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #94c870;
  }
  
  .dashboard-stats {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    margin: 0 0 24px;
    overflow: hidden;
    border: 1px solid var(--workspace-line);
    border-radius: 15px;
    background: linear-gradient(120deg, #15201d60, #111922);
  }
  
  .dashboard-stat {
    min-width: 0;
    padding: 24px;
  }
  
  .dashboard-stat + .dashboard-stat {
    border-left: 1px solid var(--workspace-line);
  }
  
  .dashboard-stat dt {
    display: flex;
    align-items: center;
    gap: 9px;
    color: #b3c0ca;
    font-size: 12px;
  }
  
  .dashboard-stat dt svg {
    color: #819887;
  }
  
  .dashboard-stat dd {
    margin: 15px 0 9px;
    font-size: 33px;
    font-weight: 700;
    letter-spacing: -1px;
    line-height: 1;
    font-variant-numeric: tabular-nums;
  }
  
  .dashboard-stat dd > span {
    color: #8494a1;
    font-size: 19px;
    font-weight: 500;
  }
  
  .dashboard-stat p {
    margin: 0;
    font-size: 11px;
    line-height: 1.6;
  }
  
  .dashboard-feature-grid {
    display: grid;
    grid-template-columns: minmax(0, 1.8fr) minmax(280px, 1fr);
    gap: 24px;
  }
  
  .dashboard-next {
    position: relative;
    display: flex;
    align-items: flex-start;
    flex-wrap: wrap;
    gap: 22px;
    min-width: 0;
    padding: 32px;
    overflow: hidden;
    border: 1px solid #3b4e3b;
    border-radius: 16px;
    background:
      radial-gradient(ellipse at 100% 0%, #95be4c13, transparent 65%),
      linear-gradient(120deg, #17251d, #111c1c);
    box-shadow: inset 0 1px 0 #d5ffc00a;
  }
  
  .dashboard-next-icon {
    display: grid;
    place-items: center;
    width: 50px;
    height: 50px;
    flex-shrink: 0;
    border: 1px solid #4d653b;
    border-radius: 14px;
    color: var(--green);
    background: linear-gradient(135deg, #2d4226, #1a2b20);
  }
  
  .dashboard-next-content {
    flex: 1 1 240px;
    min-width: 0;
  }
  
  .dashboard-next-content h2 {
    margin: 11px 0 12px;
    font-size: clamp(22px, 2.3vw, 29px);
    letter-spacing: -.7px;
  }
  
  .dashboard-next-content p {
    max-width: 520px;
    margin: 0 0 24px;
    font-size: 13px;
    line-height: 1.8;
  }
  
  .dashboard-action {
    padding-inline: 18px;
  }
  
  .dashboard-next-meta {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 18px;
    width: 100%;
    padding-top: 17px;
    border-top: 1px solid #b8f77714;
    color: #aabca6;
    font-size: 11px;
  }
  
  .dashboard-next-meta > span {
    display: inline-flex;
    align-items: center;
    gap: 7px;
  }
  
  .dashboard-panel {
    min-width: 0;
    padding: 26px;
    border: 1px solid var(--workspace-line);
    border-radius: 16px;
    background: linear-gradient(145deg, #121c25, #101820);
  }
  
  .dashboard-section {
    margin-top: 42px;
  }
  
  .dashboard-section-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 24px;
    margin-bottom: 22px;
  }
  
  .dashboard-section-heading h2 {
    margin: 6px 0 0;
    font-size: 23px;
    letter-spacing: -.6px;
  }
  
  .dashboard-section-heading p {
    margin: 8px 0 0;
    font-size: 12px;
  }
  
  .dashboard-section-heading > svg {
    color: #a9bd9d;
  }
  
  .dashboard-section-heading.compact {
    margin-bottom: 20px;
  }
  
  .dashboard-section-heading.compact h2 {
    font-size: 20px;
  }
  
  .dashboard-text-link {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
    color: #d0e3c2;
    font-size: 12px;
    font-weight: 650;
  }
  
  .dashboard-text-link:hover {
    color: var(--green);
  }
  
  .dashboard-xp-list {
    display: grid;
    gap: 13px;
    margin: 0;
  }
  
  .dashboard-xp-list > div {
    display: flex;
    justify-content: space-between;
    gap: 20px;
  }
  
  .dashboard-xp-list dt {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    color: #bac7d0;
    font-size: 12px;
  }
  
  .dashboard-xp-list dd {
    margin: 0;
    font-size: 12px;
    font-weight: 650;
    font-variant-numeric: tabular-nums;
  }
  
  .dashboard-xp-dot {
    width: 7px;
    height: 7px;
    border-radius: 2px;
  }
  
  .dashboard-xp-dot.reading { background: #b8f777; }
  .dashboard-xp-dot.labs { background: #86d9dc; }
  .dashboard-xp-dot.homework { background: #c4b5fd; }
  .dashboard-xp-dot.ctf { background: #e6bd77; }
  
  .dashboard-panel-note {
    margin: 20px 0 0;
    padding-top: 16px;
    border-top: 1px solid var(--workspace-line);
    color: #94a4b0;
    font-size: 11px;
    line-height: 1.8;
  }
  
  .dashboard-path-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 330px), 1fr));
    gap: 20px;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  
  .dashboard-path-grid > li {
    min-width: 0;
  }
  
  .dashboard-path-card {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-width: 0;
    overflow: hidden;
    border: 1px solid #2b3943;
    border-radius: 16px;
    background:
      radial-gradient(ellipse at 100% 0%, #b8f77708, transparent 70%),
      #111a23;
  }
  
  .dashboard-path-card:hover,
  .dashboard-path-card:focus-within {
    border-color: #53684a;
    box-shadow: 0 8px 28px #0000001c;
  }
  
  .dashboard-path-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 25px 25px 20px;
  }
  
  .dashboard-path-icon {
    display: grid;
    place-items: center;
    width: 45px;
    height: 45px;
    border: 1px solid #3a4c3c;
    border-radius: 12px;
    color: #c6e4b0;
    background: #1b2b22;
  }
  
  .dashboard-state {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 5px 9px;
    border: 1px solid #34404b;
    border-radius: 6px;
    color: #b0bec8;
    font-size: 10px;
    font-weight: 600;
  }
  
  .dashboard-state.is-complete {
    border-color: #3b543b;
    color: #c0e3ae;
    background: #1b2a20;
  }
  
  .dashboard-path-body {
    padding: 0 25px;
  }
  
  .dashboard-path-body h3 {
    margin: 8px 0;
    overflow-wrap: anywhere;
    font-size: 23px;
    letter-spacing: -.6px;
  }
  
  .dashboard-path-body > p {
    margin: 0;
    font-size: 12px;
  }
  
  .dashboard-path-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 9px;
    margin-top: 19px;
  }
  
  .dashboard-path-tags > span {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 8px;
    border: 1px solid #2b3844;
    border-radius: 5px;
    color: #b3c1cb;
    background: #0e1720;
    font-size: 10px;
  }
  
  .dashboard-path-progress {
    margin-top: auto;
    padding: 25px;
  }
  
  .dashboard-path-progress > div {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 8px;
    font-size: 11px;
  }
  
  .dashboard-path-progress > div > span {
    color: var(--muted);
  }
  
  .dashboard-path-progress strong {
    color: var(--green);
    font-variant-numeric: tabular-nums;
  }
  
  .dashboard-path-progress strong > span {
    color: #a9bac6;
    font-weight: 500;
  }
  
  .dashboard-path-progress progress {
    display: block;
    height: 5px;
    margin: 13px 0 10px;
    background: #26332c;
  }
  
  .dashboard-path-progress p {
    margin: 0;
    font-size: 10px;
  }
  
  .dashboard-path-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 16px 25px;
    border-top: 1px solid #2a3741;
    background: #0c141a75;
  }
  
  .dashboard-path-footer > span {
    color: #91a390;
    font-size: 10px;
  }
  
  .dashboard-footnote {
    margin: 13px 0 0;
    color: #8d9eab;
    font-size: 11px;
  }
  
  .dashboard-bottom-grid {
    display: grid;
    grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr);
    gap: 24px;
    margin-top: 34px;
  }
  
  .dashboard-certificate-list {
    display: grid;
    gap: 13px;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  
  .dashboard-certificate {
    padding: 19px;
    border: 1px solid #3a3949;
    border-radius: 12px;
    background: linear-gradient(120deg, #2722394d, transparent), #101820;
  }
  
  .dashboard-certificate-heading {
    display: flex;
    align-items: center;
    gap: 14px;
  }
  
  .dashboard-certificate-heading > div {
    min-width: 0;
  }
  
  .dashboard-certificate-seal {
    display: inline-grid;
    place-items: center;
    flex-shrink: 0;
    width: 48px;
    height: 48px;
    border: 1px solid #4b425e;
    border-radius: 50%;
    background: #292438;
    color: #d0c0f5;
  }
  
  .dashboard-certificate h3 {
    margin: 0 0 4px;
    overflow-wrap: anywhere;
    font-size: 15px;
  }
  
  .dashboard-certificate p {
    margin: 0;
    font-size: 11px;
  }
  
  .dashboard-certificate-actions {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 9px;
    margin-top: 17px;
  }
  
  .dashboard-certificate-actions .secondary-button {
    min-height: 34px;
    padding: 7px 12px;
    font-size: 11px;
  }
  
  .dashboard-certificate-actions .dashboard-footnote {
    margin: 0;
  }
  
  .dashboard-certificate-empty {
    padding: 17px 8px 8px;
    text-align: center;
  }
  
  .dashboard-certificate-empty h3 {
    margin: 17px 0 8px;
    font-size: 16px;
  }
  
  .dashboard-certificate-empty p {
    max-width: 340px;
    margin: 0 auto 18px;
    font-size: 12px;
  }
  
  .dashboard-practice-links {
    display: grid;
    gap: 12px;
  }
  
  .dashboard-practice-link {
    display: flex;
    align-items: center;
    gap: 13px;
    padding: 16px;
    border: 1px solid #2b3944;
    border-radius: 11px;
    background: #0d161e;
  }
  
  .dashboard-practice-link:hover {
    border-color: #59704d;
    background: #141f23;
  }
  
  .dashboard-practice-icon {
    display: grid;
    place-items: center;
    width: 39px;
    height: 39px;
    flex-shrink: 0;
    border-radius: 10px;
    color: #b7dba4;
    background: #213025;
  }
  
  .dashboard-practice-icon.purple {
    color: #cfc1f2;
    background: #2a253b;
  }
  
  .dashboard-practice-link > span:nth-child(2) {
    flex: 1;
    min-width: 0;
  }
  
  .dashboard-practice-link strong {
    display: block;
    font-size: 12px;
  }
  
  .dashboard-practice-link small {
    display: block;
    margin-top: 4px;
    color: var(--muted);
    font-size: 10px;
  }
  
  .dashboard-practice-link > svg {
    color: #9caf98;
  }
  
  .dashboard-learning-note {
    display: flex;
    gap: 10px;
    margin-top: 24px;
    padding-top: 20px;
    border-top: 1px solid var(--workspace-line);
    color: #82977e;
  }
  
  .dashboard-learning-note p {
    margin: 0;
    font-size: 11px;
  }
  
  .dashboard-empty {
    padding: 36px;
    border: 1px dashed #35473e;
    border-radius: 14px;
    background: #13201970;
    text-align: center;
  }
  
  .dashboard-empty > svg {
    color: var(--green);
  }
  
  .dashboard-empty h3 {
    margin: 14px 0 8px;
    font-size: 18px;
  }
  
  .dashboard-empty p {
    margin: 0;
    font-size: 13px;
  }
  
  /* Minimal lesson integration for the global topbar and local revision.
     Batch 2 will replace this chapter strip with the dedicated inner sidebar. */
  .learning-workspace {
    max-width: 1240px;
    margin-inline: auto;
  }
  
  .learning-workspace .hero {
    padding-block: 36px;
  }
  
  .learning-workspace .mission-card {
    top: 105px;
  }
  
  .learning-chapter-strip {
    margin-top: 24px;
    padding: 18px;
    border: 1px solid var(--workspace-line);
    border-radius: 12px;
    background: #101922;
  }
  
  .learning-chapter-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 10px;
    margin-bottom: 12px;
  }
  
  .learning-chapter-heading > span:last-child {
    color: var(--muted);
    font-size: 11px;
  }
  
  .learning-chapter-list {
    display: flex;
    flex-wrap: wrap;
    gap: 9px;
  }
  
  .learning-chapter-button {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    max-width: 100%;
    padding: 9px 12px;
    border: 1px solid #2d3a45;
    border-radius: 8px;
    background: #0c141c;
    color: #b7c5ce;
    text-align: left;
    font-size: 12px;
  }
  
  .learning-chapter-button:hover,
  .learning-chapter-button.is-active {
    border-color: #536b45;
    background: #1a281f;
    color: #d2e9c2;
  }
  
  .learning-chapter-number {
    display: inline-grid;
    place-items: center;
    width: 22px;
    height: 22px;
    flex-shrink: 0;
    border: 1px solid #364535;
    border-radius: 5px;
    color: var(--green);
    font-size: 10px;
  }
  
  .revision-banner {
    display: flex;
    align-items: center;
    gap: 15px;
    margin-top: 24px;
    padding: 18px 20px;
    border: 1px solid #4a405f;
    border-radius: 12px;
    background: linear-gradient(110deg, #252037, #151b25);
    color: #d4c7f4;
  }
  
  .revision-banner > div {
    flex: 1;
    min-width: 0;
  }
  
  .revision-banner strong {
    font-size: 13px;
  }
  
  .revision-banner p {
    margin: 4px 0 0;
    color: #b9b2c9;
    font-size: 12px;
  }
  
  .revision-banner .secondary-button {
    flex-shrink: 0;
  }
  
  .learning-import {
    padding: 18px 0 0;
  }
  
  .learning-import p {
    margin-block: 12px;
    font-size: 12px;
  }
  
  /* Responsive layout */
  @media (min-width: 1050px) {
    .dashboard-path-grid > li:only-child .dashboard-path-card {
      display: grid;
      grid-template-columns: minmax(0, 1.2fr) minmax(280px, 1fr);
    }
    .dashboard-path-grid > li:only-child .dashboard-path-top {
      grid-column: 1 / -1;
      padding-bottom: 15px;
    }
    .dashboard-path-grid > li:only-child .dashboard-path-body {
      padding-bottom: 25px;
    }
    .dashboard-path-grid > li:only-child .dashboard-path-progress {
      align-self: center;
      margin: 0;
      border-left: 1px solid #2a3741;
    }
    .dashboard-path-grid > li:only-child .dashboard-path-footer {
      grid-column: 1 / -1;
    }
  }
  
  @media (max-width: 1100px) {
    .workspace-header-inner {
      gap: 20px;
      padding-inline: 28px;
    }
    .workspace-nav-link {
      padding-inline: 11px;
    }
    .workspace-main {
      padding-inline: 28px;
    }
    .workspace-footer {
      width: calc(100% - 56px);
    }
    .dashboard-stat {
      padding: 21px;
    }
    .dashboard-feature-grid {
      grid-template-columns: minmax(0, 1.35fr) minmax(270px, 1fr);
    }
    .dashboard-next {
      padding: 25px;
    }
    .dashboard-next-icon {
      display: none;
    }
    .dashboard-account-note {
      display: none;
    }
  }
  
  @media (max-width: 850px) {
    .workspace-header-inner {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 0 20px;
      padding-top: 14px;
    }
    .workspace-brand {
      grid-column: 1;
      grid-row: 1;
    }
    .workspace-profile {
      grid-column: 2;
      grid-row: 1;
    }
    .workspace-navigation {
      grid-column: 1 / -1;
      grid-row: 2;
      justify-content: center;
      width: 100%;
      min-width: 0;
      margin-top: 10px;
    }
    .workspace-nav-link {
      min-height: 49px;
    }
    .dashboard-stats {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .dashboard-stat:nth-child(3) {
      border-left: 0;
    }
    .dashboard-stat:nth-child(n + 3) {
      border-top: 1px solid var(--workspace-line);
    }
    .dashboard-feature-grid,
    .dashboard-bottom-grid {
      grid-template-columns: minmax(0, 1fr);
    }
    .dashboard-next-icon {
      display: grid;
    }
    .learning-workspace .mission-card {
      position: static;
    }
  }
  
  @media (max-width: 560px) {
    .workspace-header-inner {
      padding-inline: 16px;
    }
    .workspace-brand {
      font-size: 19px;
    }
    .workspace-brand-mark {
      width: 33px;
      height: 33px;
    }
    .workspace-navigation {
      justify-content: space-between;
      gap: 0;
    }
    .workspace-nav-link {
      padding-inline: 7px;
      font-size: 11px;
    }
    .workspace-nav-link::after {
      right: 7px;
      left: 7px;
    }
    .workspace-profile {
      gap: 6px;
      font-size: 11px;
    }
    .workspace-main {
      padding: 0 16px 40px;
    }
    .workspace-footer {
      flex-direction: column;
      gap: 5px;
      width: calc(100% - 32px);
      padding-block: 18px;
    }
    .dashboard-page {
      padding-top: 28px;
    }
    .dashboard-heading {
      margin-bottom: 23px;
    }
    .dashboard-heading p {
      font-size: 13px;
    }
    .dashboard-stat {
      padding: 18px 15px;
    }
    .dashboard-stat dt {
      gap: 7px;
      font-size: 10px;
    }
    .dashboard-stat dt svg {
      width: 14px;
      height: 14px;
    }
    .dashboard-stat dd {
      font-size: 29px;
    }
    .dashboard-stat p {
      font-size: 10px;
    }
    .dashboard-next,
    .dashboard-panel {
      padding: 21px;
    }
    .dashboard-next {
      gap: 16px;
    }
    .dashboard-next-content {
      flex-basis: 100%;
    }
    .dashboard-next-content h2 {
      font-size: 24px;
    }
    .dashboard-section {
      margin-top: 32px;
    }
    .dashboard-section-heading {
      align-items: flex-start;
      flex-wrap: wrap;
      gap: 14px;
    }
    .dashboard-section-heading h2 {
      font-size: 21px;
    }
    .dashboard-section-heading.compact {
      flex-wrap: nowrap;
    }
    .dashboard-path-top {
      padding: 21px 20px 17px;
    }
    .dashboard-path-body {
      padding-inline: 20px;
    }
    .dashboard-path-progress {
      padding: 23px 20px;
    }
    .dashboard-path-footer {
      padding-inline: 20px;
    }
    .dashboard-bottom-grid {
      margin-top: 25px;
    }
    .dashboard-certificate {
      padding: 15px;
    }
    .revision-banner {
      align-items: flex-start;
      flex-wrap: wrap;
    }
    .revision-banner > div {
      flex-basis: calc(100% - 40px);
    }
    .learning-chapter-button {
      width: 100%;
    }
  }
  
  @media (prefers-reduced-motion: no-preference) {
    .workspace-nav-link,
    .workspace-profile,
    .dashboard-path-card,
    .dashboard-practice-link,
    .dashboard-text-link {
      transition: color .18s ease, background-color .18s ease, border-color .18s ease, box-shadow .18s ease;
    }
    .workspace-nav-link::after {
      transition: transform .2s ease;
    }
  }

--- END FILE: src/app/workspace.css ---

--- BEGIN FILE: src/app/batch-two.css ---
/* Batch 2: learning path catalog, inner lesson navigation, and lab polish.
   Existing dashboard, homework, and CTF layouts remain unchanged. */

/* Learning paths */
.paths-page {
  padding-top: 42px;
}

.paths-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 28px;
  margin-bottom: 30px;
}
.paths-heading h1 {
  margin: 10px 0 14px;
}
.paths-heading p {
  max-width: 660px;
  margin: 0;
  font-size: 14px;
}
.paths-heading-icon {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 82px;
  height: 82px;
  border: 1px solid #41563c;
  border-radius: 23px;
  color: var(--green);
  background: radial-gradient(circle at 20% 0%, #b8f77715, transparent 75%), #17251e;
  box-shadow: inset 0 1px 0 #ffffff0a;
}

.paths-summary {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  margin: 0;
  overflow: hidden;
  border: 1px solid var(--workspace-line, #25323d);
  border-radius: 15px;
  background: linear-gradient(120deg, #15201d80, #111922);
}
.paths-summary > div {
  min-width: 0;
  padding: 23px 26px;
}
.paths-summary > div + div {
  border-left: 1px solid var(--workspace-line, #25323d);
}
.paths-summary dt {
  display: flex;
  align-items: center;
  gap: 9px;
  color: #b3c0ca;
  font-size: 12px;
}
.paths-summary dt svg {
  color: #91a88c;
}
.paths-summary dd {
  margin: 12px 0 0;
  font-size: 29px;
  font-weight: 750;
  letter-spacing: -0.8px;
  line-height: 1.2;
  font-variant-numeric: tabular-nums;
}
.paths-summary dd > span {
  color: #8c9da9;
  font-size: 17px;
  font-weight: 500;
}
.paths-summary-note {
  margin: 12px 0 0;
  font-size: 11px;
}

.paths-category {
  margin-top: 40px;
}
.paths-category-count {
  padding: 5px 10px;
  border: 1px solid #2c3a45;
  border-radius: 7px;
  color: var(--muted);
  background: #111a23;
  font-size: 11px;
}
.paths-catalog {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 360px), 1fr));
  gap: 22px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.paths-catalog > li {
  min-width: 0;
}

.paths-course-card {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-width: 0;
  overflow: hidden;
  border: 1px solid #2b3943;
  border-radius: 17px;
  background: radial-gradient(ellipse at 100% 0%, #b8f77709, transparent 65%),
    linear-gradient(145deg, #121d25, #101820);
  box-shadow: inset 0 1px 0 #ffffff04;
}
.paths-course-card:hover,
.paths-course-card:focus-within {
  border-color: #53684a;
  box-shadow: 0 10px 30px #00000020;
}
.paths-course-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 16px;
  padding: 26px 26px 20px;
}
.paths-course-body {
  padding-inline: 26px;
}
.paths-course-body h3 {
  margin: 9px 0 11px;
  font-size: 25px;
  letter-spacing: -0.7px;
  overflow-wrap: anywhere;
}
.paths-course-body h3 a:hover {
  color: var(--green);
}
.paths-course-body > p {
  margin: 0;
  font-size: 13px;
}
.paths-course-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 20px;
}
.paths-course-tags > span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border: 1px solid #2c3944;
  border-radius: 5px;
  background: #0e1720;
  color: #b9c6cf;
  font-size: 10px;
}
.paths-course-body > .paths-time-note {
  margin-top: 10px;
  color: #91a2ae;
  font-size: 10px;
}

.paths-points-breakdown {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin: 23px 0 0;
  padding: 18px 0;
  border-top: 1px solid #293741;
  border-bottom: 1px solid #293741;
}
.paths-points-breakdown > div {
  min-width: 0;
}
.paths-points-breakdown dt {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  color: #aebfc8;
  font-size: 11px;
}
.paths-points-breakdown > div:nth-child(1) dt svg {
  color: var(--green);
}
.paths-points-breakdown > div:nth-child(2) dt svg {
  color: #86d9dc;
}
.paths-points-breakdown > div:nth-child(3) dt svg {
  color: var(--purple);
}
.paths-points-breakdown dd {
  margin: 7px 0 0;
  font-size: 16px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.paths-points-breakdown dd span {
  color: #93a6b3;
  font-size: 12px;
  font-weight: 500;
}

.paths-course-progress {
  margin-top: auto;
  padding: 23px 26px 26px;
}
.paths-course-progress > div {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 10px;
  font-size: 12px;
}
.paths-course-progress > div > span {
  color: var(--muted);
}
.paths-course-progress strong {
  color: var(--green);
  font-variant-numeric: tabular-nums;
}
.paths-course-progress strong > span {
  color: #b2c2cd;
  font-weight: 500;
}
.paths-course-progress progress {
  display: block;
  height: 6px;
  margin: 13px 0 11px;
}
.paths-course-progress p {
  margin: 0;
  font-size: 10px;
  line-height: 1.8;
}

.paths-course-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 14px;
  padding: 17px 26px;
  border-top: 1px solid #2a3741;
  background: #0a121a80;
}

.paths-page > .dashboard-empty {
  margin-top: 32px;
}
.paths-page .dashboard-empty h2 {
  margin: 14px 0 10px;
  font-size: 21px;
}


/* Inner learning workspace */
.lesson-workspace {
  display: grid;
  grid-template-columns: 282px minmax(0, 1fr);
  align-items: start;
  gap: 36px;
  padding-top: 28px;
}

.lesson-index {
  position: sticky;
  top: 106px;
  display: flex;
  flex-direction: column;
  min-width: 0;
  max-height: calc(100svh - 130px);
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: #384b3d transparent;
  border: 1px solid #2a3842;
  border-radius: 16px;
  background: linear-gradient(160deg, #142019, #101922 44%);
}
.lesson-index-back {
  display: flex;
  align-items: center;
  gap: 9px;
  flex-shrink: 0;
  padding: 19px 20px;
  border-bottom: 1px solid #2a3842;
  color: #c2d5ba;
  font-size: 11px;
  font-weight: 650;
}
.lesson-index-back:hover {
  color: var(--green);
  background: #b8f77705;
}

.lesson-index-heading {
  padding: 23px 20px 18px;
}
.lesson-index-heading h2 {
  margin: 8px 0 10px;
  font-size: 20px;
  letter-spacing: -0.5px;
  overflow-wrap: anywhere;
}
.lesson-index-heading p {
  margin: 0;
  font-size: 11px;
}
.lesson-index-heading progress {
  display: block;
  height: 5px;
  margin: 13px 0 0;
}

.lesson-index-navigation {
  padding: 0 11px 15px;
}
.lesson-index-list {
  display: grid;
  gap: 7px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.lesson-index-item {
  position: relative;
  min-width: 0;
}
.lesson-index-button {
  display: flex;
  align-items: flex-start;
  gap: 11px;
  width: 100%;
  min-width: 0;
  padding: 13px 11px;
  border: 1px solid transparent;
  border-radius: 10px;
  color: #b7c5cf;
  background: #0d161e80;
  text-align: left;
}
.lesson-index-button:hover:not(:disabled) {
  border-color: #3b4d45;
  background: #18231f;
}
.lesson-index-button:focus-visible {
  outline-offset: 2px;
}

.lesson-index-number {
  display: inline-grid;
  place-items: center;
  width: 29px;
  height: 29px;
  flex-shrink: 0;
  margin-top: 1px;
  border: 1px solid #35424d;
  border-radius: 8px;
  background: #121d26;
  color: #a8bdcb;
  font-size: 10px;
  font-weight: 700;
}
.lesson-index-copy {
  flex: 1;
  min-width: 0;
}
.lesson-index-copy > strong {
  display: block;
  margin-top: 1px;
  font-size: 12px;
  font-weight: 650;
  line-height: 1.55;
  overflow-wrap: anywhere;
}
.lesson-index-copy > span {
  display: block;
  margin-top: 5px;
  color: #93a5b1;
  font-size: 10px;
  line-height: 1.6;
}

.lesson-index-item.is-complete .lesson-index-number {
  border-color: #3d6149;
  color: #a5dfb5;
  background: #1a3024;
}
.lesson-index-item.is-complete .lesson-index-copy > strong {
  color: #b3dbc0;
}

.lesson-index-item.has-unfinished-labs .lesson-index-button {
  padding-right: 34px;
}
.lesson-index-item.has-unfinished-labs .lesson-index-number {
  border-color: #6c5e36;
  color: #ecd58f;
  background: #2c281a;
}

.lesson-index-item.is-current .lesson-index-button {
  border-color: #597641;
  background: linear-gradient(110deg, #263721, #19271f);
  box-shadow: inset 3px 0 0 var(--green);
}
.lesson-index-item.is-current .lesson-index-copy > strong {
  color: #e0f4d2;
}
.lesson-index-item.is-current .lesson-index-number {
  border-color: #718b50;
  color: var(--green);
  background: #31442a;
}

.lesson-index-item.is-locked .lesson-index-button {
  opacity: 1;
  color: #84939f;
  background: #0b141b80;
  cursor: not-allowed;
}
.lesson-index-item.is-locked .lesson-index-copy > span {
  color: #7e909e;
}
.lesson-index-item.is-locked .lesson-index-number {
  border-color: #293640;
  color: #7e8d99;
  background: #101922;
}

.lesson-index-warning {
  position: absolute;
  top: 15px;
  right: 9px;
  z-index: 2;
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  cursor: help;
}
.lesson-index-warning:focus-visible {
  outline-color: #ecd58f;
  outline-offset: 1px;
}
.lesson-index-warning-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #f2ca66;
  box-shadow: 0 0 0 4px #f2ca6612;
}
.lesson-index-tooltip {
  position: absolute;
  top: calc(100% + 7px);
  right: 0;
  width: 190px;
  padding: 9px 11px;
  border: 1px solid #665733;
  border-radius: 8px;
  color: #f4e7bd;
  background: #29251a;
  box-shadow: 0 8px 22px #00000050;
  font-size: 11px;
  line-height: 1.6;
  visibility: hidden;
  opacity: 0;
  pointer-events: none;
}
.lesson-index-warning:hover .lesson-index-tooltip,
.lesson-index-warning:focus .lesson-index-tooltip {
  visibility: visible;
  opacity: 1;
  pointer-events: auto;
}

.lesson-index-note {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  margin: 0 20px;
  padding-top: 17px;
  border-top: 1px solid #2a3842;
  color: #a2b497;
}
.lesson-index-note svg {
  margin-top: 3px;
}
.lesson-index-note p,
.lesson-index-points-note {
  margin: 0;
  font-size: 10px;
  line-height: 1.8;
}
.lesson-index-points-note {
  padding: 12px 20px 22px;
  color: #8b9eac;
}

.lesson-stage {
  min-width: 0;
}
.lesson-breadcrumb-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  min-height: 48px;
  padding-bottom: 18px;
  border-bottom: 1px solid #27353f;
}
.lesson-breadcrumb-bar .breadcrumb {
  min-width: 0;
  font-size: 11px;
}
.lesson-breadcrumb-bar .breadcrumb span {
  overflow-wrap: anywhere;
}
.lesson-breadcrumb-bar .breadcrumb a:hover {
  color: var(--green);
}

.lesson-stage .revision-banner {
  margin-top: 22px;
}

.lesson-hero {
  padding: 32px 0 28px;
}
.lesson-hero h1 {
  margin: 12px 0 16px;
  overflow-wrap: anywhere;
  scroll-margin-top: 110px;
}
.lesson-hero > p {
  max-width: 730px;
  margin: 0 0 21px;
  font-size: 14px;
  line-height: 1.85;
}
.lesson-hero-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px 18px;
  color: #b6c7b2;
  font-size: 11px;
}
.lesson-hero-meta > span {
  display: inline-flex;
  align-items: center;
  gap: 7px;
}
.lesson-hero-meta svg {
  color: #8ca77e;
}

.lesson-plan {
  margin-bottom: 28px;
  padding: 21px 24px;
  border: 1px solid #3b394c;
  border-radius: 14px;
  background: radial-gradient(ellipse at 0% 0%, #c4b5fd0a, transparent 65%), #131b25;
}
.lesson-plan-heading {
  display: flex;
  align-items: center;
  gap: 13px;
}
.lesson-plan-icon {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  border: 1px solid #4c435e;
  border-radius: 11px;
  background: #2a2439;
  color: var(--purple);
}
.lesson-plan .dashboard-kicker {
  color: #b5a8d0;
  font-size: 9px;
}
.lesson-plan h2 {
  margin: 4px 0 0;
  font-size: 17px;
  letter-spacing: -0.3px;
}
.lesson-plan ol {
  display: grid;
  gap: 8px;
  margin: 18px 0 0;
  padding-left: 20px;
}
.lesson-plan li {
  padding-left: 5px;
  color: #bfc6d4;
  font-size: 12px;
}
.lesson-plan li::marker {
  color: var(--purple);
  font-weight: 700;
}

.lesson-reading-content {
  gap: 26px;
}
.lesson-reading-content > * {
  min-width: 0;
}
.lesson-reading-content .note h2 {
  font-size: 23px;
}
.lesson-reading-content .note p {
  line-height: 1.9;
}
.lesson-reading-content .tip > div {
  min-width: 0;
}

.lesson-reading-completion {
  border-color: #3c513b;
  background: linear-gradient(115deg, #1a291e, #121d21);
}
.lesson-reading-completion h2 {
  margin: 0 0 6px;
  font-size: 17px;
  letter-spacing: -0.3px;
}
.lesson-save-notice {
  margin: -10px 0 0;
  color: var(--green);
  font-size: 12px;
}
.lesson-save-notice:empty {
  display: none;
}

.lesson-progress-import {
  margin: 0;
  padding-top: 17px;
}
.lesson-progress-import > summary {
  color: #a8bb9f;
}

.lesson-bottom-navigation {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 24px;
  margin-top: 5px;
  padding: 26px;
  border: 1px solid #415637;
  border-radius: 16px;
  background: radial-gradient(ellipse at 100% 0%, #b8f7770d, transparent 65%),
    linear-gradient(120deg, #17251b, #111b21);
  box-shadow: inset 0 1px 0 #d5ffc009;
}
.lesson-bottom-copy {
  flex: 1 1 260px;
  min-width: 0;
}
.lesson-bottom-copy h2 {
  margin: 8px 0;
  font-size: 21px;
  letter-spacing: -0.5px;
  overflow-wrap: anywhere;
}
.lesson-bottom-copy p {
  max-width: 530px;
  margin: 0;
  font-size: 12px;
  line-height: 1.8;
}
.lesson-bottom-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}
.lesson-bottom-actions .primary-button {
  padding-inline: 18px;
}

.lesson-empty {
  margin-top: 32px;
}
.lesson-empty .primary-button {
  margin-top: 20px;
}

/* Lab completion and submission */
.lesson-lab-card {
  border-color: #304534;
  box-shadow: inset 0 1px 0 #ffffff04;
}
.lesson-lab-complete {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 16px;
  padding: 20px;
  border-color: #3b5940;
  background: linear-gradient(110deg, #192d20, #121e1b);
}
.lesson-lab-complete-heading {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}
.lesson-lab-complete-heading > div {
  min-width: 0;
}
.lesson-lab-complete-icon {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  flex-shrink: 0;
  border: 1px solid #4b6b43;
  border-radius: 11px;
  color: var(--green);
  background: #253c26;
}
.lesson-lab-complete strong {
  color: #c6edb5;
  font-size: 14px;
}
.lesson-lab-complete p {
  margin: 4px 0 0;
  color: #a5bba2;
  font-size: 11px;
  overflow-wrap: anywhere;
}

.lesson-lab-form {
  display: grid;
  gap: 9px;
  margin: 24px 0;
}
.lesson-lab-form > label {
  color: #c7d6cb;
  font-size: 11px;
  font-weight: 650;
}
.lesson-lab-form-row {
  display: flex;
  align-items: stretch;
  flex-wrap: wrap;
  gap: 10px;
}
.lesson-lab-form input {
  flex: 1 1 200px;
  width: 100%;
  min-width: 0;
  padding: 11px 13px;
  border: 1px solid #35473a;
  border-radius: 9px;
  color: var(--text);
  background: #0a1212;
  font: inherit;
  font-size: 12px;
}
.lesson-lab-form input::placeholder {
  color: #8c9e92;
}
.lesson-lab-form input[aria-invalid="true"] {
  border-color: #e98181;
}
.lesson-lab-form input:disabled {
  opacity: 0.65;
}
.lesson-lab-form .lesson-lab-error {
  margin: 0;
  color: #ff9c9c;
  font-size: 12px;
}
.lab-instructions .lesson-lab-reattempt-note {
  padding: 10px 12px;
  border-left: 2px solid #8ca879;
  color: #bdcdb5;
  background: #172119;
  font-size: 11px;
}

/* Premium native disclosure: keyboard support is retained. */
.lesson-hint {
  padding: 0;
  overflow: hidden;
  border: 1px solid #443e55;
  border-radius: 12px;
  background: linear-gradient(115deg, #242033, #161d26);
}
.lesson-hint > summary {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 15px 17px;
  color: #d8cef0;
  list-style: none;
}
.lesson-hint > summary::-webkit-details-marker {
  display: none;
}
.lesson-hint > summary::marker {
  content: "";
}
.lesson-hint > summary:hover {
  background: #c4b5fd06;
}
.lesson-hint > summary:focus-visible {
  outline-offset: -4px;
  border-radius: 10px;
}
.lesson-hint-icon {
  display: grid;
  place-items: center;
  width: 33px;
  height: 33px;
  flex-shrink: 0;
  border: 1px solid #514665;
  border-radius: 9px;
  color: #d5c5ff;
  background: #30283f;
}
.lesson-hint-copy {
  flex: 1;
  min-width: 0;
}
.lesson-hint-copy > strong {
  display: block;
  font-size: 12px;
  font-weight: 650;
}
.lesson-hint-copy > span {
  display: block;
  margin-top: 2px;
  color: #aaa3bc;
  font-size: 10px;
  line-height: 1.6;
}
.lesson-hint-chevron {
  color: #b4a3d1;
}
.lesson-hint[open] .lesson-hint-chevron {
  transform: rotate(180deg);
}
.lesson-hint-body {
  padding: 16px 18px;
  border-top: 1px solid #443e55;
  background: #100f1960;
}
.lab-instructions .lesson-hint-body p {
  margin: 0;
  color: #c6bdd8;
  font-size: 12px;
  line-height: 1.85;
  white-space: pre-line;
}

/* Lab terminal */
.live-lab .lab-terminal-heading {
  align-items: center;
  gap: 16px;
  padding: 17px 20px;
  border-bottom: 1px solid #304534;
  background: linear-gradient(110deg, #19291d, #142018);
}
.lab-terminal-title-group {
  display: flex;
  align-items: center;
  gap: 11px;
  flex: 1 1 220px;
  min-width: 0;
}
.lab-terminal-title-group > div {
  min-width: 0;
}
.lab-terminal-icon {
  display: grid;
  place-items: center;
  width: 37px;
  height: 37px;
  flex-shrink: 0;
  border: 1px solid #405d3d;
  border-radius: 10px;
  color: var(--green);
  background: #243724;
}
.lab-terminal-kicker {
  display: block;
  color: #94b28b;
  font-size: 9px;
  font-weight: 750;
  letter-spacing: 1.2px;
}
.lab-terminal-title {
  display: block;
  margin-top: 3px;
  color: #e0ecdd;
  font-size: 13px;
  font-weight: 650;
  line-height: 1.5;
  overflow-wrap: anywhere;
}

.lab-terminal-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}
.lab-terminal-points {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 9px;
  border: 1px solid #4c6138;
  border-radius: 6px;
  color: #d0edac;
  background: #b8f77709;
  font-size: 10px;
  font-weight: 650;
  white-space: nowrap;
}
.lab-terminal-points-description {
  font-weight: 500;
}

/* Prevent an outer scrollbar while preserving xterm's internal scrollback. */
.live-lab .terminal-window,
.live-lab .terminal-screen {
  min-width: 0;
  overflow: hidden;
}
.live-lab .terminal-screen .xterm {
  max-width: 100%;
  overflow: hidden;
}
.live-lab .terminal-screen .xterm-viewport {
  overflow-x: hidden !important;
}

.live-lab .lab-terminal-overlay {
  z-index: 10;
  color: #b9b0ce;
  background: #090f13;
  pointer-events: none;
}
.live-lab .lab-terminal-status {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  color: #acbdae;
  font-size: 11px;
}
.lab-terminal-status > span {
  width: 6px;
  height: 6px;
  flex-shrink: 0;
  margin-top: 6px;
  border-radius: 50%;
  background: #829183;
}
.lab-terminal-status.is-connected > span {
  background: var(--green);
  box-shadow: 0 0 9px #b8f77730;
}

/* Responsive */
@media (min-width: 1200px) {
  .paths-catalog > li:only-child .paths-course-card {
    display: grid;
    grid-template-columns: minmax(0, 1.3fr) minmax(290px, 1fr);
  }
  .paths-catalog > li:only-child .paths-course-top {
    grid-column: 1 / -1;
  }
  .paths-catalog > li:only-child .paths-course-body {
    padding-bottom: 25px;
  }
  .paths-catalog > li:only-child .paths-course-progress {
    align-self: center;
    margin-top: 0;
    border-left: 1px solid #293741;
  }
  .paths-catalog > li:only-child .paths-course-footer {
    grid-column: 1 / -1;
  }
}

@media (max-width: 1100px) {
  .lesson-workspace {
    grid-template-columns: 250px minmax(0, 1fr);
    gap: 25px;
  }
  .lesson-index-heading {
    padding-inline: 17px;
  }
  .lesson-index-back {
    padding-inline: 17px;
    font-size: 10px;
  }
  .lesson-index-note {
    margin-inline: 17px;
  }
  .lesson-index-points-note {
    padding-inline: 17px;
  }
  .lesson-bottom-navigation {
    padding: 23px;
  }
  .lab-terminal-points-description {
    display: none;
  }
}

@media (max-width: 1000px) {
  .lesson-workspace {
    grid-template-columns: minmax(0, 1fr);
    gap: 26px;
  }
  .lesson-index {
    position: static;
    max-height: none;
  }
  .lesson-index-heading {
    padding: 20px;
  }
  .lesson-index-navigation {
    padding-inline: 14px;
  }
  .lesson-index-list {
    max-height: 330px;
    padding: 3px 4px 45px;
    overflow-y: auto;
    scrollbar-width: thin;
    scrollbar-color: #384b3d transparent;
  }
  .lesson-index-note {
    margin-inline: 20px;
  }
  .lesson-index-points-note {
    padding-inline: 20px;
  }
  .lesson-index-back {
    padding-inline: 20px;
    font-size: 11px;
  }
  .lesson-hero {
    padding-top: 27px;
  }
}

@media (max-width: 850px) {
  .lesson-hero h1 {
    scroll-margin-top: 145px;
  }
  .paths-summary > div {
    padding: 20px;
  }
  .paths-summary dt {
    font-size: 11px;
  }
}

@media (max-width: 600px) {
  .paths-page {
    padding-top: 28px;
  }
  .paths-heading {
    margin-bottom: 24px;
  }
  .paths-heading p {
    font-size: 13px;
  }
  .paths-heading-icon {
    display: none;
  }
  .paths-summary {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .paths-summary > div {
    padding: 19px 17px;
  }
  .paths-summary > div:last-child {
    grid-column: 1 / -1;
    border-top: 1px solid var(--workspace-line, #25323d);
    border-left: 0;
  }
  .paths-summary dd {
    font-size: 26px;
  }
  .paths-category {
    margin-top: 30px;
  }

  .paths-course-top {
    padding: 21px 20px 18px;
  }
  .paths-course-body {
    padding-inline: 20px;
  }
  .paths-course-body h3 {
    font-size: 23px;
  }
  .paths-course-progress {
    padding: 22px 20px;
  }
  .paths-course-footer {
    padding: 16px 20px;
  }
  .paths-points-breakdown {
    gap: 8px;
  }
  .paths-points-breakdown dt {
    font-size: 10px;
  }

  .lesson-workspace {
    padding-top: 20px;
    gap: 22px;
  }
  .lesson-breadcrumb-bar .pill {
    display: none;
  }
  .lesson-hero > p {
    font-size: 13px;
  }
  .lesson-hero-meta {
    gap: 10px 14px;
    font-size: 10px;
  }
  .lesson-plan {
    padding: 19px;
  }
  .lesson-reading-content {
    gap: 23px;
  }
  .lesson-reading-content .note h2 {
    font-size: 21px;
  }
  .lesson-reading-content .note p {
    font-size: 14px;
  }
  .lesson-reading-completion {
    padding: 20px;
  }
  .lesson-bottom-navigation {
    padding: 21px;
  }
  .lesson-bottom-copy {
    flex-basis: 100%;
  }
  .lesson-bottom-actions {
    width: 100%;
  }
  .lesson-bottom-actions > .primary-button {
    flex: 1;
  }
  .lesson-lab-form-row {
    flex-direction: column;
  }
  .lesson-lab-form input {
    flex-basis: auto;
  }
  .lesson-lab-form-row .primary-button {
    align-self: flex-start;
  }
  .lesson-hint > summary {
    gap: 10px;
    padding: 14px;
  }
  .lesson-hint-copy > span {
    font-size: 10px;
  }
  .live-lab .lab-terminal-heading {
    padding: 16px;
  }
  .lab-terminal-actions {
    justify-content: space-between;
    width: 100%;
  }
  .lab-terminal-points-description {
    display: inline;
  }
}

@media (prefers-reduced-motion: no-preference) {
  .paths-course-card,
  .lesson-index-button,
  .lesson-index-back,
  .lesson-hint > summary {
    transition: color 0.18s ease, background-color 0.18s ease,
      border-color 0.18s ease, box-shadow 0.18s ease;
  }
  .lesson-hint-chevron {
    transition: transform 0.18s ease;
  }
  .lesson-index-tooltip {
    transition: opacity 0.15s ease;
  }
}

--- END FILE: src/app/batch-two.css ---

--- BEGIN FILE: src/components/WorkspaceShell.tsx ---
import type { ReactNode } from "react";
import Link from "next/link";
import { Box, UserRound } from "lucide-react";

const navigation = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/paths", label: "Learning Paths" },
  { href: "/homework", label: "Homework" },
  { href: "/ctf", label: "CTF" },
] as const;

type WorkspaceRoute = (typeof navigation)[number]["href"];

export default function WorkspaceShell({
  current,
  children,
}: {
  current: WorkspaceRoute;
  children: ReactNode;
}) {
  return (
    <div className="workspace-frame">
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>

      <header className="workspace-header">
        <div className="workspace-header-inner">
          <Link
            href="/dashboard"
            className="workspace-brand"
            aria-label="Cyber Box home"
          >
            <span className="workspace-brand-mark">
              <Box size={21} aria-hidden="true" />
            </span>
            <span>
              Cyber <span className="accent">Box</span>
            </span>
          </Link>

          <nav className="workspace-navigation" aria-label="Main navigation">
            {navigation.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`workspace-nav-link${
                  current === href ? " is-active" : ""
                }`}
                aria-current={current === href ? "page" : undefined}
              >
                {label}
              </Link>
            ))}
          </nav>

          <Link
            href="#"
            className="workspace-profile"
            aria-label="Ronak profile"
          >
            <span className="workspace-profile-icon">
              <UserRound size={17} aria-hidden="true" />
            </span>
            <span>Ronak</span>
          </Link>
        </div>
      </header>

      <main
        id="main-content"
        className="workspace-main"
        tabIndex={-1}
      >
        {children}
      </main>

      <footer className="workspace-footer">
        <span>Cyber Box</span>
        <span>Build understanding. Put it into practice.</span>
      </footer>
    </div>
  );
}

--- END FILE: src/components/WorkspaceShell.tsx ---

```

## PROMPT 2: Data Models and Progress Logic
```text
Great. Now read the data models that define my lessons, paths, progress tracking, and homework catalog. Do NOT write any code yet. Just reply 'Data models absorbed.'

--- BEGIN FILE: src/content/lessons.ts ---
export type HomeworkTestCase = {
  id: string;
  title: string;
} & (
  | {
      // Compare against the uploaded script's stdout.
      expectedOutput: string;
      evaluationCommand?: never;
    }
  | {
      // Run after the uploaded script.
      // Without expectedOutput, exit code 0 means pass.
      evaluationCommand: string;
      expectedOutput?: string;
    }
);

export type HomeworkContentBlock = {
  id: string;
  type: "homework";
  homeworkId: string;
  title: string;
  objective: string;
  totalPoints: number;
  testCases: [HomeworkTestCase, ...HomeworkTestCase[]];
};

export type ContentBlock =
  | {
      id: string;
      type: "note" | "tip";
      title: string;
      body: string;
    }
  | {
      id: string;
      type: "code";
      title: string;
      code: string;
      caption: string;
    }
  | {
      id: string;
      type: "lab";
      labId: string;
      title: string;
      objective: string;
      hint: string;
    }
  | {
      id: string;
      type: "quiz";
      question: string;
      options: string[];
      answer: number;
      explanation: string;
    }
  | HomeworkContentBlock;

export type Lesson = {
  id: string;
  title: string;
  description: string;
  category: string;
  minutes: number;
  xp: number;
  objectives: string[];
  blocks: ContentBlock[];
};

// At least one lesson is required.
export const lessons: [Lesson, ...Lesson[]] = [
  {
    id: "terminal-basics",
    title: "Meet your terminal.",
    description:
      "A blinking cursor is an invitation. Learn to find your bearings, ask questions, and explore with confidence.",
    category: "Linux foundations",
    minutes: 12,
    xp: 100,
    objectives: [
      "Find your current directory",
      "Identify your Linux user",
      "Discover hidden files",
    ],
    blocks: [
      {
        id: "orientation",
        type: "note",
        title: "First, find your bearings",
        body:
          "Think of the terminal as a conversation with your machine. You give it a command; it gives you an answer. Start with three questions: Where am I? Who am I? What is around me?",
      },
      {
        id: "starter-commands",
        type: "code",
        title: "Your first three questions",
        code: "pwd\nwhoami\nls -la",
        caption:
          "pwd shows your current directory. whoami prints your username. ls -la lists directory entries, including hidden ones, with extra details.",
      },
      {
        id: "first-terminal",
        type: "lab",
        labId: "linux-basics",
        title: "Mission 01 · Get your bearings",
        objective:
          "Run the three commands above. Find your username and current directory, then look for an entry whose name begins with a dot.",
        hint:
          "Run one command at a time. In the ls output, entries beginning with a dot are normally hidden. The -a option reveals them.",
      },
      {
        id: "curiosity",
        type: "tip",
        title: "Keep a tiny investigation journal",
        body:
          "Before running a command, predict what it will show. Afterward, write down one thing you noticed. Small observations turn commands into understanding.",
      },
      {
        id: "directory-quiz",
        type: "quiz",
        question: "Which command tells you where you are?",
        options: ["whoami", "pwd", "ls -la"],
        answer: 1,
        explanation:
          "pwd means print working directory. It shows the directory your shell is currently working in.",
      },
      {
        id: "bash-homework",
        type: "homework",
        homeworkId: "bash-files-v1",
        title: "Homework · Prepare an application log",
        objective:
          "Upload a Bash script that prints Ready, creates logs/events.log " +
          "in the working directory, and writes a line containing " +
          "ERROR access denied into that file. Your working directory is /work.",
        totalPoints: 30,
        testCases: [
          {
            id: "ready-output",
            title: "Prints the readiness message",
            expectedOutput: "Ready",
          },
          {
            id: "log-created",
            title: "Creates the application log",
            evaluationCommand: "test -f /work/logs/events.log",
          },
          {
            id: "error-recorded",
            title: "Records the expected error",
            evaluationCommand: "grep '^ERROR' /work/logs/events.log",
            expectedOutput: "ERROR access denied",
          },
        ],
      },
    ],
  },
  {
    id: "investigate-files",
    title: "Follow the breadcrumbs.",
    description:
      "Files tell stories. Create a small log, read the evidence, and find the line that deserves a closer look.",
    category: "Linux foundations",
    minutes: 15,
    xp: 120,
    objectives: [
      "Create a practice directory",
      "Read a text file",
      "Find matching lines with grep",
    ],
    blocks: [
      {
        id: "files-intro",
        type: "note",
        title: "Every investigation starts with a clue",
        body:
          "Logs record events. A useful first step is to read a small sample, then search for something specific. Here, you will create your own harmless practice log.",
      },
      {
        id: "make-evidence",
        type: "code",
        title: "Create your practice evidence",
        code:
          "mkdir -p ~/practice\n" +
          "printf 'INFO started\\nERROR access denied\\nINFO finished\\n' > ~/practice/events.log\n" +
          "cat ~/practice/events.log",
        caption:
          "This creates a directory and writes three sample lines into events.log. Running it again replaces that practice file.",
      },
      {
        id: "log-terminal",
        type: "lab",
        labId: "linux-basics",
        title: "Mission 02 · Find the unusual event",
        objective:
          "Create the sample log using the commands above. Then use grep to display only the line containing ERROR.",
        hint: "Try: grep 'ERROR' ~/practice/events.log",
      },
      {
        id: "evidence-tip",
        type: "tip",
        title: "An error is a clue, not a conclusion",
        body:
          "One error message does not prove an attack happened. Read the surrounding events and ask what else could explain it.",
      },
      {
        id: "grep-quiz",
        type: "quiz",
        question: "Which command searches for matching lines in a file?",
        options: ["mkdir", "pwd", "grep"],
        answer: 2,
        explanation:
          "grep searches text for a pattern and, by default, prints the lines that match.",
      },
    ],
  },
];
--- END FILE: src/content/lessons.ts ---

--- BEGIN FILE: src/content/paths.ts ---
import { lessons } from "@/content/lessons";

export const paths = [...new Set(lessons.map((lesson) => lesson.category))]
  .map((category) => {
    const items = lessons.filter((lesson) => lesson.category === category);
    return {
      id: category,
      title: category,
      difficulty: "Beginner",
      type: items.some((lesson) =>
        lesson.blocks.some((block) => block.type === "lab"),
      )
        ? "Hands-on"
        : "Reading",
      lessonIds: items.map((lesson) => lesson.id),
    };
  });

export function pathHref(id: string) {
  const params = new URLSearchParams({ path: id });
  return `/?${params.toString()}`;
}

export function pathRevisionHref(id: string) {
  const params = new URLSearchParams({
    path: id,
    revise: "1",
  });
  return `/?${params.toString()}`;
}

--- END FILE: src/content/paths.ts ---

--- BEGIN FILE: src/lib/path-progress.ts ---
import { lessons, type Lesson } from "@/content/lessons";
import type { Progress } from "@/lib/progress-types";

// Matches the current completeLab Server Action.
// No scoring changes are introduced in Batch 1.
const LAB_XP = 50;

type PathLike = {
  lessonIds: readonly string[];
};

export function getPathProgress(path: PathLike, progress: Progress) {
  const reading = new Set(progress.readingIds);
  const completedLabs = new Set(progress.labIds);

  const pathLessons = path.lessonIds
    .map((id) => lessons.find((lesson) => lesson.id === id))
    .filter((lesson): lesson is Lesson => lesson !== undefined);

  let readingAvailable = 0;
  let readingEarned = 0;
  let labsAvailable = 0;
  let labsEarned = 0;
  let homeworkAvailable = 0;
  let homeworkEarned = 0;
  let labCount = 0;
  let completedLabCount = 0;

  const homeworkIds = new Set<string>();
  const homeworkLessonIds = new Set<string>();

  for (const lesson of pathLessons) {
    readingAvailable += lesson.xp;
    if (reading.has(lesson.id)) {
      readingEarned += lesson.xp;
    }

    for (const block of lesson.blocks) {
      if (block.type === "lab") {
        labCount += 1;
        labsAvailable += LAB_XP;
        if (completedLabs.has(`${lesson.id}:${block.id}`)) {
          completedLabCount += 1;
          labsEarned += LAB_XP;
        }
      }

      if (block.type === "homework") {
        homeworkLessonIds.add(lesson.id);
        // A homework definition contributes once per path.
        if (!homeworkIds.has(block.homeworkId)) {
          homeworkIds.add(block.homeworkId);
          homeworkAvailable += block.totalPoints;
          homeworkEarned += Math.min(
            block.totalPoints,
            Math.max(0, progress.homeworkBest[block.homeworkId] ?? 0),
          );
        }
      }
    }
  }

  const readingCount = pathLessons.filter((lesson) =>
    reading.has(lesson.id),
  ).length;

  const available = readingAvailable + labsAvailable + homeworkAvailable;
  const earned = readingEarned + labsEarned + homeworkEarned;

  const readingComplete =
    path.lessonIds.length > 0 &&
    path.lessonIds.every((id) => reading.has(id));

  return {
    lessons: pathLessons,
    lessonCount: pathLessons.length,
    readingCount,
    readingComplete,
    minutes: pathLessons.reduce((sum, lesson) => sum + lesson.minutes, 0),
    labCount,
    completedLabCount,
    homeworkCount: homeworkIds.size,
    homeworkLessonIds: [...homeworkLessonIds],
    readingAvailable,
    readingEarned,
    labsAvailable,
    labsEarned,
    homeworkAvailable,
    homeworkEarned,
    available,
    earned,
    percentage: available > 0 ? Math.round((earned / available) * 100) : 0,
    started: readingCount > 0 || earned > 0,
  };
}

export function formatLessonDuration(minutes: number) {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder === 0 ? `${hours} hr` : `${hours} hr ${remainder} min`;
}

--- END FILE: src/lib/path-progress.ts ---

--- BEGIN FILE: src/server/homework-catalog.ts ---
import "server-only";
import { lessons, type ContentBlock } from "@/content/lessons";
import type { HomeworkQuestion } from "@/lib/progress-types";

type HomeworkBlock = Extract<ContentBlock, { type: "homework" }>;

export type HomeworkDefinition = HomeworkBlock & {
  chapterId: string;
};

export const homeworkChapters = lessons
  .map((lesson) => {
    const questions = lesson.blocks
      .filter((block): block is HomeworkBlock => block.type === "homework")
      .map((block) => ({
        ...block,
        totalTests: block.testCases.length,
      }));

    return {
      id: lesson.id,
      title: lesson.title,
      description: lesson.description,
      questions,
    };
  })
  .filter((chapter) => chapter.questions.length > 0);

const questionsById = new Map<string, HomeworkDefinition>();

for (const chapter of homeworkChapters) {
  for (const question of chapter.questions) {
    if (questionsById.has(question.homeworkId)) {
      throw new Error(`Duplicate homeworkId: ${question.homeworkId}`);
    }

    if (
      !Number.isInteger(question.totalPoints) ||
      question.totalPoints <= 0 ||
      question.testCases.length === 0 ||
      question.testCases.length > 100
    ) {
      throw new Error(`Invalid homework definition: ${question.homeworkId}`);
    }

    questionsById.set(question.homeworkId, {
      ...question,
      chapterId: chapter.id,
    });
  }
}

export function findHomework(homeworkId: string) {
  return questionsById.get(homeworkId);
}

export function publicQuestion(question: HomeworkBlock): HomeworkQuestion {
  return {
    homeworkId: question.homeworkId,
    title: question.title || "Assignment",
    objective: question.objective || "Complete the assignment script.",
    totalPoints: question.totalPoints,
    totalTests: question.testCases.length,
  };
}

--- END FILE: src/server/homework-catalog.ts ---

```

## PROMPT 3: Target Homework Files
```text
Awesome. Finally, read the React components for the Homework section that we will actually be modifying for Batch 3. Do NOT write any code yet. Just reply 'Target components absorbed, ready for instructions.'

--- BEGIN FILE: src/app/homework/page.tsx ---
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { paths } from "@/content/paths";
import { requireRonakId } from "@/server/current-user";
import { getProgress } from "@/server/progress";
import { homeworkChapters } from "@/server/homework-catalog";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function HomeworkPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const userId = await requireRonakId();
  const progress = getProgress(userId);
  const query = await searchParams;

  const requestedPath =
    typeof query.path === "string" ? query.path : undefined;
  const selectedPath = paths.find((path) => path.id === requestedPath);

  const chapters = selectedPath
    ? homeworkChapters.filter((chapter) =>
        selectedPath.lessonIds.includes(chapter.id),
      )
    : homeworkChapters;

  return (
    <>
      <header className="topbar">
        <div className="breadcrumb">
          <span>Homework</span>
          {selectedPath && <span> / {selectedPath.title}</span>}
        </div>
      </header>
      <header className="hero">
        <div>
          <span className="eyebrow accent">PRACTICE YOUR SKILLS</span>
          <h1>{selectedPath ? `${selectedPath.title} homework` : "Homework"}</h1>
          <p>
            Choose a chapter, submit your Bash scripts, and improve your best
            score.
          </p>
        </div>
      </header>

      {selectedPath && (
        <p>
          <Link href="/homework" className="secondary-button">
            View all homework
          </Link>
        </p>
      )}

      <ul className="path-grid">
        {chapters.map((chapter) => {
          const earned = chapter.questions.reduce(
            (sum, question) =>
              sum + (progress.homeworkBest[question.homeworkId] ?? 0),
            0,
          );
          const available = chapter.questions.reduce(
            (sum, question) => sum + question.totalPoints,
            0,
          );
          const solved = chapter.questions.filter(
            (question) =>
              (progress.homeworkBest[question.homeworkId] ?? 0) >=
              question.totalPoints,
          ).length;

          return (
            <li key={chapter.id}>
              <Link
                href={`/homework/${encodeURIComponent(chapter.id)}`}
                className="path-card homework-path-card"
              >
                <div className="path-title">
                  <h2>{chapter.title}</h2>
                  <ArrowUpRight size={20} aria-hidden="true" />
                </div>
                <p>{chapter.description}</p>
                <div className="path-tags">
                  <span className="pill">
                    {chapter.questions.length} questions
                  </span>
                  <span className="pill">{solved} solved</span>
                  <span className="pill">
                    {earned} / {available} XP
                  </span>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>

      {chapters.length === 0 && (
        <p>No homework is available for this path yet.</p>
      )}
    </>
  );
}

--- END FILE: src/app/homework/page.tsx ---

--- BEGIN FILE: src/app/homework/[chapterId]/page.tsx ---
import Link from "next/link";
import { notFound } from "next/navigation";
import HomeworkQuestionCard from "@/components/HomeworkQuestionCard";
import { requireRonakId } from "@/server/current-user";
import { getProgress } from "@/server/progress";
import {
  homeworkChapters,
  publicQuestion,
} from "@/server/homework-catalog";
import { ChevronRight } from "lucide-react";

export default async function ChapterHomeworkPage({
  params,
}: {
  params: Promise<{ chapterId: string }>;
}) {
  const userId = await requireRonakId();
  const { chapterId } = await params;

  const chapter = homeworkChapters.find((item) => item.id === chapterId);
  if (!chapter) notFound();

  const progress = getProgress(userId);

  return (
    <>
      <header className="topbar">
        <div className="breadcrumb">
          <Link href="/homework">Homework</Link>
          <ChevronRight size={14} aria-hidden="true" />
          <span>{chapter.title}</span>
        </div>
      </header>
      <header className="hero">
        <div>
          <Link href="/homework" className="eyebrow accent" style={{display: "block", marginBottom: "10px"}}>
            ← ALL HOMEWORK
          </Link>
          <h1>{chapter.title}</h1>
          <p>{chapter.description}</p>
        </div>
      </header>

      <div className="homework-list">
        {chapter.questions.map((question) => (
          <HomeworkQuestionCard
            key={question.homeworkId}
            question={publicQuestion(question)}
            bestXp={progress.homeworkBest[question.homeworkId] ?? 0}
          />
        ))}

        {chapter.questions.length === 0 && (
          <p>No homework questions have been added to this chapter yet.</p>
        )}
      </div>
    </>
  );
}

--- END FILE: src/app/homework/[chapterId]/page.tsx ---

--- BEGIN FILE: src/components/HomeworkQuestionCard.tsx ---
"use client";

import { useState, useTransition, type FormEvent } from "react";
import {
  gradeHomework,
  listHomeworkSubmissions,
  readHomeworkSubmission,
} from "@/app/actions/grade-homework";
import type {
  HistoryPage,
  HomeworkQuestion,
  Submission,
} from "@/lib/progress-types";

export default function HomeworkQuestionCard({
  question,
  bestXp,
}: {
  question: HomeworkQuestion;
  bestXp: number;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [history, setHistory] = useState<HistoryPage | null>(null);
  const [selected, setSelected] = useState<Submission | null>(null);

  function run(work: () => Promise<void>) {
    setError("");

    startTransition(async () => {
      try {
        await work();
      } catch {
        setError("The request could not finish. Please try again.");
      }
    });
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    formData.set("homeworkId", question.homeworkId);

    run(async () => {
      const reply = await gradeHomework(formData);

      if (!reply.ok) {
        setError(reply.error);
        return;
      }

      setSelected(reply.submission);

      if (history !== null) {
        setHistory(
          await listHomeworkSubmissions(question.homeworkId),
        );
      }
    });
  }

  function loadHistory(reset: boolean) {
    run(async () => {
      const cursor = reset ? undefined : history?.nextCursor ?? undefined;

      const page = await listHomeworkSubmissions(
        question.homeworkId,
        cursor,
      );

      setHistory((previous) => ({
        items:
          reset || !previous
            ? page.items
            : [...previous.items, ...page.items],
        nextCursor: page.nextCursor,
      }));
    });
  }

  function openSubmission(id: number) {
    run(async () => {
      setSelected(await readHomeworkSubmission(id));
    });
  }

  return (
    <details className="homework-question">
      <summary className="homework-question-heading">
        <span>
          <strong>{question.title}</strong>
          <small>{question.totalTests} tests</small>
        </span>

        <span className="homework-best">
          Best: {bestXp} / {question.totalPoints} XP
        </span>
      </summary>

      <div className="homework-question-body">
        <p className="homework-objective">{question.objective}</p>

        <form onSubmit={submit} className="homework-upload">
          <label htmlFor={`script-${question.homeworkId}`}>
            Upload your Bash script
          </label>

          <input
            id={`script-${question.homeworkId}`}
            name="file"
            type="file"
            accept=".sh"
            required
            disabled={pending}
          />

          <small>Choose a UTF-8 .sh file, up to 64 KB.</small>

          <button
            type="submit"
            className="primary-button"
            disabled={pending}
          >
            {pending ? "Working…" : "Submit for grading"}
          </button>
        </form>

        <p className="homework-error" role="alert">
          {error}
        </p>

        <div className="homework-history">
          <button
            type="button"
            className="secondary-button"
            disabled={pending}
            onClick={() => loadHistory(true)}
          >
            {history === null
              ? "View submission history"
              : "Refresh submission history"}
          </button>

          {history !== null && (
            <>
              {history.items.length === 0 ? (
                <p>No submissions yet.</p>
              ) : (
                <ul className="submission-list">
                  {history.items.map((submission) => (
                    <li key={submission.id}>
                      <button
                        type="button"
                        className="submission-row"
                        disabled={pending}
                        aria-pressed={selected?.id === submission.id}
                        onClick={() => openSubmission(submission.id)}
                      >
                        <span>
                          #{submission.id}
                          <small>
                            {new Date(
                              submission.createdAt,
                            ).toLocaleString()}
                          </small>
                        </span>

                        <span>
                          {submission.status === "graded"
                            ? `${submission.awardedXp} / ${submission.totalPoints} XP`
                            : submission.status === "pending"
                              ? "Pending"
                              : "Grading error"}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {history.nextCursor !== null && (
                <button
                  type="button"
                  className="secondary-button"
                  disabled={pending}
                  onClick={() => loadHistory(false)}
                >
                  Load older submissions
                </button>
              )}
            </>
          )}
        </div>

        {selected && (
          <section className="submission-detail" aria-live="polite">
            <h3>Submission #{selected.id}</h3>

            <p>
              {new Date(selected.createdAt).toLocaleString()}
              {" · "}
              {selected.filename}
            </p>

            {selected.status === "graded" && (
              <p className="accent">
                {selected.awardedXp} / {selected.totalPoints} XP
                {" · "}
                {selected.passedTests} / {selected.totalTests} tests passed
              </p>
            )}

            {selected.status === "pending" && (
              <p>Grading has not finished. Refresh history to check again.</p>
            )}

            {selected.error && (
              <p className="homework-error">{selected.error}</p>
            )}

            <details>
              <summary>View submitted code</summary>
              <pre className="submission-code">
                <code>{selected.code}</code>
              </pre>
            </details>

            <ul className="homework-results">
              {selected.results.map((result, index) => (
                <li key={index} className="submission-row" style={{ display: "block", background: result.passed ? "rgba(184, 247, 119, 0.05)" : "rgba(255, 139, 139, 0.05)" }}>
                  <details style={{ width: "100%" }}>
                    <summary style={{ display: "flex", gap: "10px", alignItems: "center", cursor: "pointer", fontWeight: 600 }}>
                      <span className={result.passed ? "test-pass" : "test-fail"}>
                        {result.passed ? "PASS" : "FAIL"}
                      </span>
                      <span>{" · "} {result.name}</span>
                    </summary>

                    <div style={{ marginTop: "16px" }}>
                      <p style={{ color: "var(--muted)", textTransform: "uppercase", fontSize: "11px", letterSpacing: "1px" }}>Expected output</p>
                      <pre style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "6px", padding: "10px", marginTop: "6px" }}>
                        <code>{result.expectedOutput || "(empty)"}</code>
                      </pre>

                      <p style={{ color: "var(--muted)", textTransform: "uppercase", fontSize: "11px", letterSpacing: "1px", marginTop: "12px" }}>Your output</p>
                      <pre style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "6px", padding: "10px", marginTop: "6px" }}>
                        <code>{result.actualOutput || "(empty)"}</code>
                      </pre>

                      {typeof result.error === "string" && (
                        <p className="homework-error" style={{ marginTop: "12px" }}>{result.error}</p>
                      )}

                      {typeof result.stderr === "string" && result.stderr !== "" && (
                        <>
                          <p style={{ color: "var(--muted)", textTransform: "uppercase", fontSize: "11px", letterSpacing: "1px", marginTop: "12px" }}>Standard error</p>
                          <pre style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "6px", padding: "10px", marginTop: "6px", color: "#ff8b8b" }}>
                            <code>{result.stderr}</code>
                          </pre>
                        </>
                      )}
                    </div>
                  </details>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </details>
  );
}

--- END FILE: src/components/HomeworkQuestionCard.tsx ---

```

## PROMPT 4: Batch 3 Instructions
```text
Please implement **Batch 3: Homework Restructuring**.

Here are the requirements:

### 📦 BATCH 3: Homework Restructuring (Locked Logic & Grader UI)
1. **Homework Catalog Logic (`src/app/homework/page.tsx` & `src/server/homework-catalog.ts`)**
   - Right now, all homework is open to everyone immediately.
   - Implement **Locked Logic**: A user should NOT be able to click on or access a homework chapter unless they have completed the **reading** for that chapter's lesson (using `progress.readingIds`).
   - Show a clear "Locked" state in the UI for chapters they haven't read yet (e.g., greyed out, lock icon, "Read chapter to unlock").
   - Redesign the list of homework chapters to match the premium UI from `batch-two.css` and `workspace.css`.
2. **Homework Grader UI (`src/app/homework/[chapterId]/page.tsx` & `src/components/HomeworkQuestionCard.tsx`)**
   - The current `HomeworkQuestionCard` looks very basic.
   - Redesign the grader UI to feel like a premium code-upload terminal or an interactive mission briefing.
   - Improve the display of the test results (Expected vs. Actual Output). It should look like a clean, color-coded terminal log (Green for Pass, Red for Fail) rather than basic HTML pre tags.
   - Show a prominent "Perfect Score" or "Completed" badge if `bestXp` equals `question.totalPoints`.
   - Create a new file `src/app/batch-three.css` for your new CSS, and import it where necessary.

Provide the complete updated code for the files you modify, and the new `batch-three.css`. Do NOT proceed to Batch 4 yet. Format your response clearly with file blocks.
```
