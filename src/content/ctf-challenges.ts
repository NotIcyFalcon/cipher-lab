import "server-only";

import type { PublicCTFChallenge } from "@/lib/ctf-types";

export type CTFChallenge = PublicCTFChallenge & {
  flag: string;
};

// Sample flags. When replacing them, update the corresponding clues too.
export const ctfChallenges: readonly CTFChallenge[] = [
  {
    id: "linux-identify-the-host",
    title: "Identify the Host",
    category: "Linux",
    difficulty: "Easy",
    points: 100,
    description: [
      "Connect to the Linux lab and identify its Linux distribution.",
      "Find the distribution's ID in the operating system release information.",
      "Submit your answer in the format CYBERBOX{<distribution-id>}.",
    ].join("\n\n"),
    hint: "Inspect /etc/os-release and look for the ID field.",
    flag: "CYBERBOX{alpine}",
    labId: "linux-basics",
  },
  {
    id: "crypto-thirteen-steps",
    title: "Thirteen Steps",
    category: "Crypto",
    difficulty: "Easy",
    points: 100,
    description: [
      "An intercepted message was transformed with a classic letter substitution:",
      "PLOREOBK{EBG13}",
      "Decode the message and submit the complete flag.",
    ].join("\n\n"),
    hint: "Rotate each alphabetic character by thirteen positions.",
    flag: "CYBERBOX{ROT13}",
  },
  {
    id: "forensics-recovered-bytes",
    title: "Recovered Bytes",
    category: "Forensics",
    difficulty: "Medium",
    points: 150,
    description: [
      "A recovered file fragment contains this hexadecimal sequence:",
      "4359424552424f587b6865787d",
      "Reconstruct the original text and submit it as your flag.",
    ].join("\n\n"),
    hint: "Each pair of hexadecimal digits represents one ASCII character.",
    flag: "CYBERBOX{hex}",
  },
  {
    id: "network-follow-the-port",
    title: "Follow the Port",
    category: "Network",
    difficulty: "Easy",
    points: 100,
    description: [
      "Examine this request and response:",
      [
        "UDP 192.0.2.10:53144 -> 192.0.2.53:53",
        "UDP 192.0.2.53:53 -> 192.0.2.10:53144",
      ].join("\n"),
      "Identify the server's port number.",
      "Submit your answer in the format CYBERBOX{<port>}.",
    ].join("\n\n"),
    hint: "The server receives the request on a service port and replies to the client's temporary port.",
    flag: "CYBERBOX{53}",
  },
];
