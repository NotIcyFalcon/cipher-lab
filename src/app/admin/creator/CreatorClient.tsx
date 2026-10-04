"use client";

import {
  useActionState,
  useEffect,
  useState,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Save, Trash2 } from "lucide-react";
import { saveCreatorAction, deleteCreatorAction, buildLabAction, prepareHomeworkAction } from "./actions";
import {
  TextField,
  NumberField,
  SelectField,
  ListControls,
  moveItem,
} from "./fields";
import LabRecipeEditor from "./LabRecipeEditor";
import HomeworkEditor, { newQuestion } from "./HomeworkEditor";
import { parseCompare, parseEnvironment } from "@/lib/homework-recipe";
import LabTerminal from "@/components/LabTerminal";
import { defaultRecipe, recipeSchema, type LabRecipe } from "@/lib/lab-recipe";
import { learningLabPoints } from "@/lib/creator-defaults";
import {
  creatorSections,
  type ActionState,
  type CreatorData,
  type CreatorDraft,
  type CreatorSection,
  type ChapterDraft,
  type EditorBlock,
  type LabRow,
  type HomeworkRow,
} from "./types";

const labels: Record<CreatorSection, string> = {
  topics: "Topics",
  paths: "Learning Paths",
  homework: "Homework",
  ctfs: "CTFs",
  universes: "CTF Universes",
  ctf: "CTF Challenges",
  labs: "Labs",
};

const singular: Record<CreatorSection, string> = {
  topics: "Topic",
  paths: "Learning Path",
  homework: "Homework",
  ctfs: "CTF",
  universes: "CTF Universe",
  ctf: "CTF Challenge",
  labs: "Lab",
};

const initialState: ActionState = {};

function newId() {
  return crypto.randomUUID();
}

function initialBlocks(json: string): EditorBlock[] {
  const decoded: unknown = JSON.parse(json);

  if (!Array.isArray(decoded)) {
    throw new Error("Expected a chapter block array.");
  }

  const blocks = decoded.map((item: unknown): EditorBlock => {
    if (!item || typeof item !== "object") {
      throw new Error("Invalid chapter block.");
    }

    const block = item as Record<string, unknown>;

    function stringField(name: string): string {
      const value = block[name];

      if (typeof value !== "string") {
        throw new Error(`Invalid block field: ${name}.`);
      }

      return value;
    }

    const id = stringField("id");

    switch (block.type) {
      case "note":
      case "tip":
        return {
          id,
          type: block.type,
          title: stringField("title"),
          body: stringField("body"),
        };

      case "code":
        return {
          id,
          type: "code",
          title: stringField("title"),
          code: stringField("code"),
          caption: stringField("caption"),
        };

      case "lab":
        return {
          id,
          type: "lab",
          labId: stringField("labId"),
          title: stringField("title"),
          objective: stringField("objective"),
          hint: stringField("hint"),
          points: learningLabPoints(block.points),
          completionCodeHash: typeof block.completionCodeHash === "string" ? block.completionCodeHash : "",
          completionAnswer: "",
        };

      case "quiz": {
        const options = block.options;

        if (
          !Array.isArray(options) ||
          !options.every((option) => typeof option === "string") ||
          typeof block.answer !== "number" ||
          !Number.isInteger(block.answer) ||
          block.answer < 0 ||
          block.answer >= options.length
        ) {
          throw new Error("Invalid Quick Check.");
        }

        return {
          id,
          type: "quiz",
          question: stringField("question"),
          options: options as string[],
          answer: block.answer,
          explanation: stringField("explanation"),
        };
      }

      default:
        throw new Error(
          `Unsupported block type: ${String(block.type)}. ` +
            "This editor will not overwrite unsupported content.",
        );
    }
  });

  if (new Set(blocks.map((block) => block.id)).size !== blocks.length) {
    throw new Error("Chapter blocks contain duplicate IDs.");
  }

  return blocks;
}

function stringArray(json: string | null): string[] {
  if (!json) return [];
  const value: unknown = JSON.parse(json);
  if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) {
    throw new Error("Expected a JSON array of strings.");
  }
  return value;
}


type DraftDefaults = {
  pathId: string;
  topicId: string;
  ctfId: string;
  universeId: string;
};

