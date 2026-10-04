"use client";

import { Plus } from "lucide-react";
import {
  TextField,
  NumberField,
  SelectField,
  CheckField,
  ListControls,
  moveItem,
} from "./fields";
import { FileEditor } from "./LabRecipeEditor";
import { LAB_TEMPLATES, LAB_TEMPLATE_IDS } from "@/lib/lab-recipe";
import {
  DEFAULT_COMPARE,
  HOMEWORK_LIMITS,
  STDOUT_MODES,
  bonusShares,
  type StdoutMode,
} from "@/lib/homework-recipe";
import type { HomeworkDraft, PathRow, QuestionDraft, TestCaseRow, TestDraft } from "./types";

function newId() {
  return crypto.randomUUID();
}

export function newTest(): TestDraft {
  return { id: newId(), setup_script: "", args: "", stdin: "", xp_reward: 10, is_hidden: false };
}

export function newQuestion(): QuestionDraft {
  return {
    id: newId(),
    title: "",
    question_markdown: "",
    standard_solution_script: "",
    time_limit_sec: HOMEWORK_LIMITS.timeDefaultSec,
    compare: { ...DEFAULT_COMPARE },
    tests: [newTest()],
  };
}

function ReferencePreview({ row }: { row: TestCaseRow | undefined }) {
  if (!row || row.expected_exit === null) {
    return <p className="creator-help">Reference result: not prepared yet (saved tests are prepared automatically).</p>;
  }
  return (
    <details className="creator-build-log">
      <summary>
        Reference result: exit code {row.expected_exit}, {row.expected_files ?? 0} file(s) in the folder,{" "}
        {row.expected_ms ?? 0} ms
      </summary>
      <pre>{row.expected_stdout ? row.expected_stdout : "(no output)"}</pre>
    </details>
  );
}

function TestEditor({
  test,
  index,
  length,
  preview,
  onChange,
  onRemove,
  onMove,
}: {
  test: TestDraft;
  index: number;
  length: number;
  preview: TestCaseRow | undefined;
  onChange: (test: TestDraft) => void;
  onRemove: () => void;
  onMove: (direction: -1 | 1) => void;
}) {
  return (
    <section className="creator-child">
      <div className="creator-section-heading">
        <h4>
          Test {index + 1}
          {test.is_hidden ? " · hidden" : ""}
        </h4>
        <ListControls label={`test ${index + 1}`} index={index} length={length} onMove={onMove} onRemove={onRemove} />
      </div>

      <TextField
        label="Setup script (bash, as root, inside the test's empty work folder, before the student's script)"
        value={test.setup_script}
        multiline
        code
        rows={4}
        maxLength={HOMEWORK_LIMITS.setupChars}
        placeholder={"mkdir Demo\nprintf 'apple\\nbanana\\n' > Demo/fruits.txt"}
        onChange={(setup_script) => onChange({ ...test, setup_script })}
      />

      <div className="creator-two-columns">
        <TextField
          label="Command-line arguments (optional)"
          value={test.args}
          maxLength={HOMEWORK_LIMITS.argsChars}
          placeholder={'Demo "file name.txt"'}
          onChange={(args) => onChange({ ...test, args })}
        />
        <NumberField label="XP for passing" value={test.xp_reward} onChange={(xp_reward) => onChange({ ...test, xp_reward })} />
      </div>

      <TextField
        label="Standard input (optional)"
        value={test.stdin}
        multiline
        code
        rows={2}
        maxLength={HOMEWORK_LIMITS.stdinBytes}
        onChange={(stdin) => onChange({ ...test, stdin })}
      />

      <CheckField
        label="Hidden test (learners see pass/fail only, not its input or expected result)"
        checked={test.is_hidden}
        onChange={(is_hidden) => onChange({ ...test, is_hidden })}
      />

      <ReferencePreview row={preview} />
    </section>
  );
}

