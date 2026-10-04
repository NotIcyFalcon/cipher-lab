import Link from "next/link";
import { ArrowUpRight, BookOpen } from "lucide-react";

type RecommendedPath = {
  id: string;
  title: string;
  href: string;
  difficulty?: string | null;
};

export default function RecommendedPaths({
  paths,
}: {
  paths: RecommendedPath[];
}) {
  if (paths.length === 0) return null;

  return (
    <section
      className="recommended-paths"
      aria-labelledby="recommended-paths-title"
    >
      <div className="recommended-paths-heading">
        <BookOpen size={20} aria-hidden="true" />
        <h2 id="recommended-paths-title">
          Recommended learning paths
        </h2>
      </div>

      <p>
        Build the background knowledge for this CTF with these paths.
      </p>

      <ul>
        {paths.map((path) => (
          <li key={path.id}>
            <Link href={path.href}>
              <span>
                <strong>{path.title}</strong>
                {path.difficulty && (
                  <small>{path.difficulty}</small>
                )}
              </span>

              <ArrowUpRight size={18} aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
