import Link from "next/link";
import { ArrowUpRight, BookOpen } from "lucide-react";

type RecommendedPath = {
  id: string;
  title: string;
  href: string;
  difficulty?: string | null;
};

/** A compact strip of learning paths that prepare you for a CTF. */
export default function RecommendedPaths({
  paths,
  headingId = "recommended-paths-title",
}: {
  paths: RecommendedPath[];
  /** Must be unique when several strips share a page. */
  headingId?: string;
}) {
  if (paths.length === 0) return null;

  return (
    <section className="recommended-strip" aria-labelledby={headingId}>
      <h3 id={headingId} className="ui-label">
        <BookOpen size={13} aria-hidden="true" />
        Recommended reading
      </h3>

      <ul>
        {paths.map((path) => (
          <li key={path.id}>
            <Link href={path.href}>
              <span>{path.title}</span>
              {path.difficulty && <small>{path.difficulty}</small>}
              <ArrowUpRight size={14} aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
