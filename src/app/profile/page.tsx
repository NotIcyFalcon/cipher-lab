import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  Check,
  Flag,
  Heart,
  Lightbulb,
  Radar,
  Sparkles,
  Terminal,
  Trophy,
  Upload,
  UserRound,
} from "lucide-react";

import WorkspaceShell from "@/components/WorkspaceShell";
import { requireRonakId } from "@/server/current-user";
import {
  getProfileDashboard,
  type ProfileField,
} from "@/server/profile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Ronak's Profile | Cyber Box",
  description: "Celebrate your progress and discover your next learning step.",
};

const number = (value: number) => value.toLocaleString("en-US");

function dateLabel(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00.000Z`));
}

function FieldRadar({ fields }: { fields: ProfileField[] }) {
  if (fields.length < 3) {
    return (
      <div className="b5-radar-empty">
        <Radar size={42} aria-hidden="true" />
        <p>
          Your field map will take shape as more topics are added.
          Your available topic progress is listed below.
        </p>
      </div>
    );
  }

  const center = 200;
  const radius = 140;

  function point(index: number, scale: number) {
    const angle = -Math.PI / 2 + (index * 2 * Math.PI) / fields.length;
    return {
      x: center + Math.cos(angle) * radius * scale,
      y: center + Math.sin(angle) * radius * scale,
    };
  }

  function polygon(scale: number) {
    return fields
      .map((_, index) => {
        const position = point(index, scale);
        return `${position.x.toFixed(2)},${position.y.toFixed(2)}`;
      })
      .join(" ");
  }

  const progressPolygon = fields
    .map((field, index) => {
      const position = point(index, field.percentage / 100);
      return `${position.x.toFixed(2)},${position.y.toFixed(2)}`;
    })
    .join(" ");

  return (
    <figure className="b5-radar-figure">
      <svg
        viewBox="0 0 400 400"
        className="b5-radar"
        role="img"
        aria-labelledby="profile-radar-title profile-radar-description"
      >
        <title id="profile-radar-title">Your learning field map</title>
        <desc id="profile-radar-description">
          Each axis represents a topic, numbered to match the list below.
          Values show the percentage of available catalog points earned,
          not a skill rating.{" "}
          {fields
            .map((field) => `${field.name}: ${field.percentage} percent`)
            .join(". ")}
        </desc>

        {[0.25, 0.5, 0.75, 1].map((scale) => (
          <polygon
            key={scale}
            points={polygon(scale)}
            className="b5-radar-grid"
          />
        ))}

        {fields.map((field, index) => {
          const endpoint = point(index, 1);
          return (
            <line
              key={field.id}
              x1={center}
              y1={center}
              x2={endpoint.x}
              y2={endpoint.y}
              className="b5-radar-axis"
            />
          );
        })}

        <polygon
          points={progressPolygon}
          className="b5-radar-value"
        />

        {fields.map((field, index) => {
          const value = point(index, field.percentage / 100);
          const label = point(index, 1.2);

          return (
            <g key={field.id}>
              <circle
                cx={value.x}
                cy={value.y}
                r={4}
                className="b5-radar-dot"
              />
              <text
                x={label.x}
                y={label.y}
                textAnchor="middle"
                dominantBaseline="middle"
                className="b5-radar-label"
              >
                {String(index + 1).padStart(2, "0")}
              </text>
            </g>
          );
        })}
      </svg>

      <figcaption>
        Progress by topic.
      </figcaption>
    </figure>
  );
}

export default async function ProfilePage() {
  const userId = await requireRonakId();
  const data = getProfileDashboard(userId);

  const maxDailySubmissions = Math.max(
    1,
    ...data.activity.map((day) => day.count),
  );

  const milestones = [
    {
      title: "A curious beginning",
      description: "Read your first chapter.",
      earned: data.readingCount > 0,
      Icon: BookOpen,
    },
    {
      title: "Hands-on explorer",
      description: "Complete your first lab.",
      earned: data.completedLabCount > 0,
      Icon: Terminal,
    },
    {
      title: "Brave enough to try",
      description: "Submit your first homework solution.",
      earned: data.submissionCount > 0,
      Icon: Upload,
    },
    {
      title: "Signal found",
      description: "Capture your first CTF challenge.",
      earned: data.completedChallengeCount > 0,
      Icon: Flag,
    },
  ];

  return (
    <WorkspaceShell current="/profile" userId={userId}>
      <div className="b5-profile-page">
        <header className="b5-profile-hero">
          <div className="b5-profile-avatar" aria-hidden="true">
            <UserRound size={46} strokeWidth={1.5} />
          </div>

          <div className="b5-profile-intro">
            <span className="dashboard-kicker">PROFILE</span>
            <h1 style={{ textTransform: "capitalize" }}>{userId}</h1>

            <div className="b5-profile-chips">
              <span>
                <Sparkles size={15} aria-hidden="true" />
                Level {data.level}
              </span>
              <span>
                <Trophy size={15} aria-hidden="true" />
                {number(data.totalXp)} XP
              </span>
            </div>
          </div>

          <Link href="/paths" className="primary-button">
            Continue learning
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </header>

        <dl className="b5-profile-stats" aria-label="Your progress overview">
          <div>
            <dt>
              <Trophy size={18} aria-hidden="true" />
              Total XP
            </dt>
            <dd>{number(data.totalXp)}</dd>
          </div>

          <div>
            <dt>
              <Upload size={18} aria-hidden="true" />
              Homework submissions
            </dt>
            <dd>{number(data.recentSubmissionCount)}</dd>
          </div>

          <div>
            <dt>
              <CalendarDays size={18} aria-hidden="true" />
              Active practice days
            </dt>
            <dd>{data.activeDays}<span> / 28</span></dd>
          </div>

          <div>
            <dt>
              <Lightbulb size={18} aria-hidden="true" />
              Hint penalties
            </dt>
            <dd>{number(data.hintPenaltyXp)}</dd>
          </div>
        </dl>

        <section className="b5-level-panel" aria-labelledby="profile-level-title">
          <div>
            <span className="dashboard-kicker">LEVEL PROGRESS</span>
            <h2 id="profile-level-title">
              Level {data.level}
            </h2>
            <p>
              {number(data.nextLevelRemaining)} XP to next level.
            </p>
          </div>
          <div className="b5-level-progress">
            <div>
              <span>Level {data.level}</span>
              <strong>{data.levelXp} / {data.levelSize} XP</strong>
            </div>
            <progress
              value={data.levelXp}
              max={data.levelSize}
              aria-label={`${data.levelXp} of ${data.levelSize} XP toward level ${data.level + 1}`}
            />
          </div>
        </section>

        <div className="b5-profile-grid">
          <section className="b5-profile-panel" aria-labelledby="field-map-title">
            <div className="b5-profile-panel-heading">
              <div>
                <span className="dashboard-kicker">YOUR EXPLORATION MAP</span>
                <h2 id="field-map-title">Field Map</h2>
              </div>
              <Radar size={24} aria-hidden="true" />
            </div>

            <FieldRadar fields={data.fields} />

            <ol className="b5-field-list">
              {data.fields.map((field, index) => (
                <li key={field.id}>
                  <span className="b5-field-number" aria-hidden="true">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <strong>{field.name}</strong>
                    <span>
                      {number(field.earned)} / {number(field.available)} points
                    </span>
                  </div>
                  <strong>{field.percentage}%</strong>
                </li>
              ))}
            </ol>


          </section>

          <section
            className="b5-profile-panel"
            aria-labelledby="profile-activity-title"
          >
            <div className="b5-profile-panel-heading">
              <div>
                <span className="dashboard-kicker">ACTIVITY</span>
                <h2 id="profile-activity-title">Submission History</h2>
              </div>
              <CalendarDays size={24} aria-hidden="true" />
            </div>

            <p className="b5-panel-intro">
              {data.recentSubmissionCount > 0
                ? `${number(data.recentSubmissionCount)} submissions in the last 28 days.`
                : "No submissions in the last 28 days."}
            </p>

            <div className="b5-activity-heading">
              <span>{dateLabel(data.activity[0].date)}</span>
              <span>
                {dateLabel(data.activity[data.activity.length - 1].date)}
              </span>
            </div>

            <ul
              className="b5-activity-grid"
              aria-label="Homework submission counts for the last 28 UTC days"
            >
              {data.activity.map((day) => {
                const intensity =
                  day.count === 0
                    ? 0
                    : Math.max(
                        1,
                        Math.ceil((day.count / maxDailySubmissions) * 4),
                      );

                const label = `${dateLabel(day.date)}: ${day.count} ${
                  day.count === 1 ? "submission" : "submissions"
                }`;

                return (
                  <li
                    key={day.date}
                    className="b5-activity-day"
                    data-intensity={intensity}
                    title={label}
                  >
                    <span className="b5-sr-only">{label}</span>
                    <span aria-hidden="true">
                      {Number(day.date.slice(-2))}
                    </span>
                  </li>
                );
              })}
            </ul>

            <div className="b5-activity-legend" aria-hidden="true">
              <span>Less</span>
              {[0, 1, 2, 3, 4].map((intensity) => (
                <span
                  key={intensity}
                  className="b5-activity-swatch"
                  data-intensity={intensity}
                />
              ))}
              <span>More</span>
            </div>

            <dl className="b5-activity-summary">
              <div>
                <dt>All-time submissions</dt>
                <dd>{number(data.submissionCount)}</dd>
              </div>
              <div>
                <dt>Weekly average, last 28 days</dt>
                <dd>{data.weeklyAverage.toFixed(1)}</dd>
              </div>
            </dl>

            <Link href="/homework" className="dashboard-text-link" style={{ marginTop: 20 }}>
              Try a practice mission
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </section>
        </div>

        <section className="b5-milestones" aria-labelledby="milestones-title">
          <div className="b5-profile-panel-heading">
            <div>
              <span className="dashboard-kicker">SMALL WINS, REAL MOMENTUM</span>
              <h2 id="milestones-title">Your firsts deserve a celebration.</h2>
            </div>
            <Sparkles size={24} aria-hidden="true" />
          </div>

          <ul className="b5-milestone-grid">
            {milestones.map(({ title, description, earned, Icon }) => (
              <li
                key={title}
                className={`b5-milestone${earned ? " is-earned" : ""}`}
              >
                <span className="b5-milestone-icon" aria-hidden="true">
                  <Icon size={23} />
                </span>
                <span className="b5-milestone-state">
                  {earned && <Check size={13} aria-hidden="true" />}
                  {earned ? "You did this" : "A future small win"}
                </span>
                <h3>{title}</h3>
                <p>{description}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="b5-profile-panel b5-xp-panel" aria-labelledby="xp-title">
          <div>
            <span className="dashboard-kicker">EVERY KIND OF LEARNING COUNTS</span>
            <h2 id="xp-title">Here is where your XP comes from.</h2>
          </div>

          <dl className="b5-xp-breakdown">
            <div><dt>Reading</dt><dd>{number(data.readingXp)}</dd></div>
            <div><dt>Labs</dt><dd>{number(data.labsXp)}</dd></div>
            <div><dt>Homework</dt><dd>{number(data.homeworkXp)}</dd></div>
            <div><dt>CTF</dt><dd>{number(data.ctfXp)}</dd></div>
          </dl>

          <p className="b5-profile-note">
            Hint penalties are calculated from saved CTF hint unlocks using
            the current catalog definitions. They reduce available CTF
            rewards; they are not deducted from your total a second time.
          </p>
        </section>
      </div>
    </WorkspaceShell>
  );
}