function makeDraft(
  section: CreatorSection,
  data: CreatorData,
  editId: string,
  { pathId, topicId, ctfId, universeId }: DraftDefaults,
): CreatorDraft {
  switch (section) {
    case "topics": {
      const row = data.topics.find((item) => item.id === editId);

      return {
        entity: "topics",
        id: row?.id ?? "",
        name: row?.name ?? "",
        description: row?.description ?? "",
        type: row?.type ?? "path",
      };
    }

    case "paths": {
      const row = data.paths.find((item) => item.id === editId);

      return {
        entity: "paths",
        id: row?.id ?? "",
        topic_id: row?.topic_id ?? topicId,
        title: row?.title ?? "",
        difficulty: row?.difficulty ?? "",
        time_days: row?.time_days ?? 1,
        chapters: data.chapters
          .filter((chapter) => chapter.path_id === row?.id)
          .map((chapter) => ({
            id: chapter.id,
            title: chapter.title,
            description: chapter.description ?? "",
            reading_points: chapter.reading_points,
            blocks: initialBlocks(chapter.content_json),
            objectives: stringArray(chapter.objectives_json),
          })),
      };
    }

    case "homework": {
      const row = data.homework.find((item) => item.id === editId);

      return {
        entity: "homework",
        id: row?.id ?? "",
        path_id: row?.path_id ?? pathId,
        title: row?.title ?? "Assignment",
        total_base_xp: row?.total_base_xp ?? 0,
        environment: parseEnvironment(row?.environment_json),
        questions: row
          ? (data.questions ?? [])
              .filter((question) => question.homework_id === row.id)
              .sort((a, b) => a.sequence_order - b.sequence_order)
              .map((question) => ({
                id: question.id,
                title: question.title,
                question_markdown: question.question_markdown,
                standard_solution_script: question.standard_solution_script ?? "",
                time_limit_sec: question.time_limit_sec,
                compare: parseCompare(question.compare_json),
                tests: data.tests
                  .filter((test) => test.question_id === question.id)
                  .sort((a, b) => a.sequence_order - b.sequence_order)
                  .map((test) => ({
                    id: test.id,
                    setup_script: test.setup_script ?? "",
                    args: test.args ?? "",
                    stdin: test.stdin ?? "",
                    xp_reward: test.xp_reward,
                    is_hidden: test.is_hidden === 1,
                  })),
              }))
          : [newQuestion()],
      };
    }

    case "ctfs": {
      const row = data.ctfs.find((item) => item.id === editId);
      return {
        entity: "ctfs",
        id: row?.id ?? "",
        topic_id: row?.topic_id ?? topicId,
        name: row?.name ?? "",
        description: row?.description ?? "",
        difficulty: row?.difficulty ?? "",
        suggested_path_ids: stringArray(row?.suggested_paths_json ?? null),
      };
    }

    case "universes": {
      const row = data.universes.find((item) => item.id === editId);
      return {
        entity: "universes",
        id: row?.id ?? "",
        ctf_id: row?.ctf_id ?? ctfId,
        name: row?.name ?? "",
        description: row?.description ?? "",
      };
    }

    case "ctf": {
      const row = data.challenges.find((item) => item.id === editId);

      return {
        entity: "ctf",
        id: row?.id ?? "",
        universe_id: row?.universe_id ?? universeId,
        title: row?.title ?? "",
        description: row?.description ?? "",
        points: row?.points ?? 100,
        difficulty: row?.difficulty ?? "",
        lab_id: row?.lab_id ?? "",
        flag: "",
        hints: data.hints
          .filter((hint) => hint.challenge_id === row?.id)
          .map((hint) => ({
            id: hint.id,
            text: hint.text,
            penalty: hint.penalty,
          })),
      };
    }

    case "labs": {
      const row = data.labs.find((item) => item.id === editId);

      let recipe: LabRecipe;
      try {
        recipe = row ? recipeSchema.parse(JSON.parse(row.recipe_json)) : defaultRecipe();
      } catch {
        // A hand-edited or future recipe that this editor cannot represent.
        recipe = defaultRecipe();
      }

      return {
        entity: "labs",
        id: row?.id ?? "",
        name: row?.name ?? "",
        description: row?.description ?? "",
        recipe,
      };
    }
  }
}


