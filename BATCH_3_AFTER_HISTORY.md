# Batch 3 Prompts (After Importing History)

Since your AI already remembers everything up to Batch 1, we just need to bring it up to speed on Batch 2 and then give it the Batch 3 instructions. Paste these 3 prompts in sequence.

## PROMPT 1: Batch 2 Updates
```text
I have imported our history up to Batch 1. Since then, I implemented Batch 2, which added a new stylesheet and updated the Learning Paths and Lesson components. Please read the following updated files from Batch 2 so you are completely up to date with the new UI patterns. Do NOT write any code yet. Just reply 'Batch 2 absorbed.'

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

--- BEGIN FILE: src/app/paths/page.tsx ---
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Check,
  Clock3,
  FileCode2,
  FolderOpen,
  Layers3,
  Terminal,
  Trophy,
} from "lucide-react";
import WorkspaceShell from "@/components/WorkspaceShell";
import { paths, pathHref, pathRevisionHref } from "@/content/paths";
import {
  formatLessonDuration,
  getPathProgress,
} from "@/lib/path-progress";
import { requireRonakId } from "@/server/current-user";
import { getProgress } from "@/server/progress";
import "@/app/batch-two.css";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PathEntry = {
  path: (typeof paths)[number];
  stats: ReturnType<typeof getPathProgress>;
};

export default async function PathsPage() {
  const userId = await requireRonakId();
  const progress = getProgress(userId);

  const entries: PathEntry[] = paths.map((path) => ({
    path,
    stats: getPathProgress(path, progress),
  }));

  // Paths currently derive from lesson categories. Do not invent categories
  // or courses that are not present in the content.
  const groups = new Map<string, PathEntry[]>();
  for (const entry of entries) {
    const category = entry.stats.lessons[0]?.category ?? entry.path.title;
    const group = groups.get(category) ?? [];
    group.push(entry);
    groups.set(category, group);
  }

  const totalLessons = entries.reduce(
    (sum, entry) => sum + entry.stats.lessonCount,
    0,
  );
  const totalEarned = entries.reduce(
    (sum, entry) => sum + entry.stats.earned,
    0,
  );
  const totalAvailable = entries.reduce(
    (sum, entry) => sum + entry.stats.available,
    0,
  );

  return (
    <WorkspaceShell current="/paths">
      <div className="paths-page">
        <header className="paths-heading">
          <div>
            <span className="dashboard-kicker">YOUR LEARNING LIBRARY</span>
            <h1>Build your next skill.</h1>
            <p>
              Follow a focused path, put the ideas into practice, and collect points
              as you learn.
            </p>
          </div>
          <span className="paths-heading-icon" aria-hidden="true">
            <Layers3 size={34} />
          </span>
        </header>

        <dl className="paths-summary">
          <div>
            <dt>
              <FolderOpen size={16} aria-hidden="true" />
              Learning paths
            </dt>
            <dd>{paths.length}</dd>
          </div>
          <div>
            <dt>
              <BookOpen size={16} aria-hidden="true" />
              Chapters to explore
            </dt>
            <dd>{totalLessons}</dd>
          </div>
          <div>
            <dt>
              <Trophy size={16} aria-hidden="true" />
              Your path points
            </dt>
            <dd>
              {totalEarned} <span>/ {totalAvailable}</span>
            </dd>
          </div>
        </dl>

        <p className="paths-summary-note">
          Path points combine reading XP, lab XP, and homework scores. CTF points
          are separate.
        </p>

        {groups.size > 0 ? (
          Array.from(groups.entries()).map(([category, categoryPaths], index) => (
            <section
              key={category}
              className="paths-category"
              aria-labelledby={`path-category-${index}`}
            >
              <div className="dashboard-section-heading">
                <div>
                  <span className="dashboard-kicker">EXPLORE A CATEGORY</span>
                  <h2 id={`path-category-${index}`}>{category}</h2>
                </div>
                <span className="paths-category-count">
                  {categoryPaths.length}{" "}
                  {categoryPaths.length === 1 ? "path" : "paths"}
                </span>
              </div>

              <ul className="paths-catalog">
                {categoryPaths.map(({ path, stats }) => {
                  const allPointsEarned =
                    stats.available > 0 && stats.earned >= stats.available;
                  const fullCompletion = stats.readingComplete && allPointsEarned;

                  const stateLabel = fullCompletion
                    ? "Complete"
                    : stats.readingComplete
                      ? "Reading complete"
                      : stats.started
                        ? "In progress"
                        : "Ready to start";

                  const actionLabel = fullCompletion
                    ? "Revisit path"
                    : stats.readingComplete
                      ? "Continue practice"
                      : stats.started
                        ? "Continue path"
                        : "Start path";

                  return (
                    <li key={path.id}>
                      <article className="paths-course-card">
                        <div className="paths-course-top">
                          <span
                            className="dashboard-path-icon"
                            aria-hidden="true"
                          >
                            {stats.labCount > 0 ? (
                              <Terminal size={23} />
                            ) : (
                              <BookOpen size={23} />
                            )}
                          </span>
                          <span
                            className={`dashboard-state${
                              fullCompletion ? " is-complete" : ""
                            }`}
                          >
                            {fullCompletion && (
                              <Check size={12} aria-hidden="true" />
                            )}
                            {stateLabel}
                          </span>
                        </div>

                        <div className="paths-course-body">
                          <span className="dashboard-kicker">LEARNING PATH</span>
                          <h3>
                            <Link href={pathHref(path.id)}>{path.title}</Link>
                          </h3>
                          <p>
                            {stats.lessonCount}{" "}
                            {stats.lessonCount === 1 ? "chapter" : "chapters"} to
                            build understanding and practice at your own pace.
                          </p>

                          <div className="paths-course-tags">
                            <span>{path.difficulty}</span>
                            <span>{path.type}</span>
                            <span>
                              <Clock3 size={12} aria-hidden="true" />
                              {formatLessonDuration(stats.minutes)} reading
                            </span>
                          </div>
                          <p className="paths-time-note">
                            Estimated reading time. Labs and homework may take
                            longer.
                          </p>

                          <dl
                            className="paths-points-breakdown"
                            aria-label={`${path.title} points breakdown`}
                          >
                            <div>
                              <dt>
                                <BookOpen size={14} aria-hidden="true" />
                                Reading
                              </dt>
                              <dd>
                                {stats.readingEarned}{" "}
                                <span> / {stats.readingAvailable}</span>
                              </dd>
                            </div>
                            <div>
                              <dt>
                                <Terminal size={14} aria-hidden="true" />
                                Labs
                              </dt>
                              <dd>
                                {stats.labsEarned}{" "}
                                <span> / {stats.labsAvailable}</span>
                              </dd>
                            </div>
                            <div>
                              <dt>
                                <FileCode2 size={14} aria-hidden="true" />
                                Homework
                              </dt>
                              <dd>
                                {stats.homeworkEarned}{" "}
                                <span> / {stats.homeworkAvailable}</span>
                              </dd>
                            </div>
                          </dl>
                        </div>

                        <div className="paths-course-progress">
                          <div>
                            <span>Total path points</span>
                            <strong>
                              {stats.earned} <span> / {stats.available}</span>
                            </strong>
                          </div>
                          <progress
                            value={stats.earned}
                            max={stats.available || 1}
                            aria-label={`${path.title}: ${stats.earned} of ${stats.available} points earned`}
                          />
                          <p>
                            {stats.percentage}% of points earned ·{" "}
                            {stats.readingCount}/{stats.lessonCount} chapters read
                            · {stats.completedLabCount}/{stats.labCount} labs
                            completed
                          </p>
                        </div>

                        <footer className="paths-course-footer">
                          <Link
                            href={pathHref(path.id)}
                            className="primary-button"
                            aria-label={`${actionLabel}: ${path.title}`}
                          >
                            {actionLabel}
                            <ArrowRight size={15} aria-hidden="true" />
                          </Link>
                          {stats.readingComplete && (
                            <Link
                              href={pathRevisionHref(path.id)}
                              className="dashboard-text-link"
                              aria-label={`Review reading: ${path.title}`}
                            >
                              Review reading
                            </Link>
                          )}
                        </footer>
                      </article>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))
        ) : (
          <section className="dashboard-empty">
            <FolderOpen size={30} aria-hidden="true" />
            <h2>Your next adventure is on its way.</h2>
            <p>New learning paths will appear here.</p>
          </section>
        )}
      </div>
    </WorkspaceShell>
  );
}

--- END FILE: src/app/paths/page.tsx ---

--- BEGIN FILE: src/components/LearningPage.tsx ---
"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  useTransition,
  type FormEvent,
} from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  Clock3,
  FlaskConical,
  Lightbulb,
  LockKeyhole,
  RotateCcw,
  Terminal,
  Trophy,
} from "lucide-react";

import { type Lesson, type ContentBlock } from "@/content/lessons";
import WorkspaceShell from "@/components/WorkspaceShell";
import LabTerminal from "@/components/LabTerminal";
import type { Progress } from "@/lib/progress-types";
import {
  markReadingComplete,
  completeLab,
  importReadingProgress,
} from "@/app/actions/progress";
import "@/app/batch-two.css";

// Display-only value matching the existing completeLab Server Action.
// Scoring remains server-controlled.
const LAB_POINTS = 50;

type ReadingBlock = Exclude<ContentBlock, { type: "homework" }>;
type ReadingLesson = Omit<Lesson, "blocks"> & {
  blocks: ReadingBlock[];
};

type LearningPageProps = {
  lessons: ReadingLesson[];
  progress: Progress;
  initialLessonId: string;
  revision?: boolean;
  pathTitle: string;
};

function getLabs(lesson: ReadingLesson) {
  return lesson.blocks.filter(
    (block): block is Extract<ContentBlock, { type: "lab" }> =>
      block.type === "lab",
  );
}

function hasStartedLesson(lesson: ReadingLesson, progress: Progress) {
  return (
    progress.readingIds.includes(lesson.id) ||
    getLabs(lesson).some((block) =>
      progress.labIds.includes(`${lesson.id}:${block.id}`),
    )
  );
}

function getInitialActiveId({
  lessons,
  progress,
  initialLessonId,
  revision,
}: LearningPageProps) {
  if (revision) {
    return (
      lessons.find((lesson) => lesson.id === initialLessonId)?.id ??
      lessons[0]?.id ??
      ""
    );
  }

  const firstUnread = lessons.find(
    (lesson) => !progress.readingIds.includes(lesson.id),
  );
  const requested = lessons.find((lesson) => lesson.id === initialLessonId);

  // A deep link should not bypass the sequential reading entry point.
  if (
    requested &&
    (requested.id === firstUnread?.id || hasStartedLesson(requested, progress))
  ) {
    return requested.id;
  }
  return firstUnread?.id ?? lessons[0]?.id ?? "";
}

function Quiz({
  block,
}: {
  block: Extract<ContentBlock, { type: "quiz" }>;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const correct = selected === block.answer;

  return (
    <section className="quiz-card">
      <span className="eyebrow">QUICK CHECK</span>
      <h3>{block.question}</h3>
      <div className="quiz-options">
        {block.options.map((option, index) => (
          <button
            key={`${block.id}:${index}`}
            type="button"
            className={`quiz-option${
              selected === index ? " selected" : ""
            }`}
            aria-pressed={selected === index}
            onClick={() => setSelected(index)}
          >
            <span className="option-letter">
              {String.fromCharCode(65 + index)}
            </span>
            {option}
            {selected === index && correct && (
              <Check size={18} aria-hidden="true" />
            )}
          </button>
        ))}
      </div>
      <p className="quiz-feedback" aria-live="polite">
        {selected === null
          ? "Take a guess. Curiosity counts."
          : correct
            ? `Exactly! ${block.explanation}`
            : "Not quite. Revisit the notes and try another answer."}
      </p>
    </section>
  );
}

function LabBlock({
  lessonId,
  block,
  isCompleted,
  revision,
}: {
  lessonId: string;
  block: Extract<ContentBlock, { type: "lab" }>;
  isCompleted: boolean;
  revision: boolean;
}) {
  const [retrying, setRetrying] = useState(revision);
  const [flagInput, setFlagInput] = useState("");
  const [error, setError] = useState(false);
  const [submitting, startSubmitting] = useTransition();

  const inputId = useId();
  const errorId = useId();

  function submitFlag(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    startSubmitting(async () => {
      try {
        const result = await completeLab(lessonId, block.id, flagInput);
        setError(!result.ok);
        if (result.ok) {
          setRetrying(false);
          setFlagInput("");
        }
      } catch {
        setError(true);
      }
    });
  }

  if (isCompleted && !retrying) {
    return (
      <section className="lab-card lesson-lab-complete">
        <div className="lesson-lab-complete-heading">
          <span className="lesson-lab-complete-icon" aria-hidden="true">
            <Check size={20} />
          </span>
          <div>
            <strong>Practice completed</strong>
            <p>
              {block.title} · {LAB_POINTS} lab points earned
            </p>
          </div>
        </div>
        <button
          type="button"
          className="secondary-button"
          onClick={() => setRetrying(true)}
        >
          <RotateCcw size={14} aria-hidden="true" />
          Reattempt
        </button>
      </section>
    );
  }

  return (
    <section className="lab-card lesson-lab-card">
      <LabTerminal labId={block.labId} title={block.title} />
      <div className="lab-instructions">
        <span className="eyebrow">YOUR MISSION</span>
        <p>{block.objective}</p>

        {isCompleted && (
          <p className="lesson-lab-reattempt-note">
            You have already earned these lab points. Reattempting does not award
            them again.
          </p>
        )}

        <form className="lesson-lab-form" onSubmit={submitFlag}>
          <label htmlFor={inputId}>Completion code</label>
          <div className="lesson-lab-form-row">
            <input
              id={inputId}
              type="text"
              value={flagInput}
              onChange={(event) => {
                setFlagInput(event.target.value);
                setError(false);
              }}
              placeholder="Enter your completion code"
              disabled={submitting}
              aria-invalid={error || undefined}
              aria-describedby={error ? errorId : undefined}
              autoComplete="off"
              spellCheck={false}
            />
            <button
              type="submit"
              disabled={submitting || !flagInput.trim()}
              className="primary-button"
            >
              {submitting ? "Checking..." : "Submit code"}
              {!submitting && <ArrowRight size={15} aria-hidden="true" />}
            </button>
          </div>
          {error && (
            <p id={errorId} className="lesson-lab-error" role="alert">
              Incorrect answer or submission could not finish.
            </p>
          )}
        </form>

        <details className="lesson-hint">
          <summary>
            <span className="lesson-hint-icon" aria-hidden="true">
              <Lightbulb size={17} />
            </span>
            <span className="lesson-hint-copy">
              <strong>Need a nudge?</strong>
              <span>Reveal a hint without leaving your practice.</span>
            </span>
            <ChevronDown
              className="lesson-hint-chevron"
              size={17}
              aria-hidden="true"
            />
          </summary>
          <div className="lesson-hint-body">
            <p>{block.hint}</p>
          </div>
        </details>
      </div>
    </section>
  );
}

function LessonBlock({
  lessonId,
  block,
  progress,
  revision,
}: {
  lessonId: string;
  block: ReadingBlock;
  progress: Progress;
  revision: boolean;
}) {
  switch (block.type) {
    case "note":
      return (
        <section className="note">
          <h2>{block.title}</h2>
          <p>{block.body}</p>
        </section>
      );
    case "tip":
      return (
        <aside className="tip">
          <FlaskConical size={21} aria-hidden="true" />
          <div>
            <h3>{block.title}</h3>
            <p>{block.body}</p>
          </div>
        </aside>
      );
    case "code":
      return (
        <section className="code-card">
          <div className="panel-heading">
            <span>{block.title}</span>
            <span className="eyebrow">BASH</span>
          </div>
          <pre>
            <code>{block.code}</code>
          </pre>
          <p className="code-caption">{block.caption}</p>
        </section>
      );
    case "lab":
      return (
        <LabBlock
          lessonId={lessonId}
          block={block}
          isCompleted={progress.labIds.includes(`${lessonId}:${block.id}`)}
          revision={revision}
        />
      );
    case "quiz":
      return <Quiz block={block} />;
  }
}

export default function LearningPage(props: LearningPageProps) {
  const {
    lessons,
    progress,
    revision = false,
    pathTitle,
  } = props;

  const [activeId, setActiveId] = useState(() => getInitialActiveId(props));
  const [visitedIds, setVisitedIds] = useState<string[]>(() => {
    const initialId = getInitialActiveId(props);
    return initialId ? [initialId] : [];
  });
  const [notice, setNotice] = useState("");
  const [revisionReading, setRevisionReading] = useState<string[]>([]);
  const [savedThisVisit, setSavedThisVisit] = useState<string[]>([]);
  const [saving, startSaving] = useTransition();
  const [importing, startImporting] = useTransition();

  const headingRef = useRef<HTMLHeadingElement>(null);
  const previousActiveId = useRef(activeId);
  const sidebarId = useId();

  // Only update this local overlay after a successful server action.
  const savedReading = new Set([
    ...progress.readingIds,
    ...savedThisVisit,
  ]);
  const completedReading = revision ? new Set(revisionReading) : savedReading;
  const completedLabs = new Set(progress.labIds);

  const lesson = lessons.find((item) => item.id === activeId) ?? lessons[0];
  const lessonIndex = lesson
    ? lessons.findIndex((item) => item.id === lesson.id)
    : -1;

  const nextLesson = lessons[lessonIndex + 1];
  const previousLesson = lessons[lessonIndex - 1];

  const isRead = lesson ? completedReading.has(lesson.id) : false;
  const readCount = lessons.filter((item) =>
    completedReading.has(item.id),
  ).length;

  const firstUnread = lessons.find(
    (item) => !completedReading.has(item.id),
  );

  const accessibleIds = new Set(visitedIds);
  for (const item of lessons) {
    if (
      completedReading.has(item.id) ||
      hasStartedLesson(item, progress)
    ) {
      accessibleIds.add(item.id);
    }
  }
  if (firstUnread) accessibleIds.add(firstUnread.id);
  if (lesson) accessibleIds.add(lesson.id);

  useEffect(() => {
    if (previousActiveId.current === activeId) return;
    previousActiveId.current = activeId;
    headingRef.current?.focus({ preventScroll: true });
    headingRef.current?.scrollIntoView({
      block: "start",
      behavior: "auto",
    });
  }, [activeId]);

  function openLesson(id: string) {
    setVisitedIds((current) =>
      current.includes(id) ? current : [...current, id],
    );
    setActiveId(id);
    setNotice("");
  }

  function markAsRead() {
    if (!lesson || isRead || saving) return;
    const lessonId = lesson.id;

    if (revision) {
      setRevisionReading((current) =>
        current.includes(lessonId) ? current : [...current, lessonId],
      );
      setNotice("Reviewed for this visit. Your saved XP is unchanged.");
      return;
    }

    startSaving(async () => {
      try {
        await markReadingComplete(lessonId);
        setSavedThisVisit((current) =>
          current.includes(lessonId) ? current : [...current, lessonId],
        );
        setNotice("Reading progress saved.");
      } catch {
        setNotice("Progress could not be saved. Please try again.");
      }
    });
  }

  function importOldReading() {
    if (importing) return;
    startImporting(async () => {
      try {
        const raw =
          window.localStorage.getItem("cipher-lab:reading-progress:v1") ?? "[]";
        await importReadingProgress(raw);
        setNotice("Existing reading progress imported.");
      } catch {
        setNotice("Reading progress could not be imported.");
      }
    });
  }

  if (!lesson) {
    return (
      <WorkspaceShell current="/paths">
        <section className="dashboard-empty lesson-empty">
          <BookOpen size={28} aria-hidden="true" />
          <h1>No chapters available yet.</h1>
          <p>This learning path is still being prepared.</p>
          <Link href="/paths" className="primary-button">
            <ArrowLeft size={16} aria-hidden="true" />
            Back to Learning Paths
          </Link>
        </section>
      </WorkspaceShell>
    );
  }

  const lessonLabs = getLabs(lesson);
  const remainingLabCount = lessonLabs.filter(
    (block) => !completedLabs.has(`${lesson.id}:${block.id}`),
  ).length;

  return (
    <WorkspaceShell current="/paths">
      <div className="lesson-workspace">
        <aside
          className="lesson-index"
          aria-label={`${pathTitle} chapter index`}
        >
          <Link href="/paths" className="lesson-index-back">
            <ArrowLeft size={16} aria-hidden="true" />
            Back to Learning Paths
          </Link>

          <div className="lesson-index-heading">
            <span className="dashboard-kicker">
              {revision ? "REVISION INDEX" : "YOUR PATH"}
            </span>
            <h2>{pathTitle}</h2>
            <p>
              {readCount} of {lessons.length} chapters{" "}
              {revision ? "reviewed this visit" : "read"}
            </p>
            <progress
              value={readCount}
              max={lessons.length || 1}
              aria-label={`${readCount} of ${lessons.length} chapters ${
                revision ? "reviewed this visit" : "read"
              }`}
            />
          </div>

          <nav className="lesson-index-navigation" aria-label="Chapters">
            <ol className="lesson-index-list">
              {lessons.map((item, index) => {
                const labs = getLabs(item);
                const readingDone = completedReading.has(item.id);
                const unfinishedLabs = labs.some(
                  (block) => !completedLabs.has(`${item.id}:${block.id}`),
                );
                const fullyComplete = readingDone && !unfinishedLabs;
                const showWarning = readingDone && unfinishedLabs;
                const current = lesson.id === item.id;
                const locked = !accessibleIds.has(item.id);

                const lessonPoints = item.xp + labs.length * LAB_POINTS;
                const tooltipId = `${sidebarId}-lab-warning-${index}`;

                const stateLabel = fullyComplete
                  ? revision
                    ? "Reviewed"
                    : "Completed"
                  : showWarning
                    ? "Reading complete"
                    : current
                      ? "Current lesson"
                      : locked
                        ? "Locked"
                        : "In progress";

                const stateClass = fullyComplete
                  ? " is-complete"
                  : showWarning
                    ? " has-unfinished-labs"
                    : locked
                      ? " is-locked"
                      : " is-ongoing";

                return (
                  <li
                    key={item.id}
                    className={`lesson-index-item${stateClass}${
                      current ? " is-current" : ""
                    }`}
                  >
                    <button
                      type="button"
                      className="lesson-index-button"
                      disabled={locked || saving}
                      aria-current={current ? "step" : undefined}
                      aria-label={`${index + 1}. ${item.title}. ${lessonPoints} reading and lab points. ${stateLabel}${
                        current && stateLabel !== "Current lesson"
                          ? ". Current lesson"
                          : ""
                      }`}
                      onClick={() => openLesson(item.id)}
                    >
                      <span
                        className="lesson-index-number"
                        aria-hidden="true"
                      >
                        {locked ? (
                          <LockKeyhole size={14} />
                        ) : fullyComplete ? (
                          <Check size={15} />
                        ) : (
                          String(index + 1).padStart(2, "0")
                        )}
                      </span>
                      <span className="lesson-index-copy">
                        <strong>{item.title}</strong>
                        <span>
                          {lessonPoints} pts <span aria-hidden="true"> · </span>
                          {stateLabel}
                        </span>
                      </span>
                    </button>

                    {showWarning && (
                      <span
                        className="lesson-index-warning"
                        tabIndex={0}
                        aria-label="Unfinished labs"
                        aria-describedby={tooltipId}
                      >
                        <span
                          className="lesson-index-warning-dot"
                          aria-hidden="true"
                        />
                        <span
                          id={tooltipId}
                          role="tooltip"
                          className="lesson-index-tooltip"
                        >
                          This lesson has unfinished labs
                        </span>
                      </span>
                    )}
                  </li>
                );
              })}
            </ol>
          </nav>

          <div className="lesson-index-note">
            <LockKeyhole size={15} aria-hidden="true" />
            <p>
              Mark the current reading complete to unlock the next chapter. You can
              return to unfinished labs later.
            </p>
          </div>
          <p className="lesson-index-points-note">
            Chapter points include reading and labs. Homework points are tracked
            separately on the Homework screen.
          </p>
        </aside>

        <div className="lesson-stage">
          <header className="lesson-breadcrumb-bar">
            <nav className="breadcrumb" aria-label="Breadcrumb">
              <Link href="/paths">Learning paths</Link>
              <ChevronRight size={14} aria-hidden="true" />
              <span>{pathTitle}</span>
            </nav>
            <span className="pill">SELF-PACED</span>
          </header>

          {revision && (
            <div className="revision-banner" role="note">
              <RotateCcw size={20} aria-hidden="true" />
              <div>
                <strong>Revision mode</strong>
                <p>
                  A fresh reading pass for this visit. Your saved XP and previous
                  completions are unchanged. Reloading starts this local pass
                  over.
                </p>
              </div>
              <Link href="/paths" className="secondary-button">
                Exit revision
              </Link>
            </div>
          )}

          <header className="lesson-hero">
            <span className="dashboard-kicker">
              CHAPTER {String(lessonIndex + 1).padStart(2, "0")} OF{" "}
              {String(lessons.length).padStart(2, "0")}
            </span>
            <h1 ref={headingRef} tabIndex={-1}>
              {lesson.title}
            </h1>
            <p>{lesson.description}</p>
            <div className="lesson-hero-meta">
              <span>
                <BookOpen size={14} aria-hidden="true" />
                Beginner friendly
              </span>
              <span>
                <Clock3 size={14} aria-hidden="true" />
                {lesson.minutes} min reading
              </span>
              <span>
                <Trophy size={14} aria-hidden="true" />
                {lesson.xp} reading pts
              </span>
              {lessonLabs.length > 0 && (
                <span>
                  <Terminal size={14} aria-hidden="true" />
                  {lessonLabs.length * LAB_POINTS} lab pts
                </span>
              )}
            </div>
          </header>

          <aside className="lesson-plan" aria-label="Chapter objectives">
            <div className="lesson-plan-heading">
              <span className="lesson-plan-icon" aria-hidden="true">
                <FlaskConical size={20} />
              </span>
              <div>
                <span className="dashboard-kicker">THE GAME PLAN</span>
                <h2>Small steps. Real skills.</h2>
              </div>
            </div>
            <ol>
              {lesson.objectives.map((objective, index) => (
                <li key={`${lesson.id}:objective:${index}`}>
                  {objective}
                </li>
              ))}
            </ol>
          </aside>

          <article
            className="lesson-content lesson-reading-content"
            aria-label={lesson.title}
          >
            {lesson.blocks.map((block) => (
              <LessonBlock
                key={`${lesson.id}:${block.id}:${revision ? "revision" : "learn"}`}
                lessonId={lesson.id}
                block={block}
                progress={progress}
                revision={revision}
              />
            ))}

            <section className="completion-card lesson-reading-completion">
              <div>
                <h2>
                  {revision
                    ? isRead
                      ? "A useful refresher."
                      : "Ready to mark this reviewed?"
                    : isRead
                      ? "Another small win."
                      : "Ready to call this a win?"}
                </h2>
                <p>
                  {revision
                    ? "Revision progress is local to this visit."
                    : "Mark your reading progress when you feel comfortable."}
                </p>
              </div>

              <button
                type="button"
                className="primary-button"
                disabled={isRead || saving}
                onClick={markAsRead}
              >
                {isRead ? (
                  <Check size={17} aria-hidden="true" />
                ) : (
                  <ArrowUpRight size={17} aria-hidden="true" />
                )}
                {saving
                  ? "Saving..."
                  : revision
                    ? isRead
                      ? "Reviewed"
                      : "Mark as reviewed"
                    : isRead
                      ? "Lesson read"
                      : "Mark as read"}
              </button>
            </section>
            <p className="save-notice lesson-save-notice" role="status">
              {notice}
            </p>

            {!revision && (
              <details className="learning-import lesson-progress-import">
                <summary>Previously learned on this browser?</summary>
                <p>
                  Import reading progress saved by the earlier version of Cyber
                  Box.
                </p>
                <button
                  type="button"
                  onClick={importOldReading}
                  disabled={importing}
                  className="secondary-button"
                >
                  {importing ? "Importing..." : "Import old progress"}
                </button>
              </details>
            )}

            <footer className="lesson-bottom-navigation">
              <div className="lesson-bottom-copy">
                <span className="dashboard-kicker">
                  {nextLesson ? "KEEP YOUR MOMENTUM" : "LAST CHAPTER"}
                </span>
                <h2>
                  {nextLesson ? nextLesson.title : "Bring it all together."}
                </h2>
                <p>
                  {!isRead
                    ? revision
                      ? "Mark this chapter reviewed to continue."
                      : "Mark this chapter as read to continue."
                    : remainingLabCount > 0
                      ? `${remainingLabCount} ${
                          remainingLabCount === 1 ? "lab is" : "labs are"
                        } still unfinished. You can return to practice later.`
                      : nextLesson
                        ? "Your next discovery is one chapter away."
                        : "Return to Learning Paths to see your points and remaining practice."}
                </p>
              </div>

              <nav
                className="lesson-bottom-actions"
                aria-label="Lesson navigation"
              >
                {previousLesson && accessibleIds.has(previousLesson.id) && (
                  <button
                    type="button"
                    className="secondary-button"
                    disabled={saving}
                    onClick={() => openLesson(previousLesson.id)}
                  >
                    <ArrowLeft size={16} aria-hidden="true" />
                    Previous
                  </button>
                )}
                {nextLesson ? (
                  <button
                    type="button"
                    className="primary-button"
                    disabled={!isRead || saving}
                    onClick={() => openLesson(nextLesson.id)}
                  >
                    Go to Next Lesson
                    <ArrowRight size={16} aria-hidden="true" />
                  </button>
                ) : isRead && !saving ? (
                  <Link href="/paths" className="primary-button">
                    Finish Path
                    <Check size={16} aria-hidden="true" />
                  </Link>
                ) : (
                  <button type="button" className="primary-button" disabled>
                    Finish Path
                    <Check size={16} aria-hidden="true" />
                  </button>
                )}
              </nav>
            </footer>
          </article>
        </div>
      </div>
    </WorkspaceShell>
  );
}

--- END FILE: src/components/LearningPage.tsx ---

--- BEGIN FILE: src/components/LabTerminal.tsx ---
"use client";

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type MouseEvent,
} from "react";
import { Terminal as TerminalIcon, Trophy } from "lucide-react";
import { getLabAccessCode } from "@/app/actions";
import "@/app/batch-two.css";

type Props = {
  labId: string;
  title: string;
};

export default function LabTerminal({ labId, title }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [accessCode, setAccessCode] = useState<string | undefined>();
  const [request, setRequest] = useState<{ code: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [connected, setConnected] = useState(false);
  const [status, setStatus] = useState("Your practice space is ready.");

  useEffect(() => {
    let disposed = false;
    getLabAccessCode()
      .then((code) => {
        if (disposed) return;
        setAccessCode(code);
        if (!code?.trim()) {
          setStatus("No lab access code is available.");
        }
      })
      .catch(() => {
        if (!disposed) {
          setStatus("Could not load lab access. Please refresh and try again.");
        }
      });
    return () => {
      disposed = true;
    };
  }, []);

  useEffect(() => {
    const host = hostRef.current;
    if (!request || !host) return;

    let disposed = false;
    const cleanup: Array<() => void> = [];

    async function start() {
      try {
        const [{ Terminal }, { FitAddon }] = await Promise.all([
          import("@xterm/xterm"),
          import("@xterm/addon-fit"),
        ]);

        if (disposed) return;

        const terminal = new Terminal({
          cursorBlink: true,
          disableStdin: true,
          screenReaderMode: true,
          fontSize: 14,
          lineHeight: 1.25,
          fontFamily: '"SFMono-Regular", Consolas, monospace',
          scrollback: 2000,
          theme: {
            background: "#090f13",
            foreground: "#e1eadf",
            cursor: "#b8f777",
            selectionBackground: "#3a573d",
            green: "#b8f777",
            cyan: "#86d9dc",
            magenta: "#c4b5fd",
          },
        });

        cleanup.push(() => terminal.dispose());

        const fit = new FitAddon();
        terminal.loadAddon(fit);
        terminal.open(host!);
        fit.fit();

        const url = new URL(
          process.env.NEXT_PUBLIC_LAB_WS_URL || "/lab-socket",
          window.location.href,
        );

        if (url.protocol === "http:") url.protocol = "ws:";
        if (url.protocol === "https:") url.protocol = "wss:";
        if (
          !["ws:", "wss:"].includes(url.protocol) ||
          (window.location.protocol === "https:" && url.protocol !== "wss:")
        ) {
          throw new Error("The terminal requires a valid, secure gateway URL.");
        }

        const socket = new WebSocket(url);
        socket.binaryType = "arraybuffer";

        let ready = false;
        let closeMessage = "Connection closed. Connect again when you are ready.";

        cleanup.push(() => {
          socket.onopen = null;
          socket.onmessage = null;
          socket.onerror = null;
          socket.onclose = null;
          socket.close();
        });

        function send(message: object) {
          if (!disposed && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify(message));
          }
        }

        const connectionTimer = window.setTimeout(() => {
          if (ready || disposed) return;
          closeMessage = "Connection timed out. Check that the gateway is running.";
          setStatus(closeMessage);
          socket.close();
        }, 30_000);

        cleanup.push(() => window.clearTimeout(connectionTimer));

        socket.onopen = () => {
          send({
            type: "auth",
            code: request!.code,
            labId,
            cols: terminal.cols,
            rows: terminal.rows,
          });
        };

        socket.onmessage = (event: MessageEvent) => {
          if (disposed) return;

          if (event.data instanceof ArrayBuffer) {
            const bytes = new Uint8Array(event.data);
            terminal.write(bytes, () => {
              send({ type: "ack", bytes: bytes.byteLength });
            });
            return;
          }

          try {
            const message = JSON.parse(event.data) as {
              type?: string;
              message?: string;
            };

            if (message.type === "ready") {
              ready = true;
              window.clearTimeout(connectionTimer);
              terminal.options.disableStdin = false;
              fit.fit();
              send({
                type: "resize",
                cols: terminal.cols,
                rows: terminal.rows,
              });
              setConnected(true);
              setStatus("Connected. Your next discovery starts here.");
              terminal.focus();
            }

            if (
              message.type === "status" &&
              typeof message.message === "string"
            ) {
              closeMessage = message.message;
              setStatus(message.message);
            }
          } catch {
            closeMessage = "The gateway returned an invalid response.";
            socket.close();
          }
        };

        socket.onerror = () => {
          closeMessage = "Could not reach the gateway. Check its address and connection limits.";
          if (!disposed) setStatus(closeMessage);
        };

        socket.onclose = () => {
          window.clearTimeout(connectionTimer);
          ready = false;
          terminal.options.disableStdin = true;
          if (!disposed) {
            setBusy(false);
            setConnected(false);
            setStatus(closeMessage);
          }
        };

        const input = terminal.onData((data) => {
          if (!ready) return;
          if (data.length > 4096) {
            setStatus("Please paste fewer than 4,096 characters at a time.");
            return;
          }
          send({ type: "input", data });
        });

        const resize = terminal.onResize(({ cols, rows }) => {
          if (ready) send({ type: "resize", cols, rows });
        });

        const observer = new ResizeObserver(() => {
          if (
            !disposed &&
            host!.clientWidth > 0 &&
            host!.clientHeight > 0
          ) {
            fit.fit();
          }
        });
        observer.observe(host!);

        cleanup.push(
          () => input.dispose(),
          () => resize.dispose(),
          () => observer.disconnect(),
        );
      } catch (error) {
        if (!disposed) {
          setBusy(false);
          setConnected(false);
          setStatus(
            error instanceof Error ? error.message : "Could not start the terminal.",
          );
        }
      }
    }

    void start();

    return () => {
      disposed = true;
      for (const dispose of cleanup.reverse()) {
        dispose();
      }
      host.replaceChildren();
    };
  }, [request, labId]);

  function connect(
    event: FormEvent<HTMLFormElement> | MouseEvent<HTMLButtonElement>,
  ) {
    event.preventDefault();
    if (busy) return;
    if (!accessCode?.trim()) {
      setStatus("No access code found in environment variables.");
      return;
    }
    setBusy(true);
    setConnected(false);
    setStatus("Opening your practice space...");
    setRequest({ code: accessCode.trim() });
  }

  function disconnect() {
    setRequest(null);
    setBusy(false);
    setConnected(false);
    setStatus(
      "Disconnected. Your files stay until the lab restarts or is reset.",
    );
  }

  return (
    <div className="live-lab">
      <div className="panel-heading lab-terminal-heading">
        <div className="lab-terminal-title-group">
          <span className="lab-terminal-icon" aria-hidden="true">
            <TerminalIcon size={19} />
          </span>
          <div>
            <span className="lab-terminal-kicker">HANDS-ON PRACTICE</span>
            <strong className="lab-terminal-title">{title}</strong>
          </div>
        </div>

        <div className="lab-terminal-actions">
          <span className="lab-terminal-points">
            <Trophy size={13} aria-hidden="true" /> 50 XP
            <span className="lab-terminal-points-description">
              {" "}· lab points
            </span>
          </span>

          {busy ? (
            <button
              type="button"
              className="secondary-button"
              onClick={disconnect}
            >
              Disconnect
            </button>
          ) : (
            <button
              type="button"
              className="primary-button"
              onClick={connect}
              disabled={!accessCode?.trim()}
            >
              Connect to lab
            </button>
          )}
        </div>
      </div>

      <div className="terminal-window" style={{ overflow: "hidden" }}>
        <div
          ref={hostRef}
          className="terminal-screen"
          style={{ overflow: "hidden" }}
          aria-label={`${title} interactive terminal`}
        />
        {!request ? (
          <p className="terminal-empty">
            A little curiosity. A few commands. <br />
            Connect whenever you are ready.
          </p>
        ) : (
          !connected && (
            <p className="terminal-empty lab-terminal-overlay">
              {status === "Opening your practice space..." ? "Starting the machine..." : status}
            </p>
          )
        )}
      </div>

      <p
        className={`terminal-status lab-terminal-status${
          connected ? " is-connected" : ""
        }`}
        role="status"
        aria-live="polite"
      >
        <span aria-hidden="true" />
        {status}
      </p>
    </div>
  );
}
--- END FILE: src/components/LabTerminal.tsx ---

```

## PROMPT 2: Target Homework Files
```text
Great. Now here are the current Homework files that we will be modifying for Batch 3. Do NOT write any code yet. Just reply 'Homework files absorbed, ready for instructions.'

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

## PROMPT 3: Batch 3 Instructions
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
