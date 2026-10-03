"use client";

import {
  useActionState,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { Plus, Save, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { saveCreatorAction, deleteCreatorAction } from "./actions";
import {
  DEFAULT_COMMAND_BLACKLIST,
  DEFAULT_LAB_USER,
  learningLabPoints,
} from "@/lib/creator-defaults";
import {
  creatorSections,
  type ActionState,
  type CreatorData,
  type CreatorDraft,
  type CreatorSection,
  type ChapterDraft,
  type EditorBlock,
  type LabRow,
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

function blacklistText(json: string | null): string {
  if (!json) return DEFAULT_COMMAND_BLACKLIST.join("\n");

  const value: unknown = JSON.parse(json);

  if (
    !Array.isArray(value) ||
    !value.every((item) => typeof item === "string")
  ) {
    throw new Error("The lab blacklist is not a JSON array of strings.");
  }

  return value.join("\n");
}

function makeDraft(
  section: CreatorSection,
  data: CreatorData,
  editId: string,
  pathId: string,
  topicId: string,
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
        question_markdown: row?.question_markdown ?? "",
        setup_script: row?.setup_script ?? "",
        total_base_xp: row?.total_base_xp ?? 0,
        standard_solution_script: row?.standard_solution_script ?? "",
        tests: data.tests
          .filter((test) => test.homework_id === row?.id)
          .map((test) => ({
            id: test.id,
            setup_script: test.setup_script ?? "",
            xp_reward: test.xp_reward,
            is_hidden: test.is_hidden === 1,
          })),
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
        ctf_id: row?.ctf_id ?? "",
        name: row?.name ?? "",
        description: row?.description ?? "",
      };
    }

    case "ctf": {
      const row = data.challenges.find((item) => item.id === editId);

      return {
        entity: "ctf",
        id: row?.id ?? "",
        universe_id: row?.universe_id ?? "",
        title: row?.title ?? "",
        description: row?.description ?? "",
        points: row?.points ?? 100,
        difficulty: row?.difficulty ?? "",
        lab_id: row?.lab_id ?? "",
        flag_hash: row?.flag_hash ?? "",
        suggested_path_ids: stringArray(row?.suggested_paths_json ?? null),
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

      return {
        entity: "labs",
        id: row?.id ?? "",
        name: row?.name ?? "",
        default_user: row?.default_user ?? DEFAULT_LAB_USER,
        whitelist_enabled: row ? row.whitelist_enabled === 1 : true,
        command_blacklist: blacklistText(
          row?.command_blacklist_json ?? null,
        ),
        command_whitelist: stringArray(row?.command_whitelist_json ?? null).join("\n"),
        setup_script: row?.setup_script ?? "",
        completion_code_hash: row?.completion_code_hash ?? "",
      };
    }
  }
}

type TextFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  maxLength?: number;
  placeholder?: string;
  multiline?: boolean;
  code?: boolean;
  rows?: number;
};

function TextField({
  label,
  value,
  onChange,
  required = false,
  maxLength = 200,
  placeholder,
  multiline = false,
  code = false,
  rows = 5,
}: TextFieldProps) {
  return (
    <label className="creator-field">
      <span>
        {label}
        {required && <span aria-hidden="true"> *</span>}
      </span>

      {multiline ? (
        <textarea
          value={value}
          required={required}
          maxLength={maxLength}
          placeholder={placeholder}
          rows={rows}
          spellCheck={!code}
          className={code ? "creator-code" : undefined}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <input
          value={value}
          required={required}
          maxLength={maxLength}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </label>
  );
}

function NumberField({
  label,
  value,
  onChange,
  max = 1_000_000,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  max?: number;
}) {
  return (
    <label className="creator-field">
      <span>{label}</span>
      <input
        type="number"
        min={0}
        max={max}
        step={1}
        required
        value={Number.isFinite(value) ? value : ""}
        onChange={(event) => onChange(event.target.valueAsNumber)}
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  children,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
  required?: boolean;
}) {
  return (
    <label className="creator-field">
      <span>
        {label}
        {required && <span aria-hidden="true"> *</span>}
      </span>

      <select
        value={value}
        required={required}
        onChange={(event) => onChange(event.target.value)}
      >
        {children}
      </select>
    </label>
  );
}

function CheckField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="creator-check">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>{label}</span>
    </label>
  );
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
          {lab.name} · {lab.id.slice(0, 8)}
        </option>
      ))}
    </SelectField>
  );
}

