import type { CSSProperties } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  Check,
  FileCode2,
  Flag,
  Flame,
  History,
  Layers3,
  Lightbulb,
  Lock,
  Radar,
  Sparkles,
  Terminal,
  Trophy,
  Upload,
  type LucideIcon,
} from "lucide-react";

import WorkspaceShell from "@/components/WorkspaceShell";
import { pathHref } from "@/lib/path-links";
import { requireRonakId } from "@/server/current-user";
import {
  getProfileDashboard,
  type ProfileActivityDay,
  type ProfileEvent,
  type ProfileField,
} from "@/server/profile";
import "@/styles/pages/profile.css";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Profile | Cyber Box",
  description: "Your XP, level, activity and progress across Cyber Box.",
};

type Dashboard = ReturnType<typeof getProfileDashboard>;

const number = (value: number) => value.toLocaleString("en-US");
const percent = (part: number, whole: number) => (whole > 0 ? Math.min(100, Math.round((part / whole) * 100)) : 0);
const plural = (count: number, one: string, many = `${one}s`) => `${number(count)} ${count === 1 ? one : many}`;

function dateLabel(date: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(
    new Date(`${date}T00:00:00.000Z`),
  );
}

function relativeTime(at: number, now: number) {
  const seconds = Math.round((at - now) / 1000);
  const format = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 31_536_000],
    ["month", 2_592_000],
    ["week", 604_800],
    ["day", 86_400],
    ["hour", 3_600],
    ["minute", 60],
  ];
  for (const [unit, size] of units) {
    if (Math.abs(seconds) >= size) return format.format(Math.round(seconds / size), unit);
  }
  return "just now";
}

export default async function ProfilePage() {
  const userId = await requireRonakId();
  const data = getProfileDashboard(userId);
  const name = userId.charAt(0).toUpperCase() + userId.slice(1);
  const levelPercent = percent(data.levelXp, data.levelSize);

  const kpis = [
    { label: "Chapters read", value: data.readingCount, total: data.lessonCount, Icon: BookOpen },
    { label: "Labs completed", value: data.completedLabCount, total: data.labCount, Icon: Terminal },
    { label: "Homework solved", value: data.solvedQuestionCount, total: data.homeworkQuestionCount, Icon: FileCode2 },
    { label: "Flags captured", value: data.completedChallengeCount, total: data.challengeCount, Icon: Flag },
  ];

  return (
    <WorkspaceShell current="/profile" userId={userId}>
      <div className="pf">
        <header className="pf-hero">
          <div className="pf-identity">
            <span className="pf-avatar" aria-hidden="true">
              {name.charAt(0)}
            </span>
            <div>
              <span className="ui-eyebrow">Profile</span>
              <h1 className="ui-title">{name}</h1>
              <ul className="pf-chips" aria-label="Summary">
                <li>
                  <Sparkles size={13} aria-hidden="true" />
                  Level {data.level}
                </li>
                <li>
                  <Trophy size={13} aria-hidden="true" />
                  {number(data.totalXp)} XP
                </li>
                <li className={data.currentStreak > 0 ? "is-hot" : undefined}>
                  <Flame size={13} aria-hidden="true" />
                  {data.currentStreak > 0 ? `${plural(data.currentStreak, "day")} streak` : "No streak yet"}
                </li>
              </ul>
            </div>
          </div>

          <div className="pf-level">
            <div className="pf-level-row">
              <span className="ui-label">Level {data.level}</span>
              <span className="ui-num">
                {number(data.levelXp)} <small>/ {number(data.levelSize)} XP</small>
              </span>
            </div>
            <div
              className="ui-meter pf-level-meter"
              role="progressbar"
              aria-label={`Progress to level ${data.level + 1}`}
              aria-valuemin={0}
              aria-valuemax={data.levelSize}
              aria-valuenow={data.levelXp}
            >
              <span style={{ "--value": levelPercent / 100 } as CSSProperties} />
            </div>
            <p>
              {number(data.nextLevelRemaining)} XP to level {data.level + 1}
            </p>
          </div>

          <Link href="/paths" className="ui-btn ui-btn-primary pf-cta">
            Continue learning
            <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </header>

        <dl className="pf-kpis" aria-label="Progress overview">
          <div className="pf-kpi pf-kpi-total">
            <dt>
              <Trophy size={14} aria-hidden="true" />
              Total XP
            </dt>
            <dd className="ui-num">{number(data.totalXp)}</dd>
            <p>{data.hintPenaltyXp > 0 ? `${number(data.hintPenaltyXp)} XP of CTF hints used` : "No hint penalties"}</p>
          </div>
          {kpis.map(({ label, value, total, Icon }) => (
            <div key={label} className="pf-kpi">
              <dt>
                <Icon size={14} aria-hidden="true" />
                {label}
              </dt>
              <dd className="ui-num">
                {number(value)} <span>/ {number(total)}</span>
              </dd>
              <div className="ui-meter" aria-hidden="true">
                <span style={{ "--value": percent(value, total) / 100 } as CSSProperties} />
              </div>
            </div>
          ))}
        </dl>

        <div className="pf-grid">
          <ActivityPanel data={data} />
          <XpPanel data={data} />
          <PathsPanel data={data} />
          <FieldsPanel fields={data.fields} />
          <RecentPanel events={data.recentEvents} now={data.generatedAt} />
          <MilestonesPanel data={data} />
        </div>
      </div>
    </WorkspaceShell>
  );
}

