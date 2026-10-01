import "server-only";

export type CTFHintDefinition = {
  text: string;
  penalty: number;
};

export type CTFChallengeDefinition = {
  id: string;
  title: string;
  points: number;
  description: string;
  hints: readonly CTFHintDefinition[];
  flag: string;
  labId?: string;
};

export type CTFUniverseDefinition = {
  id: string;
  name: string;
  description: string;
  challenges: readonly CTFChallengeDefinition[];
};

export type CTFCategoryDefinition = {
  id: string;
  name: string;
  description: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  suggestedPaths: readonly {
    name: string;
    href: string;
  }[];
  universes: readonly CTFUniverseDefinition[];
};

/**
 * Starter missions.
 *
 * Replace or extend these definitions with your own content.
 * Only set labId when that ID is configured in your Docker gateway.
 *
 * Never pass a complete definition to a client component.
 */
export const ctfCategories: readonly CTFCategoryDefinition[] = [
  {
    id: "networking",
    name: "Networking",
    description:
      "Follow the traffic, inspect the evidence, and uncover what moves between machines.",
    difficulty: "Beginner",
    suggestedPaths: [
      { name: "Explore networking foundations", href: "/paths" },
    ],
    universes: [
      {
        id: "whiterose",
        name: "The Whiterose Hack",
        description:
          "A quiet relay is carrying an unusual signal. Reconstruct the operator’s trail.",
        challenges: [
          {
            id: "whiterose-dns",
            title: "A message in the records",
            points: 100, labId: "linux-basics", description: `An analyst recovered these DNS TXT records from a fictional training environment:

whiterose.invalid. TXT "v=spf1 -all"
relay.whiterose.invalid. TXT "verification=relay-seven"
notes.whiterose.invalid. TXT "maintenance=sunday"

The verification record identifies the relay used by the operator.

Submit the verification value inside cyberbox{...}.
Example format: cyberbox{your-answer}

Everything you need is in this briefing. No external network access is required.`,
            hints: [
              {
                text: "TXT records can contain arbitrary text. Find the record whose value starts with verification=.",
                penalty: 10,
              },
              {
                text: "Use relay-seven as the content between the braces.",
                penalty: 25,
              },
            ],
            flag: "cyberbox{relay-seven}",
          },
          {
            id: "whiterose-http",
            title: "The missing response",
            points: 150,
            description: `A second artifact contains a short HTTP exchange:

GET /control HTTP/1.1
Host: relay.whiterose.invalid

HTTP/1.1 403 Forbidden
Content-Type: text/plain
X-Relay-Node: violet-12
Content-Length: 13

Access denied

The analyst believes the relay node identifier—not the response status—is the useful lead.

Find the node identifier and submit it inside cyberbox{...}.

This is a static training artifact; do not contact the hostname.`,
            hints: [
              {
                text: "HTTP response headers can carry metadata that does not appear in the response body.",
                penalty: 15,
              },
              {
                text: "Inspect the X-Relay-Node header.",
                penalty: 30,
              },
            ],
            flag: "cyberbox{violet-12}",
          },
        ],
      },
    ],
  },
  {
    id: "osint",
    name: "OSINT",
    description:
      "Connect public clues, distinguish signal from noise, and build an evidence-backed answer.",
    difficulty: "Beginner",
    suggestedPaths: [
      { name: "Explore investigation foundations", href: "/paths" },
    ],
    universes: [
      {
        id: "paper-trail",
        name: "The Paper Trail",
        description:
          "A fictional research group left a small but revealing publication archive.",
        challenges: [
          {
            id: "paper-trail-author",
            title: "Who signed the release?",
            points: 120,
            description: `You are reviewing a fictional organization’s archived release notes:

Release 1.8
Published: 2025-02-03
Maintainer: Northstar Research
Signed by: Maya Chen
Build ID: ns-1804

A separate archive note says:
“The release signer approved the deployment. The maintainer field names the organization, not the individual.”

Identify the individual who signed the release.

Submit the person’s name in lowercase with an underscore between the first and last name:
cyberbox{first_last}

All people and organizations in this mission are fictional. No external research is needed.`,
            hints: [
              {
                text: "The question asks for a person, not the organization listed as Maintainer.",
                penalty: 10,
              },
              {
                text: "Read the Signed by field and normalize the name to lowercase with an underscore.",
                penalty: 25,
              },
            ],
            flag: "cyberbox{maya_chen}",
          },
        ],
      },
    ],
  },
  {
    id: "general",
    name: "General",
    description:
      "Sharpen the fundamentals with compact puzzles in encoding, observation, and analysis.",
    difficulty: "Beginner",
    suggestedPaths: [
      { name: "Explore command-line foundations", href: "/paths" },
    ],
    universes: [
      {
        id: "first-contact",
        name: "First Contact",
        description:
          "Your first intercepted transmission is readable—once you recognize its disguise.",
        challenges: [
          {
            id: "first-contact-hex",
            title: "Six bytes of evidence",
            points: 100,
            description: `A recovered message contains these hexadecimal byte values:

73 69 67 6e 61 6c

Interpret each byte as an ASCII character.

Submit the decoded word inside cyberbox{...}.

You can solve this with an ASCII reference, a short script, or a local command-line tool.`,
            hints: [
              {
                text: "These values are hexadecimal character codes, not decimal numbers.",
                penalty: 10,
              },
              {
                text: "0x73 is s and 0x69 is i. Continue decoding the remaining four bytes.",
                penalty: 20,
              },
            ],
            flag: "cyberbox{signal}",
          },
        ],
      },
    ],
  },
  {
    id: "miscellaneous",
    name: "Miscellaneous",
    description:
      "Expect unusual artifacts, small surprises, and challenges that reward a different perspective.",
    difficulty: "Beginner",
    suggestedPaths: [
      { name: "Explore analytical foundations", href: "/paths" },
    ],
    universes: [
      {
        id: "archive-zero",
        name: "Archive Zero",
        description:
          "An abandoned archive has one final instruction hidden in plain sight.",
        challenges: [
          {
            id: "archive-zero-acrostic",
            title: "Read the edges",
            points: 100,
            description: `The archive contains a four-line note:

Open the case carefully.
Read beyond the obvious.
Be patient with the evidence.
Inspect where each line begins.

The archivist’s annotation reads:
“The beginning is the message.”

Recover the four-letter word, convert it to lowercase, and submit it inside cyberbox{...}.`,
            hints: [
              {
                text: "An acrostic forms a word using the first letter of each line.",
                penalty: 10,
              },
              {
                text: "Read the initials of Open, Read, Be, and Inspect in order.",
                penalty: 20,
              },
            ],
            flag: "cyberbox{orbi}",
          },
        ],
      },
    ],
  },
];