function QuestionEditor({
  question,
  index,
  length,
  bonus,
  tests,
  onChange,
  onRemove,
  onMove,
}: {
  question: QuestionDraft;
  index: number;
  length: number;
  bonus: number;
  tests: TestCaseRow[];
  onChange: (question: QuestionDraft) => void;
  onRemove: () => void;
  onMove: (direction: -1 | 1) => void;
}) {
  const testXp = question.tests.reduce((sum, t) => sum + (Number.isFinite(t.xp_reward) ? t.xp_reward : 0), 0);
  const mode = STDOUT_MODES.find((m) => m.id === question.compare.stdout);

  const setTest = (testIndex: number, test: TestDraft) =>
    onChange({ ...question, tests: question.tests.map((t, i) => (i === testIndex ? test : t)) });

  return (
    <section className="creator-child creator-machine">
      <div className="creator-section-heading">
        <div>
          <h3>Question {index + 1}</h3>
          <p>
            Worth {testXp + bonus} XP ({testXp} from tests{bonus ? ` + ${bonus} bonus when all pass` : ""})
          </p>
        </div>
        <ListControls label={`question ${index + 1}`} index={index} length={length} onMove={onMove} onRemove={onRemove} />
      </div>

      <TextField label="Question title" value={question.title} required onChange={(title) => onChange({ ...question, title })} />

      <TextField
        label="Instructions for the learner"
        value={question.question_markdown}
        multiline
        required
        rows={7}
        maxLength={50_000}
        placeholder={"Write a script that counts the lines of every .txt file in the current folder…\n\n- Print one line per file: name: count\n- Use `wc -l`"}
        onChange={(question_markdown) => onChange({ ...question, question_markdown })}
      />

      <TextField
        label="Reference solution (bash). Expected results come from running this on every test."
        value={question.standard_solution_script}
        multiline
        code
        required
        rows={9}
        maxLength={HOMEWORK_LIMITS.solutionBytes}
        placeholder={"#!/bin/bash\nfor f in *.txt; do\n  echo \"$f: $(wc -l < \"$f\")\"\ndone"}
        onChange={(standard_solution_script) => onChange({ ...question, standard_solution_script })}
      />

      <div className="creator-two-columns">
        <NumberField
          label={`Time limit per test (seconds, ${HOMEWORK_LIMITS.timeMinSec}–${HOMEWORK_LIMITS.timeMaxSec})`}
          value={question.time_limit_sec}
          min={HOMEWORK_LIMITS.timeMinSec}
          max={HOMEWORK_LIMITS.timeMaxSec}
          onChange={(time_limit_sec) => onChange({ ...question, time_limit_sec })}
        />
        <SelectField
          label="How output is compared"
          value={question.compare.stdout}
          onChange={(stdout) => onChange({ ...question, compare: { ...question.compare, stdout: stdout as StdoutMode } })}
        >
          {STDOUT_MODES.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </SelectField>
      </div>
      {mode && <p className="creator-help">{mode.hint}</p>}

      <div className="creator-stack">
        <CheckField
          label="Exit code must match the reference solution"
          checked={question.compare.exitCode}
          onChange={(exitCode) => onChange({ ...question, compare: { ...question.compare, exitCode } })}
        />
        <CheckField
          label="Files left in the work folder must match (names, contents)"
          checked={question.compare.files}
          onChange={(files) => onChange({ ...question, compare: { ...question.compare, files } })}
        />
        {question.compare.files && (
          <CheckField
            label="…including file permissions"
            checked={question.compare.permissions}
            onChange={(permissions) => onChange({ ...question, compare: { ...question.compare, permissions } })}
          />
        )}
      </div>

      <div className="creator-section-heading" style={{ marginTop: "0.75rem" }}>
        <h4>Test cases</h4>
        <span className="creator-count">
          {question.tests.length}/{HOMEWORK_LIMITS.testsPerQuestion}
        </span>
      </div>

      {question.tests.map((test, testIndex) => (
        <TestEditor
          key={test.id}
          test={test}
          index={testIndex}
          length={question.tests.length}
          preview={tests.find((row) => row.id === test.id)}
          onChange={(updated) => setTest(testIndex, updated)}
          onRemove={() => onChange({ ...question, tests: question.tests.filter((_, i) => i !== testIndex) })}
          onMove={(dir) => onChange({ ...question, tests: moveItem(question.tests, testIndex, dir) })}
        />
      ))}

      <button
        type="button"
        className="secondary-button"
        disabled={question.tests.length >= HOMEWORK_LIMITS.testsPerQuestion}
        onClick={() => onChange({ ...question, tests: [...question.tests, newTest()] })}
      >
        <Plus size={16} aria-hidden="true" />
        Add test case
      </button>
    </section>
  );
}

export default function HomeworkEditor({
  draft,
  paths,
  tests,
  onChange,
}: {
  draft: HomeworkDraft;
  paths: PathRow[];
  tests: TestCaseRow[];
  onChange: (draft: HomeworkDraft) => void;
}) {
  const env = draft.environment;
  const shares = bonusShares(Number.isFinite(draft.total_base_xp) ? draft.total_base_xp : 0, draft.questions.length);

  return (
    <div className="creator-stack creator-recipe">
      <TextField
        label="Assignment title"
        value={draft.title}
        required
        maxLength={200}
        onChange={(title) => onChange({ ...draft, title })}
      />

      <div className="creator-two-columns">
        <SelectField label="Learning path" value={draft.path_id} required onChange={(path_id) => onChange({ ...draft, path_id })}>
          <option value="">Choose a learning path…</option>
          {paths.map((path) => (
            <option key={path.id} value={path.id}>
              {path.title}
            </option>
          ))}
        </SelectField>
        <NumberField
          label="Bonus XP (split across questions, given when all of a question's tests pass)"
          value={draft.total_base_xp}
          onChange={(total_base_xp) => onChange({ ...draft, total_base_xp })}
        />
      </div>

      <details className="creator-child" open={!draft.id}>
        <summary className="creator-summary">
          Grading environment · {LAB_TEMPLATES[env.template].label}
          {env.packages.length ? ` · ${env.packages.length} package(s)` : ""}
        </summary>
        <div className="creator-stack" style={{ marginTop: "0.75rem" }}>
          <p className="creator-help">
            Built once into a Docker image and reused for every test and submission. Scripts run as the user
            <code> student</code> inside <code>/home/student/work</code>, with no internet. Install the tools the
            scripts need and add any shared data files here; per-test files belong in each test&apos;s setup script.
          </p>

          <SelectField
            label="Base image"
            value={env.template}
            onChange={(template) => onChange({ ...draft, environment: { ...env, template: template as typeof env.template } })}
          >
            {LAB_TEMPLATE_IDS.map((id) => (
              <option key={id} value={id}>
                {LAB_TEMPLATES[id].label}
              </option>
            ))}
          </SelectField>

          <TextField
            label="Packages to install — one per line"
            multiline
            code
            rows={3}
            maxLength={6_000}
            value={env.packages.join("\n")}
            placeholder={"jq\ngawk"}
            onChange={(text) => onChange({ ...draft, environment: { ...env, packages: text.split("\n") } })}
          />

          <div className="creator-section-heading">
            <h4>Shared files</h4>
            <span className="creator-count">
              {env.files.length}/{HOMEWORK_LIMITS.envFiles}
            </span>
          </div>
          {env.files.map((file, fileIndex) => (
            <FileEditor
              key={fileIndex}
              file={file}
              index={fileIndex}
              length={env.files.length}
              userOptions={["root", "student"]}
              onChange={(updated) =>
                onChange({ ...draft, environment: { ...env, files: env.files.map((f, i) => (i === fileIndex ? updated : f)) } })
              }
              onRemove={() => onChange({ ...draft, environment: { ...env, files: env.files.filter((_, i) => i !== fileIndex) } })}
              onMove={(dir) => onChange({ ...draft, environment: { ...env, files: moveItem(env.files, fileIndex, dir) } })}
            />
          ))}
          <button
            type="button"
            className="secondary-button"
            disabled={env.files.length >= HOMEWORK_LIMITS.envFiles}
            onClick={() =>
              onChange({
                ...draft,
                environment: { ...env, files: [...env.files, { path: "/srv/data/sample.txt", owner: "root", mode: "644", content: "" }] },
              })
            }
          >
            <Plus size={14} aria-hidden="true" /> Add file
          </button>

          <TextField
            label="Build script (bash, as root, once at build time, internet available)"
            multiline
            code
            rows={4}
            maxLength={50_000}
            value={env.buildScript}
            placeholder={"# e.g. create shared folders or download data\nmkdir -p /srv/data"}
            onChange={(buildScript) => onChange({ ...draft, environment: { ...env, buildScript } })}
          />
        </div>
      </details>

      <div className="creator-section-heading">
        <div>
          <h3>Questions</h3>
          <p>Each question is submitted and graded separately.</p>
        </div>
        <span className="creator-count">
          {draft.questions.length}/{HOMEWORK_LIMITS.questions}
        </span>
      </div>

      {draft.questions.map((question, index) => (
        <QuestionEditor
          key={question.id}
          question={question}
          index={index}
          length={draft.questions.length}
          bonus={shares[index] ?? 0}
          tests={tests}
          onChange={(updated) => onChange({ ...draft, questions: draft.questions.map((q, i) => (i === index ? updated : q)) })}
          onRemove={() => onChange({ ...draft, questions: draft.questions.filter((_, i) => i !== index) })}
          onMove={(dir) => onChange({ ...draft, questions: moveItem(draft.questions, index, dir) })}
        />
      ))}

      <button
        type="button"
        className="secondary-button"
        disabled={draft.questions.length >= HOMEWORK_LIMITS.questions}
        onClick={() => onChange({ ...draft, questions: [...draft.questions, newQuestion()] })}
      >
        <Plus size={16} aria-hidden="true" />
        Add question
      </button>
    </div>
  );
}