/* ---------- Activity heatmap ---------- */

function intensity(day: ProfileActivityDay, max: number) {
  if (day.count === 0) return 0;
  return Math.max(1, Math.ceil((day.count / max) * 4));
}

function dayTitle(day: ProfileActivityDay) {
  if (day.count === 0) return `${dateLabel(day.date)}: no activity`;
  const parts = [
    day.reading && plural(day.reading, "chapter"),
    day.labs && plural(day.labs, "lab"),
    day.homework && plural(day.homework, "submission"),
    day.ctf && plural(day.ctf, "flag"),
  ].filter(Boolean);
  return `${dateLabel(day.date)}: ${parts.join(", ")}`;
}

function ActivityPanel({ data }: { data: Dashboard }) {
  const max = Math.max(1, ...data.activity.map((day) => day.count));
  const total = data.activity.reduce((sum, day) => sum + day.count, 0);
  const first = data.activity[0];
  const last = data.activity[data.activity.length - 1];

  return (
    <section className="ui-panel pf-span-7" aria-labelledby="pf-activity-title">
      <div className="ui-panel-head">
        <div>
          <span className="ui-label">Last {data.heatmapWeeks} weeks</span>
          <h2 id="pf-activity-title">Activity</h2>
        </div>
        <CalendarDays size={18} aria-hidden="true" />
      </div>

      <div className="pf-heatmap-wrap" style={{ "--weeks": data.heatmapWeeks } as CSSProperties}>
        <ol className="pf-weekdays" aria-hidden="true">
          <li>Mon</li>
          <li />
          <li>Wed</li>
          <li />
          <li>Fri</li>
          <li />
          <li>Sun</li>
        </ol>
        <ol
          className="pf-heatmap"
          role="img"
          aria-label={`${plural(total, "learning action")} on ${plural(data.activeDays, "day")} between ${dateLabel(first.date)} and ${dateLabel(last.date)}`}
        >
          {data.activity.map((day) => (
            <li key={day.date} data-intensity={intensity(day, max)} title={dayTitle(day)} />
          ))}
        </ol>
      </div>

      <div className="pf-heatmap-foot" aria-hidden="true">
        <span>
          {dateLabel(first.date)} – {dateLabel(last.date)}
        </span>
        <span className="pf-legend">
          Less
          {[0, 1, 2, 3, 4].map((level) => (
            <i key={level} data-intensity={level} />
          ))}
          More
        </span>
      </div>

      <dl className="pf-mini-stats">
        <div>
          <dt>Current streak</dt>
          <dd className="ui-num">{plural(data.currentStreak, "day")}</dd>
        </div>
        <div>
          <dt>Longest streak</dt>
          <dd className="ui-num">{plural(data.longestStreak, "day")}</dd>
        </div>
        <div>
          <dt>Active days</dt>
          <dd className="ui-num">{number(data.activeDays)}</dd>
        </div>
        <div>
          <dt>Submissions · 28 days</dt>
          <dd className="ui-num">{number(data.recentSubmissionCount)}</dd>
        </div>
      </dl>
    </section>
  );
}

/* ---------- XP sources ---------- */