function moveItem<T>(items: T[], index: number, direction: -1 | 1): T[] {
  const target = index + direction;

  if (target < 0 || target >= items.length) return items;

  const result = [...items];
  [result[index], result[target]] = [result[target], result[index]];
  return result;
}

function ListControls({
  label,
  index,
  length,
  onMove,
  onRemove,
  reorder = true,
}: {
  label: string;
  index: number;
  length: number;
  onMove?: (direction: -1 | 1) => void;
  onRemove: () => void;
  reorder?: boolean;
}) {
  return (
    <div className="creator-list-controls">
      {reorder && (
        <>
          <button
            type="button"
            className="creator-icon-button"
            aria-label={`Move ${label} up`}
            disabled={index === 0}
            onClick={() => onMove?.(-1)}
          >
            <ArrowUp size={16} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="creator-icon-button"
            aria-label={`Move ${label} down`}
            disabled={index === length - 1}
            onClick={() => onMove?.(1)}
          >
            <ArrowDown size={16} aria-hidden="true" />
          </button>
        </>
      )}

      <button
        type="button"
        className="creator-icon-button creator-danger-text"
        aria-label={`Remove ${label}`}
        onClick={() => {
          if (
            window.confirm(
              `Remove ${label}? This removal is applied when you save.`,
            )
          ) {
            onRemove();
          }
        }}
      >
        <Trash2 size={16} aria-hidden="true" />
      </button>
    </div>
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
            value={block.completionCodeHash ?? ""}
            placeholder="Type the raw answer (will be securely hashed on save)"
            onChange={(completionCodeHash) => onChange({ ...block, completionCodeHash })}
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

    case "homework": {
      const rewardTotal = draft.tests.reduce(
        (total, test) => total + (Number.isFinite(test.xp_reward) ? test.xp_reward : 0),
        0,
      );

      return (
        <>
          <div className="creator-editor-header">
            <TextField
              label="Question Title"
              value={draft.title}
              required
              maxLength={200}
              onChange={(title) => onChange({ ...draft, title })}
            />
          </div>
          <SelectField
            label="Learning path"
            value={draft.path_id}
            required
            onChange={(path_id) => onChange({ ...draft, path_id })}
          >
            <option value="">Choose a learning path…</option>
            {data.paths.map((path) => (
              <option key={path.id} value={path.id}>
                {path.title}
              </option>
            ))}
          </SelectField>

          <TextField
            label="Question Markdown"
            value={draft.question_markdown}
            multiline
            required
            rows={10}
            maxLength={50_000}
            onChange={(question_markdown) =>
              onChange({ ...draft, question_markdown })
            }
          />

          <div className="creator-two-columns">
            <NumberField
              label="Total Base XP"
              value={draft.total_base_xp}
              onChange={(total_base_xp) =>
                onChange({ ...draft, total_base_xp })
              }
            />
          </div>
          <TextField
            label="Standard solution script"
            value={draft.standard_solution_script}
            multiline
            code
            rows={10}
            maxLength={50_000}
            onChange={(standard_solution_script) =>
              onChange({ ...draft, standard_solution_script })
            }
          />

          <div className="creator-section-heading">
            <div>
              <h3>Test cases</h3>
              <p>
                Test-case rewards: {rewardTotal} XP. Stored separately from
                Total Base XP.
              </p>
            </div>
            <span className="creator-count">{draft.tests.length}/100</span>
          </div>

          {draft.tests.map((test, index) => (
            <section className="creator-child" key={test.id}>
              <div className="creator-section-heading">
                <h3>Test case {index + 1}</h3>
                <ListControls
                  label={`test case ${index + 1}`}
                  index={index}
                  length={draft.tests.length}
                  reorder={false}
                  onRemove={() =>
                    onChange({
                      ...draft,
                      tests: draft.tests.filter((item) => item.id !== test.id),
                    })
                  }
                />
              </div>

              <div className="creator-stack">
                <TextField
                  label="Setup script"
                  value={test.setup_script}
                  multiline
                  code
                  rows={7}
                  maxLength={50_000}
                  onChange={(setup_script) =>
                    onChange({
                      ...draft,
                      tests: draft.tests.map((item) =>
                        item.id === test.id
                          ? { ...item, setup_script }
                          : item,
                      ),
                    })
                  }
                />

                <NumberField
                  label="XP reward"
                  value={test.xp_reward}
                  onChange={(xp_reward) =>
                    onChange({
                      ...draft,
                      tests: draft.tests.map((item) =>
                        item.id === test.id ? { ...item, xp_reward } : item,
                      ),
                    })
                  }
                />

                <CheckField
                  label="Hidden from the student"
                  checked={test.is_hidden}
                  onChange={(is_hidden) =>
                    onChange({
                      ...draft,
                      tests: draft.tests.map((item) =>
                        item.id === test.id ? { ...item, is_hidden } : item,
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
            disabled={draft.tests.length >= 100}
            onClick={() =>
              onChange({
                ...draft,
                tests: [
                  ...draft.tests,
                  {
                    id: newId(),
                    setup_script: "",
                    xp_reward: 10,
                    is_hidden: false,
                  },
                ],
              })
            }
          >
            <Plus size={16} aria-hidden="true" />
            Add test case
          </button>

          <p className="creator-help">
            Scripts are saved only. Test execution, solution snapshots, and
            student-facing hidden-test filtering are not wired up in this batch.
            Test cases have no persisted ordering column in the current schema.
          </p>
        </>
      );
    }

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
            label="Flag Hash"
            value={draft.flag_hash}
            placeholder="MD5/SHA256 hash or exact flag (leave empty if not applicable)"
            maxLength={200}
            onChange={(flag_hash) => onChange({ ...draft, flag_hash })}
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
            label="Default Linux user"
            value={draft.default_user}
            required
            maxLength={100}
            onChange={(default_user) => onChange({ ...draft, default_user })}
          />

          <CheckField
            label="Whitelist enabled"
            checked={draft.whitelist_enabled}
            onChange={(whitelist_enabled) =>
              onChange({ ...draft, whitelist_enabled })
            }
          />

          <TextField
            label="Command blacklist — one entry per line"
            value={draft.command_blacklist}
            multiline
            code
            maxLength={10_000}
            onChange={(command_blacklist) =>
              onChange({ ...draft, command_blacklist })
            }
          />

          <TextField
            label="Command whitelist — one entry per line"
            value={draft.command_whitelist}
            multiline
            code
            maxLength={10_000}
            onChange={(command_whitelist) =>
              onChange({ ...draft, command_whitelist })
            }
          />

          <TextField
            label="Completion Answer (Flag)"
            value={draft.completion_code_hash}
            placeholder="Type the raw answer (will be securely hashed on save)"
            onChange={(completion_code_hash) => onChange({ ...draft, completion_code_hash })}
          />

          <TextField
            label="Setup script"
            value={draft.setup_script}
            multiline
            code
            rows={10}
            maxLength={50_000}
            placeholder="#!/usr/bin/env bash\n# Commands to set up the lab environment"
            onChange={(setup_script) => onChange({ ...draft, setup_script })}
          />

          <p className="creator-help">
            This registers lab metadata. Image creation, container
            initialization, and command-policy enforcement belong to the lab
            runtime batch.
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

  return (
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
        title: homework.title || homework.question_markdown.slice(0, 85) || "Untitled question",
        detail: [
          data.paths.find((path) => path.id === homework.path_id)?.title,
          `${homework.total_base_xp} base XP`,
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
        detail: `${challenge.points} points · ${challenge.difficulty || "Unspecified difficulty"}`,
      }));

    case "labs":
      return data.labs.map((lab) => ({
        id: lab.id,
        title: lab.name || "Unnamed lab",
        detail: `${lab.default_user} · ${lab.id.slice(0, 8)}`,
      }));
  }
}

export default function CreatorClient({
  section,
  data,
  editId,
  creating,
  pathId,
  topicId,
  saved,
  deleted,
}: {
  section: CreatorSection;
  data: CreatorData;
  editId: string;
  creating: boolean;
  pathId: string;
  topicId: string;
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
        draft: makeDraft(section, data, editId, pathId, topicId),
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
                      <Link
                        href={
                          data.topics.find((topic) => topic.id === item.id)
                            ?.type === "ctf"
                            ? `/admin/creator/ctf?new=1&topicId=${encodeURIComponent(item.id)}`
                            : `/admin/creator/paths?new=1&topicId=${encodeURIComponent(item.id)}`
                        }
                      >
                        {data.topics.find((topic) => topic.id === item.id)
                          ?.type === "ctf"
                          ? "Create challenge"
                          : "Create learning path"}
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
