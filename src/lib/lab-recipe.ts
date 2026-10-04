import { z } from "zod";
import { DEFAULT_COMMAND_BLACKLIST } from "@/lib/creator-defaults";

/**
 * A lab is one or more machines. Each machine is built once into its own
 * Docker image (build time: root, internet access) and started fresh for every
 * lab session (start time: root, no internet). The learner's terminal opens
 * into the entry machine; the other machines are reachable by hostname on a
 * private network that only this lab session uses.
 */

export const LAB_TEMPLATES = {
  debian: {
    label: "Debian 12 (slim)",
    image: "debian:bookworm-slim",
    family: "apt",
    hint: "Small, general-purpose Linux. Good default.",
  },
  ubuntu: {
    label: "Ubuntu 24.04",
    image: "ubuntu:24.04",
    family: "apt",
    hint: "Familiar Ubuntu userland.",
  },
  alpine: {
    label: "Alpine 3.20 (smallest)",
    image: "alpine:3.20",
    family: "apk",
    hint: "Tiny image; packages use apk names.",
  },
  python: {
    label: "Python 3.12 (Debian slim)",
    image: "python:3.12-slim-bookworm",
    family: "apt",
    hint: "For small web apps and scripts written in Python.",
  },
  kali: {
    label: "Kali Linux rolling (large)",
    image: "kalilinux/kali-rolling",
    family: "apt",
    hint: "Security tooling. Large image; builds take longer.",
  },
} as const;

export type LabTemplate = keyof typeof LAB_TEMPLATES;
export const LAB_TEMPLATE_IDS = Object.keys(LAB_TEMPLATES) as LabTemplate[];

export const LAB_LIMITS = {
  machines: 4,
  memoryMinMb: 32,
  memoryMaxMb: 384,
  memoryDefaultMb: 128,
  packages: 80,
  users: 10,
  files: 50,
  fileBytes: 100_000,
  totalFileBytes: 400_000,
  services: 10,
  scriptChars: 50_000,
  policyEntries: 200,
} as const;

/** Must match the gateway's LAB_MEMORY_BUDGET_MB (memory for all running labs). */
export const DEFAULT_LAB_MEMORY_BUDGET_MB = 384;

export type SudoMode = "none" | "all" | "commands";
export type PolicyMode = "none" | "blacklist" | "whitelist";

export type LabUser = {
  name: string;
  password: string;
  shell: "bash" | "sh";
  sudo: SudoMode;
  sudoCommands: string[];
  groups: string[];
};

export type LabFile = {
  path: string;
  owner: string;
  mode: string;
  content: string;
};

export type LabService = {
  name: string;
  user: string;
  command: string;
};

export type LabMachine = {
  key: string;
  hostname: string;
  template: LabTemplate;
  memoryMb: number;
  mainUser: string;
  packages: string[];
  users: LabUser[];
  files: LabFile[];
  buildScript: string;
  startScript: string;
  services: LabService[];
  allowPrivilegeEscalation: boolean;
  rawNetwork: boolean;
};

export type LabPolicy = {
  mode: PolicyMode;
  blacklist: string[];
  whitelist: string[];
};

export type LabRecipe = {
  version: 1;
  entryMachine: string;
  policy: LabPolicy;
  machines: LabMachine[];
};

// ---------- Validation ----------

const linuxName = z
  .string()
  .trim()
  .regex(/^[a-z_][a-z0-9_-]{0,30}$/, "Use lowercase letters, digits, - or _ (start with a letter).");

const hostname = z
  .string()
  .trim()
  .regex(/^[a-z][a-z0-9-]{0,30}$/, "Hostnames use lowercase letters, digits and - (start with a letter).");

const packageName = z
  .string()
  .trim()
  .regex(/^[a-z0-9][a-z0-9+._:-]*(=[A-Za-z0-9+._:~-]+)?$/, "Invalid package name.")
  .max(120);