function XpPanel({ data }: { data: Dashboard }) {
  const sources = [
    { key: "reading", label: "Reading", value: data.readingXp },
    { key: "labs", label: "Labs", value: data.labsXp },
    { key: "homework", label: "Homework", value: data.homeworkXp },
    { key: "ctf", label: "CTF", value: data.ctfXp },
  ];

  return (
    <section className="ui-panel pf-span-5" aria-labelledby="pf-xp-title">
      <div className="ui-panel-head">
        <div>
          <span className="ui-label">Where it comes from</span>
          <h2 id="pf-xp-title">XP sources</h2>
        </div>
        <Trophy size={18} aria-hidden="true" />
      </div>

      <div className="pf-xp-bar" aria-hidden="true">
        {data.totalXp > 0 ? (
          sources
            .filter((source) => source.value > 0)
            .map((source) => (
              <span key={source.key} data-source={source.key} style={{ flexGrow: source.value }} />
            ))
        ) : (
          <span className="is-empty" />
        )}
      </div>

      <dl className="pf-xp-list">
        {sources.map((source) => (
          <div key={source.key}>
            <dt>
              <i data-source={source.key} aria-hidden="true" />
              {source.label}
            </dt>
            <dd className="ui-num">
              {number(source.value)}
              <span>{percent(source.value, data.totalXp)}%</span>
            </dd>
          </div>
        ))}
      </dl>

      <p className="pf-note">
        <Lightbulb size={13} aria-hidden="true" />
        Hint penalties lower what a CTF challenge can award; they are not subtracted from your total again.
      </p>
    </section>
  );
}

/* ---------- Learning paths ---------- */

