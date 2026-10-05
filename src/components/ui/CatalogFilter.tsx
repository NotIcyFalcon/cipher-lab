"use client";

import { useRef, useState, type ReactNode } from "react";
import { Search } from "lucide-react";

export type FilterCategory = { id: string; label: string; count: number };

/**
 * Search box + category chips for a server-rendered catalog. Items opt in
 * with data attributes, so the list is fully visible without JavaScript:
 *
 *   data-filter-item                 one filterable entry
 *   data-filter-text="…"             text to match (defaults to its text)
 *   data-filter-category="topic-id"  chip it belongs to
 *   data-filter-group                a section hidden when none of its items match
 *                                    (a <details> group opens while filtering)
 */
export default function CatalogFilter({
  label,
  placeholder,
  categories,
  children,
}: {
  label: string;
  placeholder: string;
  categories: FilterCategory[];
  children: ReactNode;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [matches, setMatches] = useState<number | null>(null);

  function apply(nextQuery: string, nextCategory: string | null) {
    setQuery(nextQuery);
    setCategory(nextCategory);

    const root = rootRef.current;
    if (!root) return;

    const needle = nextQuery.trim().toLowerCase();
    const filtering = needle.length > 0 || nextCategory !== null;
    let shown = 0;

    root.querySelectorAll<HTMLElement>("[data-filter-item]").forEach((item) => {
      const text = (item.dataset.filterText ?? item.textContent ?? "").toLowerCase();
      const visible =
        (!needle || text.includes(needle)) &&
        (!nextCategory || item.dataset.filterCategory === nextCategory);
      item.hidden = !visible;
      if (visible) shown += 1;
    });

    root.querySelectorAll<HTMLElement>("[data-filter-group]").forEach((group) => {
      const hasMatch = group.querySelector("[data-filter-item]:not([hidden])") !== null;
      group.hidden = !hasMatch;
      if (filtering && hasMatch && group instanceof HTMLDetailsElement) group.open = true;
    });

    setMatches(filtering ? shown : null);
  }

  return (
    <div className="ui-catalog" ref={rootRef}>
      <div className="ui-toolbar" role="search" aria-label={label}>
        <label className="ui-search">
          <span className="ui-sr-only">{placeholder}</span>
          <Search size={16} aria-hidden="true" />
          <input
            type="search"
            value={query}
            placeholder={placeholder}
            autoComplete="off"
            spellCheck={false}
            onChange={(event) => apply(event.target.value, category)}
          />
        </label>

        {categories.length > 1 && (
          <ul className="ui-chips" aria-label="Filter by topic">
            <li>
              <button
                type="button"
                className="ui-chip"
                aria-pressed={category === null}
                onClick={() => apply(query, null)}
              >
                All
              </button>
            </li>
            {categories.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className="ui-chip"
                  aria-pressed={category === item.id}
                  onClick={() => apply(query, category === item.id ? null : item.id)}
                >
                  {item.label}
                  <span className="ui-chip-count">{item.count}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="ui-sr-only" aria-live="polite">
        {matches === null ? "" : `${matches} ${matches === 1 ? "result" : "results"}`}
      </p>

      {children}

      {matches === 0 && (
        <div className="ui-filter-empty">
          Nothing matches{query.trim() ? ` “${query.trim()}”` : ""}.{" "}
          <button type="button" className="ui-btn ui-btn-quiet ui-btn-sm" onClick={() => apply("", null)}>
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
}