const owner = z
  .string()
  .trim()
  .regex(/^[a-z_][a-z0-9_-]{0,30}(:[a-z_][a-z0-9_-]{0,30})?$/, "Owner must be user or user:group.");

const filePath = z
  .string()
  .trim()
  .max(255)
  .refine(
    (value) =>
      (value.startsWith("/") || value.startsWith("~/")) &&
      !value.includes("\0") &&
      !value.split("/").includes("..") &&
      !/[\n\r]/.test(value) &&
      value.length > 2,
    "File paths must be absolute (or start with ~/) and must not contain '..'.",
  );

const sudoCommand = z
  .string()
  .trim()
  .regex(/^\/[^\s,:=\\!#]+( [^,:=\\!#\n]+)*$/, "Sudo commands must be absolute paths, e.g. /usr/bin/find.");

const policyEntry = z
  .string()
  .trim()
  .min(1)
  .max(200)
  .refine((value) => !/[\n\r'\0]/.test(value), "Command entries cannot contain quotes or newlines.");

const userSchema = z.object({
  name: linuxName.refine((value) => value !== "root", "root already exists."),
  password: z
    .string()
    .max(128)
    .refine((value) => !/[:\n\r]/.test(value), "Passwords cannot contain ':' or newlines."),
  shell: z.enum(["bash", "sh"]),
  sudo: z.enum(["none", "all", "commands"]),
  sudoCommands: z.array(sudoCommand).max(30),
  groups: z.array(linuxName).max(10),
});

const fileSchema = z.object({
  path: filePath,
  owner,
  mode: z.string().trim().regex(/^[0-7]{3,4}$/, "Mode must be octal, e.g. 644 or 0755."),
  content: z.string().max(LAB_LIMITS.fileBytes, `Each file is limited to ${LAB_LIMITS.fileBytes} characters.`),
});

const serviceSchema = z.object({
  name: z.string().trim().regex(/^[a-z][a-z0-9-]{0,30}$/, "Service names use lowercase letters, digits and -."),
  user: z.string().trim().min(1),
  command: z
    .string()
    .trim()
    .min(1, "Service command is required.")
    .max(2_000)
    .refine((value) => !/[\n\r\0]/.test(value), "Service commands must be a single line."),
});

const machineSchema = z.object({
  key: z.string().trim().regex(/^[A-Za-z0-9_-]{1,64}$/),
  hostname,
  template: z.enum(LAB_TEMPLATE_IDS as [LabTemplate, ...LabTemplate[]]),
  memoryMb: z.number().int().min(LAB_LIMITS.memoryMinMb).max(LAB_LIMITS.memoryMaxMb),
  mainUser: z.string().trim().min(1),
  packages: z.array(packageName).max(LAB_LIMITS.packages),
  users: z.array(userSchema).max(LAB_LIMITS.users),
  files: z.array(fileSchema).max(LAB_LIMITS.files),
  buildScript: z.string().max(LAB_LIMITS.scriptChars),
  startScript: z.string().max(LAB_LIMITS.scriptChars),
  services: z.array(serviceSchema).max(LAB_LIMITS.services),
  allowPrivilegeEscalation: z.boolean(),
  rawNetwork: z.boolean(),
});

export const recipeSchema = z
  .object({
    version: z.literal(1),
    entryMachine: z.string().trim().min(1),
    policy: z.object({
      mode: z.enum(["none", "blacklist", "whitelist"]),
      blacklist: z.array(policyEntry).max(LAB_LIMITS.policyEntries),
      whitelist: z.array(policyEntry).max(LAB_LIMITS.policyEntries),
    }),
    machines: z.array(machineSchema).min(1, "Add at least one machine.").max(LAB_LIMITS.machines),
  })
  .superRefine((recipe, ctx) => {
    const hostnames = new Set<string>();
    const keys = new Set<string>();

    recipe.machines.forEach((machine, index) => {
      const label = `Machine ${index + 1} (${machine.hostname})`;

      if (hostnames.has(machine.hostname)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${label}: hostnames must be unique.` });
      }
      hostnames.add(machine.hostname);

      if (keys.has(machine.key)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${label}: duplicate machine key.` });
      }
      keys.add(machine.key);

      const userNames = new Set<string>();
      for (const user of machine.users) {
        if (userNames.has(user.name)) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${label}: user "${user.name}" is listed twice.` });
        }
        userNames.add(user.name);

        if (user.sudo === "commands" && user.sudoCommands.length === 0) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${label}: user "${user.name}" needs at least one sudo command.` });
        }
      }

      const knownUser = (name: string) => name === "root" || userNames.has(name);

      if (!knownUser(machine.mainUser)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${label}: the main user must be root or one of the machine's users.` });
      }

      for (const file of machine.files) {
        const [fileOwner] = file.owner.split(":");
        if (!knownUser(fileOwner)) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${label}: file ${file.path} is owned by unknown user "${fileOwner}".` });
        }
      }

      const totalBytes = machine.files.reduce((sum, file) => sum + file.content.length, 0);
      if (totalBytes > LAB_LIMITS.totalFileBytes) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${label}: files total more than ${LAB_LIMITS.totalFileBytes} characters.` });
      }

      const serviceNames = new Set<string>();
      for (const service of machine.services) {
        if (serviceNames.has(service.name)) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${label}: service "${service.name}" is listed twice.` });
        }
        serviceNames.add(service.name);

        if (!knownUser(service.user)) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${label}: service "${service.name}" runs as unknown user "${service.user}".` });
        }
      }
    });

    if (!recipe.machines.some((machine) => machine.key === recipe.entryMachine)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Choose which machine the terminal opens into." });
    }

    if (recipe.policy.mode === "whitelist" && recipe.policy.whitelist.length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Add at least one allowed command, or choose another command policy." });
    }
  });