function PathsPanel({ data }: { data: Dashboard }) {
  const shown = data.pathProgress.slice(0, 6);

  return (
    <section className="ui-panel pf-span-7" aria-labelledby="pf-paths-title">
      <div className="ui-panel-head">
        <div>
          <span className="ui-label">Learning paths</span>
          <h2 id="pf-paths-title">Path progress</h2>
        </div>
        <Link href="/paths" className="ui-link">
          All paths
          <ArrowRight size={14} aria-hidden="true" />
        </Link>
      </div>

      {shown.length === 0 ? (
        <p className="ui-muted">No learning paths yet.</p>
      ) : (
        <ul className="pf-paths">
          {shown.map((path) => (
            <li key={path.id}>
              <Link href={pathHref(path.id)} className="pf-path">
                <span className={`pf-path-icon${path.complete ? " is-complete" : ""}`} aria-hidden="true">
                  {path.complete ? <Check size={14} /> : <Layers3 size={14} />}
                </span>
                <span className="pf-path-main">
                  <strong>{path.title}</strong>
                  <small>
                    {path.topicName} · {path.readingCount}/{path.lessonCount} chapters
                  </small>
                  <span className={`ui-meter${path.complete ? " is-complete" : ""}`} aria-hidden="true">
                    <span style={{ "--value": path.percentage / 100 } as CSSProperties} />
                  </span>
                </span>
                <span className="pf-path-pct ui-num">
                  {path.percentage}%<span className="ui-sr-only"> of points earned</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* ---------- Field map ---------- */

function FieldRadar({ fields }: { fields: ProfileField[] }) {
  const center = 150;
  const radius = 104;

  const point = (index: number, scale: number) => {
    const angle = -Math.PI / 2 + (index * 2 * Math.PI) / fields.length;
    return { x: center + Math.cos(angle) * radius * scale, y: center + Math.sin(angle) * radius * scale };
  };
  const polygon = (scale: (index: number) => number) =>
    fields
      .map((_, index) => {
        const p = point(index, scale(index));
        return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
      })
      .join(" ");

  return (
    <svg viewBox="0 0 300 300" className="pf-radar" aria-hidden="true">
      {[0.25, 0.5, 0.75, 1].map((scale) => (
        <polygon key={scale} points={polygon(() => scale)} className="pf-radar-grid" />
      ))}
      {fields.map((field, index) => {
        const end = point(index, 1);
        return <line key={field.id} x1={center} y1={center} x2={end.x} y2={end.y} className="pf-radar-axis" />;
      })}
      <polygon points={polygon((index) => Math.max(0.02, fields[index].percentage / 100))} className="pf-radar-value" />
      {fields.map((field, index) => {
        const value = point(index, Math.max(0.02, field.percentage / 100));
        const label = point(index, 1.18);
        return (
          <g key={field.id}>
            <circle cx={value.x} cy={value.y} r={3.5} className="pf-radar-dot" />
            <text x={label.x} y={label.y} textAnchor="middle" dominantBaseline="middle" className="pf-radar-label">
              {String(index + 1).padStart(2, "0")}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function FieldsPanel({ fields }: { fields: ProfileField[] }) {
  return (
    <section className="ui-panel pf-span-5" aria-labelledby="pf-fields-title">
      <div className="ui-panel-head">
        <div>
          <span className="ui-label">Share of points earned per topic</span>
          <h2 id="pf-fields-title">Field map</h2>
        </div>
        <Radar size={18} aria-hidden="true" />
      </div>

      {fields.length === 0 ? (
        <p className="ui-muted">Topics appear here once content is added.</p>
      ) : (
        <div className={fields.length >= 3 ? "pf-fields has-radar" : "pf-fields"}>
          {fields.length >= 3 && <FieldRadar fields={fields} />}
          <ol className="pf-field-list">
            {fields.map((field, index) => (
              <li key={field.id}>
                <span className="pf-field-index" aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="pf-field-name">{field.name}</span>
                <span className="pf-field-pct ui-num">{field.percentage}%</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}

/* ---------- Recent activity ---------- */

const EVENT_ICONS: Record<ProfileEvent["kind"], LucideIcon> = {
  reading: BookOpen,
  lab: Terminal,
  homework: Upload,
  ctf: Flag,
};

function RecentPanel({ events, now }: { events: ProfileEvent[]; now: number }) {
  return (
    <section className="ui-panel pf-span-7" aria-labelledby="pf-recent-title">
      <div className="ui-panel-head">
        <div>
          <span className="ui-label">Latest first</span>
          <h2 id="pf-recent-title">Recent activity</h2>
        </div>
        <History size={18} aria-hidden="true" />
      </div>

      {events.length === 0 ? (
        <div className="pf-empty">
          <p>Nothing here yet. Read a chapter or try a lab and it will show up.</p>
          <Link href="/paths" className="ui-link">
            Browse paths
            <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </div>
      ) : (
        <ol className="pf-timeline">
          {events.map((event, index) => {
            const Icon = EVENT_ICONS[event.kind];
            return (
              <li key={`${event.kind}-${event.at}-${index}`} data-kind={event.kind}>
                <span className="pf-timeline-icon" aria-hidden="true">
                  <Icon size={13} />
                </span>
                <span className="pf-timeline-main">
                  <strong>{event.title}</strong>
                  <small>{event.detail}</small>
                </span>
                <span className="pf-timeline-end">
                  {event.xp !== null && event.xp > 0 && <span className="pf-xp-chip ui-num">+{number(event.xp)} XP</span>}
                  <time dateTime={new Date(event.at).toISOString()}>{relativeTime(event.at, now)}</time>
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

/* ---------- Milestones ---------- */

function MilestonesPanel({ data }: { data: Dashboard }) {
  const milestones = [
    { title: "First chapter", description: "Read a chapter", earned: data.readingCount > 0, Icon: BookOpen },
    { title: "Hands-on", description: "Complete a lab", earned: data.completedLabCount > 0, Icon: Terminal },
    { title: "First script", description: "Submit homework", earned: data.submissionCount > 0, Icon: Upload },
    { title: "Signal found", description: "Capture a flag", earned: data.completedChallengeCount > 0, Icon: Flag },
    { title: "On a roll", description: "3-day streak", earned: data.longestStreak >= 3, Icon: Flame },
    { title: "Level up", description: "Reach level 2", earned: data.level >= 2, Icon: Sparkles },
  ];
  const earned = milestones.filter((milestone) => milestone.earned).length;

  return (
    <section className="ui-panel pf-span-5" aria-labelledby="pf-milestones-title">
      <div className="ui-panel-head">
        <div>
          <span className="ui-label">
            {earned} of {milestones.length} earned
          </span>
          <h2 id="pf-milestones-title">Milestones</h2>
        </div>
        <Trophy size={18} aria-hidden="true" />
      </div>

      <ul className="pf-milestones">
        {milestones.map(({ title, description, earned: done, Icon }) => (
          <li key={title} className={done ? "is-earned" : undefined}>
            <span className="pf-milestone-icon" aria-hidden="true">
              <Icon size={16} />
            </span>
            <span className="pf-milestone-copy">
              <strong>{title}</strong>
              <small>{description}</small>
            </span>
            <span className="pf-milestone-state">
              {done ? <Check size={13} aria-hidden="true" /> : <Lock size={12} aria-hidden="true" />}
              <span className="ui-sr-only">{done ? "Earned" : "Not earned yet"}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