type LocatedChallenge = {
  category: CTFCategoryDefinition;
  universe: CTFUniverseDefinition;
  challenge: CTFChallengeDefinition;
};

const categoryById = new Map<string, CTFCategoryDefinition>();
const challengeById = new Map<string, LocatedChallenge>();
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

for (const category of ctfCategories) {
  if (
    !slugPattern.test(category.id) ||
    category.id === "challenge" ||
    categoryById.has(category.id)
  ) {
    throw new Error(`Invalid or duplicate CTF category: ${category.id}`);
  }

  categoryById.set(category.id, category);

  const universeIds = new Set<string>();

  for (const universe of category.universes) {
    if (
      !slugPattern.test(universe.id) ||
      universeIds.has(universe.id)
    ) {
      throw new Error(`Invalid or duplicate CTF universe: ${universe.id}`);
    }

    universeIds.add(universe.id);

    for (const challenge of universe.challenges) {
      const totalPenalty = challenge.hints.reduce(
        (sum, hint) => sum + hint.penalty,
        0,
      );

      if (
        !slugPattern.test(challenge.id) ||
        challenge.id.length > 100 ||
        challengeById.has(challenge.id) ||
        !Number.isSafeInteger(challenge.points) ||
        challenge.points <= 0 ||
        challenge.flag.length === 0 ||
        challenge.flag.length > 512 ||
        challenge.flag !== challenge.flag.trim() ||
        challenge.hints.some(
          (hint) =>
            !hint.text.trim() ||
            !Number.isSafeInteger(hint.penalty) ||
            hint.penalty < 0,
        ) ||
        !Number.isSafeInteger(totalPenalty) ||
        totalPenalty > challenge.points ||
        (challenge.labId !== undefined && !challenge.labId.trim())
      ) {
        throw new Error(`Invalid CTF challenge: ${challenge.id}`);
      }

      challengeById.set(challenge.id, {
        category,
        universe,
        challenge,
      });
    }
  }
}

export function findCTFCategory(id: string) {
  return categoryById.get(id);
}

export function findCTFChallenge(id: string) {
  return challengeById.get(id);
}