export function totalMemoryMb(recipe: Pick<LabRecipe, "machines">) {
  return recipe.machines.reduce((sum, machine) => sum + (Number.isFinite(machine.memoryMb) ? machine.memoryMb : 0), 0);
}

export function homeOf(user: string) {
  return user === "root" ? "/root" : `/home/${user}`;
}

/** Split a textarea into trimmed, non-empty, unique lines. */
export function lines(value: string): string[] {
  return [...new Set(value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean))];
}

// ---------- Defaults and presets ----------

function newKey() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID().slice(0, 8)
    : Math.random().toString(36).slice(2, 10);
}

export function defaultUser(name = "ronak"): LabUser {
  return { name, password: "", shell: "bash", sudo: "none", sudoCommands: [], groups: [] };
}

export function defaultMachine(hostname = "box"): LabMachine {
  return {
    key: newKey(),
    hostname,
    template: "debian",
    memoryMb: LAB_LIMITS.memoryDefaultMb,
    mainUser: "ronak",
    packages: ["less", "nano", "procps", "file"],
    users: [defaultUser("ronak")],
    files: [],
    buildScript: "",
    startScript: "",
    services: [],
    allowPrivilegeEscalation: false,
    rawNetwork: false,
  };
}

export function defaultRecipe(): LabRecipe {
  const machine = defaultMachine("box");
  return {
    version: 1,
    entryMachine: machine.key,
    policy: { mode: "blacklist", blacklist: [...DEFAULT_COMMAND_BLACKLIST], whitelist: [] },
    machines: [machine],
  };
}

