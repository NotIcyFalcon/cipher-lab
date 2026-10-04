import type { ReactNode } from "react";

/**
 * Renders Creator note/tip text without HTML injection:
 * - blank lines separate paragraphs; single newlines become line breaks
 * - lines starting with "- " or "* " form a bulleted list
 * - lines starting with "1. ", "2. ", ... form a numbered list
 * - `inline code` and **bold** are recognised inside any line
 */

type Group =
  | { kind: "paragraph"; lines: string[] }
  | { kind: "bullets"; items: string[] }
  | { kind: "numbers"; items: string[] };

const BULLET = /^\s*[-*]\s+(.*)$/;
const NUMBER = /^\s*\d+[.)]\s+(.*)$/;

function inline(text: string, keyPrefix: string): ReactNode[] {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);

  return parts.map((part, index) => {
    const key = `${keyPrefix}:${index}`;

    if (part.length > 2 && part.startsWith("`") && part.endsWith("`")) {
      return <code key={key}>{part.slice(1, -1)}</code>;
    }

    if (part.length > 4 && part.startsWith("**") && part.endsWith("**")) {
      return <strong key={key}>{part.slice(2, -2)}</strong>;
    }

    return part;
  });
}

function groupLines(text: string): Group[] {
  const groups: Group[] = [];

  for (const block of text.replace(/\r\n?/g, "\n").split(/\n\s*\n/)) {
    for (const line of block.split("\n")) {
      if (!line.trim()) continue;

      const bullet = BULLET.exec(line);
      const number = bullet ? null : NUMBER.exec(line);
      const last = groups[groups.length - 1];

      if (bullet) {
        if (last?.kind === "bullets") last.items.push(bullet[1]);
        else groups.push({ kind: "bullets", items: [bullet[1]] });
      } else if (number) {
        if (last?.kind === "numbers") last.items.push(number[1]);
        else groups.push({ kind: "numbers", items: [number[1]] });
      } else if (last?.kind === "paragraph") {
        last.lines.push(line);
      } else {
        groups.push({ kind: "paragraph", lines: [line] });
      }
    }

    // A blank line always ends the current paragraph or list.
    groups.push({ kind: "paragraph", lines: [] });
  }

  return groups.filter(
    (group) => group.kind !== "paragraph" || group.lines.length > 0,
  );
}

export default function RichText({ text }: { text: string }) {
  return (
    <div className="rich-text">
      {groupLines(text).map((group, index) => {
        const key = `group:${index}`;

        if (group.kind === "bullets" || group.kind === "numbers") {
          const List = group.kind === "bullets" ? "ul" : "ol";

          return (
            <List key={key}>
              {group.items.map((item, itemIndex) => (
                <li key={`${key}:${itemIndex}`}>
                  {inline(item, `${key}:${itemIndex}`)}
                </li>
              ))}
            </List>
          );
        }

        return (
          <p key={key}>
            {group.lines.map((line, lineIndex) => (
              <span key={`${key}:${lineIndex}`}>
                {lineIndex > 0 && <br />}
                {inline(line.trim(), `${key}:${lineIndex}`)}
              </span>
            ))}
          </p>
        );
      })}
    </div>
  );
}