function LabSelect({
  labs,
  value,
  onChange,
  required = false,
}: {
  labs: LabRow[];
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  return (
    <SelectField
      label="Lab assignment"
      value={value}
      onChange={onChange}
      required={required}
    >
      <option value="">{required ? "Choose a lab…" : "No lab assigned"}</option>
      {labs.map((lab) => (
        <option key={lab.id} value={lab.id}>
          {lab.name || "Unnamed lab"}
        </option>
      ))}
    </SelectField>
  );
}


function blockLabel(block: EditorBlock) {
  switch (block.type) {
    case "note":
      return "Game Plan / Note";
    case "tip":
      return "Tip";
    case "code":
      return "Bash Script";
    case "quiz":
      return "Quick Check";
    case "lab":
      return "Lab";
  }
}

function createBlock(type: "note" | "code" | "quiz" | "lab"): EditorBlock {
  const id = newId();

  switch (type) {
    case "note":
      return {
        id,
        type,
        title: "Game Plan",
        body: "",
      };

    case "code":
      return {
        id,
        type,
        title: "Bash Script",
        code: "",
        caption: "",
      };

    case "quiz":
      return {
        id,
        type,
        question: "",
        options: ["", ""],
        answer: 0,
        explanation: "",
      };

    case "lab":
      return {
        id,
        type,
        labId: "",
        title: "Hands-on Lab",
        objective: "",
        hint: "",
        points: 50,
        completionCodeHash: "",
        completionAnswer: "",
      };
  }
}

function BlockFields({
  block,
  labs,
  onChange,
}: {
  block: EditorBlock;
  labs: LabRow[];
  onChange: (block: EditorBlock) => void;
}) {
  switch (block.type) {
    case "note":
    case "tip":
      return (
        <>
          <TextField
            label="Heading"
            value={block.title}
            required
            onChange={(title) => onChange({ ...block, title })}
          />
          <TextField
            label="Content"
            value={block.body}
            required
            multiline
            maxLength={50_000}
            rows={6}
            onChange={(body) => onChange({ ...block, body })}
          />
        </>
      );

    case "code":
      return (
        <>
          <TextField
            label="Custom header"
            value={block.title}
            required
            onChange={(title) => onChange({ ...block, title })}
          />
          <TextField
            label="Bash script"
            value={block.code}
            required
            multiline
            code
            rows={8}
            maxLength={50_000}
            placeholder={"#!/usr/bin/env bash\n"}
            onChange={(code) => onChange({ ...block, code })}
          />
          <TextField
            label="Custom footer / caption"
            value={block.caption}
            multiline
            rows={3}
            maxLength={10_000}
            onChange={(caption) => onChange({ ...block, caption })}
          />
        </>
      );

    case "quiz":
      return (
        <>
          <TextField
            label="Question"
            value={block.question}
            required
            maxLength={2_000}
            onChange={(question) => onChange({ ...block, question })}
          />

          <div className="creator-stack">
            {block.options.map((option, index) => (
              <div className="creator-option-row" key={index}>
                <TextField
                  label={`Option ${index + 1}`}
                  value={option}
                  required
                  maxLength={1_000}
                  onChange={(value) =>
                    onChange({
                      ...block,
                      options: block.options.map((item, position) =>
                        position === index ? value : item,
                      ),
                    })
                  }
                />

                <button
                  type="button"
                  className="creator-icon-button creator-danger-text"
                  disabled={block.options.length <= 2}
                  aria-label={`Remove option ${index + 1}`}
                  onClick={() => {
                    const answer =
                      block.answer === index
                        ? 0
                        : block.answer > index
                          ? block.answer - 1
                          : block.answer;

                    onChange({
                      ...block,
                      answer,
                      options: block.options.filter(
                        (_, position) => position !== index,
                      ),
                    });
                  }}
                >
                  <Trash2 size={16} aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            className="secondary-button"
            disabled={block.options.length >= 10}
            onClick={() =>
              onChange({ ...block, options: [...block.options, ""] })
            }
          >
            Add option
          </button>

          <SelectField
            label="Correct answer"
            value={String(block.answer)}
            onChange={(answer) =>
              onChange({ ...block, answer: Number(answer) })
            }
          >
            {block.options.map((option, index) => (
              <option key={index} value={index}>
                Option {index + 1}: {option || "(empty)"}
              </option>
            ))}
          </SelectField>

          <TextField
            label="Explanation"
            value={block.explanation}
            multiline
            maxLength={10_000}
            onChange={(explanation) =>
              onChange({ ...block, explanation })
            }
          />
        </>
      );

    case "lab":
      return (
        <>
          <TextField
            label="Lab heading"
            value={block.title}
            required
            onChange={(title) => onChange({ ...block, title })}
          />
          <LabSelect
            labs={labs}
            value={block.labId}
            required
            onChange={(labId) => onChange({ ...block, labId })}
          />
          <NumberField
            label="Base points"
            value={block.points}
            onChange={(points) => onChange({ ...block, points })}
          />
          <TextField
            label="Objective"
            value={block.objective}
            required
            multiline
            maxLength={10_000}
            onChange={(objective) => onChange({ ...block, objective })}
          />
          <TextField
            label="Hint"
            value={block.hint}
            multiline
            maxLength={10_000}
            onChange={(hint) => onChange({ ...block, hint })}
          />
          <TextField
            label="Completion Answer (Flag)"
            value={block.completionAnswer ?? ""}
            placeholder="Type the raw answer (will be securely hashed on save)"
            onChange={(completionAnswer) => onChange({ ...block, completionAnswer })}
          />
        </>
      );
  }
}

function ChapterFields({
  chapter,
  labs,
  onChange,
}: {
  chapter: ChapterDraft;
  labs: LabRow[];
  onChange: (chapter: ChapterDraft) => void;
}) {
  return (
    <div className="creator-stack">
      <TextField
        label="Chapter title"
        value={chapter.title}
        required
        onChange={(title) => onChange({ ...chapter, title })}
      />

      <TextField
        label="Chapter description"
        value={chapter.description}
        multiline
        rows={3}
        maxLength={10_000}
        onChange={(description) => onChange({ ...chapter, description })}
      />

      <div className="creator-section-heading" style={{ marginTop: "1rem" }}>
        <h4>Chapter Goals</h4>
        <span className="creator-count">{chapter.objectives.length}/10</span>
      </div>

      <div className="creator-stack">
        {chapter.objectives.map((objective, index) => (
          <div className="creator-option-row" key={index}>
            <TextField
              label={`Goal ${index + 1}`}
              value={objective}
              required
              maxLength={1_000}
              onChange={(value) =>
                onChange({
                  ...chapter,
                  objectives: chapter.objectives.map((item, position) =>
                    position === index ? value : item,
                  ),
                })
              }
            />

            <button
              type="button"
              className="creator-icon-button creator-danger-text"
              aria-label={`Remove goal ${index + 1}`}
              onClick={() => {
                onChange({
                  ...chapter,
                  objectives: chapter.objectives.filter(
                    (_, position) => position !== index,
                  ),
                });
              }}
            >
              <Trash2 size={16} aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        className="secondary-button"
        disabled={chapter.objectives.length >= 10}
        onClick={() =>
          onChange({ ...chapter, objectives: [...chapter.objectives, ""] })
        }
      >
        Add goal
      </button>

      <NumberField
        label="Reading points"
        value={chapter.reading_points}
        onChange={(reading_points) =>
          onChange({ ...chapter, reading_points })
        }
      />

      <div className="creator-section-heading">
        <div>
          <h4>Content blocks</h4>
          <p>Blocks appear in the order shown below.</p>
        </div>
        <span className="creator-count">{chapter.blocks.length}/100</span>
      </div>

      {chapter.blocks.map((block, index) => (
        <section className="creator-block" key={block.id}>
          <div className="creator-section-heading">
            <h4>
              {index + 1}. {blockLabel(block)}
            </h4>
            <ListControls
              label={`block ${index + 1}`}
              index={index}
              length={chapter.blocks.length}
              onMove={(direction) =>
                onChange({
                  ...chapter,
                  blocks: moveItem(chapter.blocks, index, direction),
                })
              }
              onRemove={() =>
                onChange({
                  ...chapter,
                  blocks: chapter.blocks.filter(
                    (item) => item.id !== block.id,
                  ),
                })
              }
            />
          </div>

          <div className="creator-stack">
            <BlockFields
              block={block}
              labs={labs}
              onChange={(updated) =>
                onChange({
                  ...chapter,
                  blocks: chapter.blocks.map((item) =>
                    item.id === block.id ? updated : item,
                  ),
                })
              }
            />
          </div>
        </section>
      ))}

      <div className="creator-button-row">
        {(
          [
            ["note", "Game Plan"],
            ["code", "Bash Script"],
            ["quiz", "Quick Check"],
            ["lab", "Lab"],
          ] as const
        ).map(([type, label]) => (
          <button
            key={type}
            type="button"
            className="secondary-button"
            disabled={chapter.blocks.length >= 100}
            onClick={() =>
              onChange({
                ...chapter,
                blocks: [...chapter.blocks, createBlock(type)],
              })
            }
          >
            <Plus size={14} aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

function DraftFields({
  draft,
  data,
  onChange,
}: {
  draft: CreatorDraft;
  data: CreatorData;
  onChange: (draft: CreatorDraft) => void;
}) {
  switch (draft.entity) {
    case "topics":
      return (
        <>
          <TextField
            label="Topic name"
            value={draft.name}
            required
            onChange={(name) => onChange({ ...draft, name })}
          />

          <SelectField
            label="Topic type"
            value={draft.type}
            onChange={(type) =>
              onChange({
                ...draft,
                type: type as "path" | "ctf",
              })
            }
          >
            <option value="path">Learning paths</option>
            <option value="ctf">CTF</option>
          </SelectField>

          <TextField
            label="Description"
            value={draft.description}
            multiline
            maxLength={10_000}
            onChange={(description) => onChange({ ...draft, description })}
          />

          <p className="creator-help">
            Homework belongs to a learning path. Paths must be organized under
            Learning Path topics. CTF challenges require CTF topics.
          </p>
        </>
      );

    case "paths":
      return (
        <>
          <TextField
            label="Path title"
            value={draft.title}
            required
            onChange={(title) => onChange({ ...draft, title })}
          />

          <SelectField
            label="Topic"
            value={draft.topic_id}
            required
            onChange={(topic_id) => onChange({ ...draft, topic_id })}
          >
            <option value="">Choose a topic…</option>
            {data.topics
              .filter((topic) => topic.type !== "ctf")
              .map((topic) => (
                <option key={topic.id} value={topic.id}>
                  {topic.name} ({topic.type})
                </option>
              ))}
          </SelectField>

          <div className="creator-two-columns">
            <TextField
              label="Difficulty"
              value={draft.difficulty}
              maxLength={80}
              placeholder="Beginner, Intermediate, Advanced…"
              onChange={(difficulty) => onChange({ ...draft, difficulty })}
            />
            <NumberField
              label="Expected time (days)"
              value={draft.time_days}
              max={3_650}
              onChange={(time_days) => onChange({ ...draft, time_days })}
            />
          </div>

          <div className="creator-section-heading">
            <div>
              <h3>Chapters</h3>
              <p>Save the path to persist chapter and block changes.</p>
            </div>
            <span className="creator-count">{draft.chapters.length}/50</span>
          </div>

          {draft.chapters.map((chapter, index) => (
            <section className="creator-child" key={chapter.id}>
              <div className="creator-section-heading">
                <h3>Chapter {index + 1}</h3>
                <ListControls
                  label={`chapter ${index + 1}`}
                  index={index}
                  length={draft.chapters.length}
                  onMove={(direction) =>
                    onChange({
                      ...draft,
                      chapters: moveItem(draft.chapters, index, direction),
                    })
                  }
                  onRemove={() =>
                    onChange({
                      ...draft,
                      chapters: draft.chapters.filter(
                        (item) => item.id !== chapter.id,
                      ),
                    })
                  }
                />
              </div>

              <ChapterFields
                chapter={chapter}
                labs={data.labs}
                onChange={(updated) =>
                  onChange({
                    ...draft,
                    chapters: draft.chapters.map((item) =>
                      item.id === chapter.id ? updated : item,
                    ),
                  })
                }
              />
            </section>
          ))}

          <button
            type="button"
            className="secondary-button"
            disabled={draft.chapters.length >= 50}
            onClick={() =>
              onChange({
                ...draft,
                chapters: [
                  ...draft.chapters,
                  {
                    id: newId(),
                    title: "",
                    description: "",
                    reading_points: 100,
                    blocks: [],
                    objectives: [],
                  },
                ],
              })
            }
          >
            <Plus size={16} aria-hidden="true" />
            Add chapter
          </button>

          {!draft.id && (
            <p className="creator-help">
              Save this path before creating its homework.
            </p>
          )}
        </>
      );

    case "homework":
      return (
        <>
          <HomeworkEditor draft={draft} paths={data.paths} tests={data.tests} onChange={onChange} />
          <p className="creator-help">
            Saving prepares the homework automatically: the grading environment is built (only when it changed)
            and your reference solution runs once on every test to record the expected results. Learners can
            submit once preparation succeeds.
          </p>
        </>
      );

    case "ctfs":
      return (
        <>
          <TextField
            label="CTF definition name"
            value={draft.name}
            required
            onChange={(name) => onChange({ ...draft, name })}
          />

          <SelectField
            label="CTF topic"
            value={draft.topic_id}
            required
            onChange={(topic_id) => onChange({ ...draft, topic_id })}
          >
            <option value="">Choose a CTF topic…</option>
            {data.topics
              .filter((topic) => topic.type === "ctf")
              .map((topic) => (
                <option key={topic.id} value={topic.id}>
                  {topic.name}
                </option>
              ))}
          </SelectField>

          <TextField
            label="Description"
            value={draft.description}
            multiline
            rows={4}
            maxLength={10_000}
            onChange={(description) => onChange({ ...draft, description })}
          />

          <TextField
            label="Difficulty"
            value={draft.difficulty}
            maxLength={80}
            placeholder="Beginner, Intermediate, Advanced…"
            onChange={(difficulty) => onChange({ ...draft, difficulty })}
          />

          <div className="creator-section-heading" style={{ marginTop: "1rem" }}>
            <div>
              <h3>Recommended Learning Paths</h3>
            </div>
            <span className="creator-count">{draft.suggested_path_ids.length}/10</span>
          </div>

          <div className="creator-stack">
            {draft.suggested_path_ids.map((pathId, index) => (
              <div className="creator-option-row" key={index}>
                <SelectField
                  label={`Path ${index + 1}`}
                  value={pathId}
                  required
                  onChange={(value) =>
                    onChange({
                      ...draft,
                      suggested_path_ids: draft.suggested_path_ids.map((item, position) =>
                        position === index ? value : item,
                      ),
                    })
                  }
                >
                  <option value="">Choose a path…</option>
                  {data.paths.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </SelectField>
                <button
                  type="button"
                  className="creator-icon-button creator-danger-text"
                  aria-label={`Remove path ${index + 1}`}
                  onClick={() => {
                    onChange({
                      ...draft,
                      suggested_path_ids: draft.suggested_path_ids.filter(
                        (_, position) => position !== index,
                      ),
                    });
                  }}
                >
                  <Trash2 size={16} aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
          
          <button
            type="button"
            className="secondary-button"
            disabled={draft.suggested_path_ids.length >= 10}
            onClick={() =>
              onChange({ ...draft, suggested_path_ids: [...draft.suggested_path_ids, ""] })
            }
          >
            Add recommended path
          </button>
        </>
      );

    case "universes":
      return (
        <>
          <TextField
            label="Universe name"
            value={draft.name}
            required
            onChange={(name) => onChange({ ...draft, name })}
          />

          <SelectField
            label="CTF definition"
            value={draft.ctf_id}
            required
            onChange={(ctf_id) => onChange({ ...draft, ctf_id })}
          >
            <option value="">Choose a CTF definition…</option>
            {data.ctfs.map((ctf) => (
              <option key={ctf.id} value={ctf.id}>
                {ctf.name}
              </option>
            ))}
          </SelectField>

          <TextField
            label="Description"
            value={draft.description}
            multiline
            rows={4}
            maxLength={10_000}
            onChange={(description) => onChange({ ...draft, description })}
          />
        </>
      );

    case "ctf":
      return (
        <>
          <TextField
            label="Challenge title"
            value={draft.title}
            required
            onChange={(title) => onChange({ ...draft, title })}
          />

          <SelectField
            label="Universe"
            value={draft.universe_id}
            required
            onChange={(universe_id) => onChange({ ...draft, universe_id })}
          >
            <option value="">Choose a universe…</option>
            {data.universes.map((universe) => (
              <option key={universe.id} value={universe.id}>
                {universe.name} (CTF:{" "}
                {data.ctfs.find((ctf) => ctf.id === universe.ctf_id)?.name})
              </option>
            ))}
          </SelectField>

          <TextField
            label="Description"
            value={draft.description}
            multiline
            rows={8}
            maxLength={50_000}
            onChange={(description) => onChange({ ...draft, description })}
          />

          <div className="creator-two-columns">
            <NumberField
              label="Base points"
              value={draft.points}
              onChange={(points) => onChange({ ...draft, points })}
            />
            <TextField
              label="Difficulty"
              value={draft.difficulty}
              maxLength={80}
              placeholder="Beginner, Intermediate, Advanced…"
              onChange={(difficulty) => onChange({ ...draft, difficulty })}
            />
          </div>

          <LabSelect
            labs={data.labs}
            value={draft.lab_id}
            onChange={(lab_id) => onChange({ ...draft, lab_id })}
          />

          <TextField
            label="Flag"
            value={draft.flag}
            placeholder="Enter the raw flag text"
            maxLength={1024}
            onChange={(flag) => onChange({ ...draft, flag })}
          />
          <p className="creator-help">
            The existing flag is stored securely and cannot be displayed. Enter a new
            raw flag only if you want to replace it.
          </p>

          <div className="creator-section-heading">
            <div>
              <h3>Progressive hints</h3>
              <p>Hints are saved in the displayed order.</p>
            </div>
            <span className="creator-count">{draft.hints.length}/50</span>
          </div>

          {draft.hints.map((hint, index) => (
            <section className="creator-child" key={hint.id}>
              <div className="creator-section-heading">
                <h3>Hint {index + 1}</h3>
                <ListControls
                  label={`hint ${index + 1}`}
                  index={index}
                  length={draft.hints.length}
                  onMove={(direction) =>
                    onChange({
                      ...draft,
                      hints: moveItem(draft.hints, index, direction),
                    })
                  }
                  onRemove={() =>
                    onChange({
                      ...draft,
                      hints: draft.hints.filter((item) => item.id !== hint.id),
                    })
                  }
                />
              </div>

              <div className="creator-stack">
                <TextField
                  label="Hint text"
                  value={hint.text}
                  required
                  multiline
                  maxLength={10_000}
                  onChange={(text) =>
                    onChange({
                      ...draft,
                      hints: draft.hints.map((item) =>
                        item.id === hint.id ? { ...item, text } : item,
                      ),
                    })
                  }
                />

                <NumberField
                  label="XP penalty"
                  value={hint.penalty}
                  onChange={(penalty) =>
                    onChange({
                      ...draft,
                      hints: draft.hints.map((item) =>
                        item.id === hint.id ? { ...item, penalty } : item,
                      ),
                    })
                  }
                />
              </div>
            </section>
          ))}

          <button
            type="button"
            className="secondary-button"
            disabled={draft.hints.length >= 50}
            onClick={() =>
              onChange({
                ...draft,
                hints: [
                  ...draft.hints,
                  { id: newId(), text: "", penalty: 10 },
                ],
              })
            }
          >
            <Plus size={16} aria-hidden="true" />
            Add hint
          </button>
        </>
      );

    case "labs":
      return (
        <>
          <TextField
            label="Lab name (for Creator reference)"
            value={draft.name}
            required
            maxLength={200}
            onChange={(name) => onChange({ ...draft, name })}
          />

          <TextField
            label="Description (admin note)"
            value={draft.description}
            multiline
            rows={2}
            maxLength={2_000}
            onChange={(description) => onChange({ ...draft, description })}
          />

          <LabRecipeEditor
            recipe={draft.recipe}
            onChange={(recipe) => onChange({ ...draft, recipe })}
          />

          <p className="creator-help">
            Saving builds the lab automatically (one Docker image per machine).
            Learners can start it once a build has succeeded. Build status, the
            log and a test terminal appear below after saving.
          </p>
        </>
      );
  }
}

function Editor({
  initialDraft,
  data,
}: {
  initialDraft: CreatorDraft;
  data: CreatorData;
}) {
  const [draft, setDraft] = useState(initialDraft);
  const [state, formAction, pending] = useActionState(
    saveCreatorAction,
    initialState,
  );
  const [dirty, setDirty] = useState(false);

  const labRow =
    draft.entity === "labs" && draft.id
      ? data.labs.find((lab) => lab.id === draft.id)
      : undefined;

  const homeworkRow =
    draft.entity === "homework" && draft.id
      ? data.homework.find((hw) => hw.id === draft.id)
      : undefined;

  return (
    <>
      <form action={formAction} className="creator-editor">
        <input type="hidden" name="payload" value={JSON.stringify(draft)} />

        <div className="creator-section-heading">
          <div>
            <span className="creator-kicker">
              {draft.id ? "EDIT CONTENT" : "NEW CONTENT"}
            </span>
            <h2>
              {draft.id ? "Edit" : "Create"} {singular[draft.entity]}
            </h2>
            {draft.id && <p className="creator-record-id">ID: {draft.id}</p>}
          </div>
          {dirty && <span className="creator-unsaved">Unsaved changes</span>}
        </div>

        <fieldset className="creator-fieldset" disabled={pending}>
          <div className="creator-stack">
            <DraftFields
              draft={draft}
              data={data}
              onChange={(updated) => {
                setDraft(updated);
                setDirty(true);
              }}
            />
          </div>
        </fieldset>

        {state.error && (
          <div className="creator-message creator-error" role="alert">
            {state.error}
          </div>
        )}

        <div className="creator-save-bar">
          <p>
            {pending
              ? "Saving changes…"
              : "Changes are applied only when you save. Leaving discards unsaved edits."}
          </p>

          <button className="primary-button" type="submit" disabled={pending}>
            <Save size={16} aria-hidden="true" />
            {pending ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>

      {draft.entity === "homework" && homeworkRow && (
        <HomeworkPrepPanel homework={homeworkRow} dirty={dirty} />
      )}

      {draft.entity === "labs" && labRow && (
        <LabBuildPanel lab={labRow} dirty={dirty} />
      )}
    </>
  );
}

function HomeworkPrepPanel({ homework, dirty }: { homework: HomeworkRow; dirty: boolean }) {
  const [state, action, pending] = useActionState(prepareHomeworkAction, initialState);
  const router = useRouter();

  const inProgress = homework.prep_status === "queued" || homework.prep_status === "preparing";
  const ready =
    homework.prep_status === "ready" &&
    homework.prepared_hash !== null &&
    homework.prepared_hash === homework.definition_hash;

  // While preparation runs, refresh so status, log and reference results update.
  useEffect(() => {
    if (!inProgress) return;
    const timer = setInterval(() => router.refresh(), 3_000);
    return () => clearInterval(timer);
  }, [inProgress, router]);

  const label = ready
    ? "Ready for submissions"
    : homework.prep_status === "queued"
      ? "Queued…"
      : homework.prep_status === "preparing"
        ? "Preparing…"
        : homework.prep_status === "failed"
          ? "Preparation failed"
          : "Not prepared yet";

  const tone = ready ? "ready" : homework.prep_status === "preparing" ? "building" : homework.prep_status;

  return (
    <section className={`creator-build-panel is-${tone}`}>
      <div className="creator-section-heading">
        <div>
          <span className="creator-kicker">GRADER</span>
          <h3>Status: {label}</h3>
        </div>
        <form action={action}>
          <input type="hidden" name="id" value={homework.id} />
          <button type="submit" className="secondary-button" disabled={pending || inProgress}>
            {inProgress ? "Preparing…" : "Prepare again"}
          </button>
        </form>
      </div>

      {dirty && (
        <p className="creator-help">You have unsaved changes. Saving prepares the homework again if needed.</p>
      )}

      {state.error && (
        <p className="creator-inline-error" role="alert">{state.error}</p>
      )}

      {inProgress && (
        <p className="creator-help">
          Building the grading environment (only when it changed) and running your reference solution on every
          test. This page refreshes automatically.
        </p>
      )}

      {ready && homework.prepared_at && (
        <p className="creator-help">
          Expected results recorded {new Date(homework.prepared_at).toLocaleString()}. Each test above shows the
          reference solution&apos;s result.
        </p>
      )}

      {homework.prep_status === "failed" && homework.prep_error && (
        <pre className="creator-inline-error" style={{ whiteSpace: "pre-wrap" }}>{homework.prep_error}</pre>
      )}

      {homework.prep_log && (
        <details className="creator-build-log" open={inProgress || homework.prep_status === "failed"}>
          <summary>Preparation log</summary>
          <pre>{homework.prep_log}</pre>
        </details>
      )}
    </section>
  );
}

function LabBuildPanel({ lab, dirty }: { lab: LabRow; dirty: boolean }) {
  const [state, action, pending] = useActionState(buildLabAction, initialState);
  const router = useRouter();

  const inProgress = lab.build_status === "queued" || lab.build_status === "building";

  // While a build runs, refresh the page so status and log update.
  useEffect(() => {
    if (!inProgress) return;
    const timer = setInterval(() => router.refresh(), 3_000);
    return () => clearInterval(timer);
  }, [inProgress, router]);

  const statusLabel: Record<LabRow["build_status"], string> = {
    draft: "Not built yet",
    queued: "Queued…",
    building: "Building…",
    ready: "Ready",
    failed: "Build failed",
  };

  return (
    <section className={`creator-build-panel is-${lab.build_status}`}>
      <div className="creator-section-heading">
        <div>
          <span className="creator-kicker">LAB IMAGE</span>
          <h3>Build status: {statusLabel[lab.build_status]}</h3>
        </div>
        <form action={action}>
          <input type="hidden" name="id" value={lab.id} />
          <button type="submit" className="primary-button" disabled={pending || inProgress}>
            {inProgress ? "Building…" : lab.build_status === "ready" ? "Rebuild lab" : "Build lab"}
          </button>
        </form>
      </div>

      {dirty && (
        <p className="creator-help">
          You have unsaved changes. Saving starts a new build automatically.
        </p>
      )}

      {state.error && (
        <p className="creator-inline-error" role="alert">{state.error}</p>
      )}

      {inProgress && (
        <p className="creator-help">
          Building can take a few minutes (the first build also downloads the
          base image). The status and log refresh automatically.
          {lab.current_build_id != null && " Learners keep using the previous build until this one finishes."}
        </p>
      )}

      {lab.build_status === "ready" && !inProgress && (
        <p className="creator-help">
          This lab is built. Learners get a fresh copy of it every time they start it.
        </p>
      )}

      {lab.build_status === "failed" && (
        <p className="creator-inline-error">
          {lab.last_build_error || "The last build failed."}
          {lab.current_build_id != null && " Learners still get the previous successful build."}
        </p>
      )}

      {lab.last_build_log && (
        <details className="creator-build-log" open={inProgress || lab.build_status === "failed"}>
          <summary>Build log</summary>
          <pre>{lab.last_build_log}</pre>
        </details>
      )}

      {lab.current_build_id != null && (
        <details className="creator-build-log">
          <summary>Test this lab</summary>
          <p className="creator-help">
            Opens the lab exactly as a learner gets it (command policy included).
          </p>
          <LabTerminal labId={lab.id} title={lab.name || "Lab test"} kicker="ADMIN TEST" points={null} />
        </details>
      )}
    </section>
  );
}

function DeleteButton({
  section,
  id,
  title,
}: {
  section: CreatorSection;
  id: string;
  title: string;
}) {
  const [state, action, pending] = useActionState(
    deleteCreatorAction,
    initialState,
  );

  const warning =
    section === "topics"
      ? "Deleting this topic also deletes its paths, chapters, homework, CTF definitions, universes, challenges, test cases, and hints through cascading relationships."
      : section === "paths"
        ? "Deleting this path also deletes its chapters, homework, and homework test cases."
        : section === "homework"
          ? "Deleting this homework also deletes its test cases."
          : section === "ctfs"
            ? "Deleting this CTF definition also deletes its universes, challenges, and hints."
            : section === "universes"
              ? "Deleting this universe also deletes its challenges and hints."
              : section === "ctf"
                ? "Deleting this challenge also deletes its hints."
                : "Labs can only be deleted when no CMS content uses them.";

  return (
    <form
      action={action}
      className="creator-delete-form"
      onSubmit={(event) => {
        if (!window.confirm(`Delete "${title}"?\n\n${warning}\n\nThis cannot be undone.`)) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="entity" value={section} />
      <input type="hidden" name="id" value={id} />

      <button
        type="submit"
        className="creator-icon-button creator-danger-text"
        disabled={pending}
        aria-label={`Delete ${title}`}
      >
        <Trash2 size={16} aria-hidden="true" />
      </button>

      {state.error && (
        <p className="creator-inline-error" role="alert">
          {state.error}
        </p>
      )}
    </form>
  );
}

function catalogItems(section: CreatorSection, data: CreatorData) {
  switch (section) {
    case "topics":
      return data.topics.map((topic) => ({
        id: topic.id,
        title: topic.name,
        detail: topic.type.toUpperCase(),
      }));

    case "paths":
      return data.paths.map((path) => ({
        id: path.id,
        title: path.title,
        detail: [
          data.topics.find((topic) => topic.id === path.topic_id)?.name,
          `${data.chapters.filter((chapter) => chapter.path_id === path.id).length} chapters`,
        ]
          .filter(Boolean)
          .join(" · "),
      }));

    case "homework":
      return data.homework.map((homework) => ({
        id: homework.id,
        title: homework.title || "Untitled assignment",
        detail: [
          data.paths.find((path) => path.id === homework.path_id)?.title,
          {
            draft: "Not prepared",
            queued: "Preparing",
            preparing: "Preparing",
            ready: homework.prepared_hash !== null && homework.prepared_hash === homework.definition_hash ? "Ready" : "Needs preparing",
            failed: "Preparation failed",
          }[homework.prep_status],
        ]
          .filter(Boolean)
          .join(" · "),
      }));

    case "ctfs":
      return data.ctfs.map((ctf) => ({
        id: ctf.id,
        title: ctf.name,
        detail: [
          data.topics.find((topic) => topic.id === ctf.topic_id)?.name,
          `${data.universes.filter((universe) => universe.ctf_id === ctf.id).length} universes`,
        ]
          .filter(Boolean)
          .join(" · "),
      }));

    case "universes":
      return data.universes.map((universe) => ({
        id: universe.id,
        title: universe.name,
        detail: [
          data.ctfs.find((ctf) => ctf.id === universe.ctf_id)?.name,
          `${data.challenges.filter((challenge) => challenge.universe_id === universe.id).length} challenges`,
        ]
          .filter(Boolean)
          .join(" · "),
      }));

    case "ctf":
      return data.challenges.map((challenge) => ({
        id: challenge.id,
        title: challenge.title,
        detail: [
          data.universes.find((universe) => universe.id === challenge.universe_id)?.name,
          `${challenge.points} points`,
          challenge.difficulty || "Unspecified difficulty",
          challenge.flag_hash ? null : "No flag set",
        ]
          .filter(Boolean)
          .join(" · "),
      }));

    case "labs":
      return data.labs.map((lab) => {
        const machineCount = (() => {
          try {
            return (JSON.parse(lab.recipe_json).machines ?? []).length as number;
          } catch {
            return 0;
          }
        })();
        const status: Record<LabRow["build_status"], string> = {
          draft: "Not built",
          queued: "Queued",
          building: "Building",
          ready: "Ready",
          failed: "Build failed",
        };
        return {
          id: lab.id,
          title: lab.name || "Unnamed lab",
          detail: `${status[lab.build_status]} · ${machineCount} ${machineCount === 1 ? "machine" : "machines"}`,
        };
      });
  }
}

export default function CreatorClient({
  section,
  data,
  editId,
  creating,
  pathId,
  topicId,
  ctfId,
  universeId,
  saved,
  deleted,
}: {
  section: CreatorSection;
  data: CreatorData;
  editId: string;
  creating: boolean;
  pathId: string;
  topicId: string;
  ctfId: string;
  universeId: string;
  saved: boolean;
  deleted: boolean;
}) {
  const showEditor = creating || Boolean(editId);

  const [initial] = useState<{
    draft: CreatorDraft | null;
    error: string;
  }>(() => {
    if (!showEditor) return { draft: null, error: "" };

    try {
      return {
        draft: makeDraft(section, data, editId, {
          pathId,
          topicId,
          ctfId,
          universeId,
        }),
        error: "",
      };
    } catch (error) {
      return {
        draft: null,
        error:
          error instanceof Error
            ? error.message
            : "Unable to load this content.",
      };
    }
  });

  const items = catalogItems(section, data).filter((item) => {
    if (section !== "homework" || !pathId) return true;

    return data.homework.some(
      (homework) => homework.id === item.id && homework.path_id === pathId,
    );
  });

  const newHref =
    `/admin/creator/${section}?new=1` +
    (section === "homework" && pathId
      ? `&pathId=${encodeURIComponent(pathId)}`
      : "");

  return (
    <div className="creator-page">
      <header className="creator-hero">
        <div>
          <span className="creator-kicker">CYBER BOX / ADMIN WORKSPACE</span>
          <h1>The Creator&apos;s Column</h1>
          <p>Build the curriculum, shape the challenges, and author the next lesson.</p>
        </div>
        <span className="creator-admin-badge">Admin only</span>
      </header>

      <nav className="creator-tabs" aria-label="Content management">
        {creatorSections.map((item) => (
          <Link
            key={item}
            href={`/admin/creator/${item}`}
            className={item === section ? "is-active" : undefined}
            aria-current={item === section ? "page" : undefined}
          >
            {labels[item]}
          </Link>
        ))}
      </nav>

      {saved && (
        <div className="creator-message creator-success" role="status">
          Changes saved successfully.
        </div>
      )}

      {deleted && (
        <div className="creator-message creator-success" role="status">
          Item deleted.
        </div>
      )}

      <div className="creator-layout">
        <aside className="creator-catalog" aria-label={`${labels[section]} list`}>
          <div className="creator-section-heading">
            <div>
              <span className="creator-kicker">CONTENT LIBRARY</span>
              <h2>{labels[section]}</h2>
            </div>
            <span className="creator-count">{items.length}</span>
          </div>

          <Link href={newHref} className="primary-button creator-new-button">
            <Plus size={16} aria-hidden="true" />
            Create {singular[section]}
          </Link>

          {section === "homework" && pathId && (
            <p className="creator-help">
              Filtered to one learning path.{" "}
              <Link href="/admin/creator/homework">Show all homework</Link>
            </p>
          )}

          <ul className="creator-records">
            {items.map((item) => (
              <li key={item.id}>
                <div
                  className={`creator-record${item.id === editId ? " is-active" : ""}`}
                >
                  <Link
                    href={`/admin/creator/${section}?edit=${encodeURIComponent(item.id)}`}
                    className="creator-record-link"
                    aria-current={item.id === editId ? "true" : undefined}
                  >
                    <strong>{item.title}</strong>
                    <span>{item.detail}</span>
                  </Link>

                  <DeleteButton
                    section={section}
                    id={item.id}
                    title={item.title}
                  />

                  {section === "paths" && (
                    <div className="creator-record-links">
                      <Link
                        href={`/admin/creator/homework?new=1&pathId=${encodeURIComponent(item.id)}`}
                      >
                        Create Homework
                      </Link>
                      <Link
                        href={`/admin/creator/homework?pathId=${encodeURIComponent(item.id)}`}
                      >
                        Edit Homework
                      </Link>
                    </div>
                  )}

                  {section === "topics" && (
                    <div className="creator-record-links">
                      {/* CTF topics hold CTFs; challenges live in universes. */}
                      <Link
                        href={
                          data.topics.find((topic) => topic.id === item.id)
                            ?.type === "ctf"
                            ? `/admin/creator/ctfs?new=1&topicId=${encodeURIComponent(item.id)}`
                            : `/admin/creator/paths?new=1&topicId=${encodeURIComponent(item.id)}`
                        }
                      >
                        {data.topics.find((topic) => topic.id === item.id)
                          ?.type === "ctf"
                          ? "Create CTF"
                          : "Create learning path"}
                      </Link>
                    </div>
                  )}

                  {section === "ctfs" && (
                    <div className="creator-record-links">
                      <Link
                        href={`/admin/creator/universes?new=1&ctfId=${encodeURIComponent(item.id)}`}
                      >
                        Create universe
                      </Link>
                    </div>
                  )}

                  {section === "universes" && (
                    <div className="creator-record-links">
                      <Link
                        href={`/admin/creator/ctf?new=1&universeId=${encodeURIComponent(item.id)}`}
                      >
                        Create challenge
                      </Link>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>

          {items.length === 0 && (
            <p className="creator-empty-copy">
              No items yet. Create your first {singular[section].toLowerCase()}.
            </p>
          )}
        </aside>

        <div className="creator-editor-column">
          {initial.error ? (
            <section className="creator-editor">
              <h2>This content cannot be edited safely</h2>
              <p className="creator-inline-error" role="alert">
                {initial.error}
              </p>
              <p className="creator-help">
                Existing data has not been changed. Review or migrate this
                record&apos;s content format before editing it here.
              </p>
            </section>
          ) : initial.draft ? (
            <Editor initialDraft={initial.draft} data={data} />
          ) : (
            <section className="creator-editor creator-welcome">
              <span className="creator-kicker">YOUR NEXT IDEA STARTS HERE</span>
              <h2>Manage {labels[section].toLowerCase()}</h2>
              <p>
                Select an existing item from the library or create a new one.
                Changes remain local until you save.
              </p>
              <Link href={newHref} className="primary-button">
                <Plus size={16} aria-hidden="true" />
                Create {singular[section]}
              </Link>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