export const LAB_PRESETS: { id: string; label: string; description: string; make: () => LabRecipe }[] = [
  {
    id: "single",
    label: "Single Linux box",
    description: "One Debian machine with a hidden clue in the home folder.",
    make: () => {
      const recipe = defaultRecipe();
      recipe.machines[0].files = [
        {
          path: "~/README.txt",
          owner: "ronak",
          mode: "644",
          content: "Welcome to Cyber Box.\n\nStart with:\n  pwd\n  whoami\n  ls -la\n",
        },
        {
          path: "~/.first-clue",
          owner: "ronak",
          mode: "644",
          content: "Clue found! A filename beginning with a dot is normally hidden.\n",
        },
      ];
      return recipe;
    },
  },
  {
    id: "privesc",
    label: "Privilege escalation box",
    description: "A user with a misconfigured sudo rule and a root-only flag.",
    make: () => {
      const recipe = defaultRecipe();
      const machine = recipe.machines[0];
      machine.hostname = "target";
      machine.allowPrivilegeEscalation = true;
      machine.packages = ["less", "nano", "procps", "findutils"];
      machine.users = [
        { ...defaultUser("ronak"), sudo: "commands", sudoCommands: ["/usr/bin/find"] },
      ];
      machine.files = [
        { path: "/root/flag.txt", owner: "root", mode: "600", content: "cyberbox{change_this_flag}\n" },
        {
          path: "~/notes.txt",
          owner: "ronak",
          mode: "644",
          content: "The admin said I can run one command as root. Which one? Try: sudo -l\n",
        },
      ];
      recipe.policy = { mode: "none", blacklist: [], whitelist: [] };
      return recipe;
    },
  },
  {
    id: "web-target",
    label: "Attacker + web target",
    description: "Two machines: a shell box and a small web server reachable at http://web.",
    make: () => {
      const attacker = defaultMachine("attacker");
      attacker.packages = ["curl", "less", "nano", "procps", "dnsutils", "netcat-openbsd"];
      attacker.memoryMb = 96;

      const web = defaultMachine("web");
      web.template = "python";
      web.memoryMb = 128;
      web.mainUser = "www";
      web.packages = [];
      web.users = [{ ...defaultUser("www"), shell: "sh" }];
      web.files = [
        {
          path: "/srv/site/index.html",
          owner: "www",
          mode: "644",
          content: "<h1>Internal portal</h1>\n<!-- TODO: remove /secret-backup.txt before launch -->\n",
        },
        { path: "/srv/site/secret-backup.txt", owner: "www", mode: "644", content: "cyberbox{change_this_flag}\n" },
      ];
      web.services = [{ name: "http", user: "www", command: "cd /srv/site && python3 -m http.server 80" }];
      web.buildScript = "";

      return {
        version: 1,
        entryMachine: attacker.key,
        policy: { mode: "blacklist", blacklist: [...DEFAULT_COMMAND_BLACKLIST], whitelist: [] },
        machines: [attacker, web],
      };
    },
  },
];

/** Stable JSON used for hashing, so a rebuild is only suggested when the recipe really changed. */
export function canonicalRecipe(recipe: LabRecipe): string {
  return JSON.stringify(recipe);
}

function clean(list: string[]): string[] {
  return [...new Set(list.map((item) => item.trim()).filter(Boolean))];
}

/**
 * Trim and de-duplicate the list fields so the editor can hold raw,
 * mid-typing textarea text while validation and storage stay clean.
 * Returns a plain object (unknown shape) to be handed to recipeSchema.
 */
export function normalizeRecipe(value: unknown): unknown {
  if (!value || typeof value !== "object") return value;
  const recipe = value as Record<string, unknown>;

  const policy = (recipe.policy ?? {}) as Record<string, unknown>;
  const machines = Array.isArray(recipe.machines) ? recipe.machines : [];

  return {
    ...recipe,
    policy: {
      ...policy,
      blacklist: clean((policy.blacklist as string[]) ?? []),
      whitelist: clean((policy.whitelist as string[]) ?? []),
    },
    machines: machines.map((raw) => {
      const machine = (raw ?? {}) as Record<string, unknown>;
      const users = Array.isArray(machine.users) ? machine.users : [];
      return {
        ...machine,
        packages: clean((machine.packages as string[]) ?? []),
        users: users.map((rawUser) => {
          const user = (rawUser ?? {}) as Record<string, unknown>;
          return {
            ...user,
            groups: clean((user.groups as string[]) ?? []),
            sudoCommands: clean((user.sudoCommands as string[]) ?? []),
          };
        }),
      };
    }),
  };
}
