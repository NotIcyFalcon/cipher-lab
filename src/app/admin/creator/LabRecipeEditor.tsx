"use client";

import { Plus } from "lucide-react";
import {
  TextField,
  NumberField,
  SelectField,
  CheckField,
  ListControls,
  moveItem,
} from "./fields";
import {
  LAB_TEMPLATES,
  LAB_TEMPLATE_IDS,
  LAB_LIMITS,
  LAB_PRESETS,
  DEFAULT_LAB_MEMORY_BUDGET_MB,
  defaultMachine,
  defaultUser,
  totalMemoryMb,
  type LabRecipe,
  type LabMachine,
  type LabUser,
  type LabFile,
  type LabService,
  type SudoMode,
  type PolicyMode,
} from "@/lib/lab-recipe";

// Raw newline split for list textareas (kept untrimmed so typing is smooth;
// the server trims and de-duplicates on save).
function toLines(text: string): string[] {
  return text.split("\n");
}

function UserEditor({
  user,
  index,
  length,
  onChange,
  onRemove,
  onMove,
}: {
  user: LabUser;
  index: number;
  length: number;
  onChange: (user: LabUser) => void;
  onRemove: () => void;
  onMove: (direction: -1 | 1) => void;
}) {
  return (
    <section className="creator-child">
      <div className="creator-section-heading">
        <h4>User {index + 1}{user.name ? `: ${user.name}` : ""}</h4>
        <ListControls label={`user ${index + 1}`} index={index} length={length} onMove={onMove} onRemove={onRemove} />
      </div>

      <div className="creator-two-columns">
        <TextField label="Username" value={user.name} required maxLength={31} placeholder="ronak"
          onChange={(name) => onChange({ ...user, name })} />
        <TextField label="Password (blank = no login password)" value={user.password} maxLength={128}
          onChange={(password) => onChange({ ...user, password })} />
      </div>

      <div className="creator-two-columns">
        <SelectField label="Login shell" value={user.shell} onChange={(shell) => onChange({ ...user, shell: shell as "bash" | "sh" })}>
          <option value="bash">bash</option>
          <option value="sh">sh</option>
        </SelectField>
        <SelectField label="Sudo access" value={user.sudo} onChange={(sudo) => onChange({ ...user, sudo: sudo as SudoMode })}>
          <option value="none">No sudo</option>
          <option value="all">Full sudo (NOPASSWD)</option>
          <option value="commands">Only specific commands</option>
        </SelectField>
      </div>

      {user.sudo === "commands" && (
        <TextField label="Allowed sudo commands — one absolute path per line" multiline code rows={3} maxLength={4_000}
          value={user.sudoCommands.join("\n")} placeholder="/usr/bin/find"
          onChange={(text) => onChange({ ...user, sudoCommands: toLines(text) })} />
      )}

      <TextField label="Extra groups — one per line" multiline rows={2} maxLength={2_000}
        value={user.groups.join("\n")} placeholder="sudo"
        onChange={(text) => onChange({ ...user, groups: toLines(text) })} />
    </section>
  );
}

export function FileEditor({
  file,
  index,
  length,
  userOptions,
  onChange,
  onRemove,
  onMove,
}: {
  file: LabFile;
  index: number;
  length: number;
  userOptions: string[];
  onChange: (file: LabFile) => void;
  onRemove: () => void;
  onMove: (direction: -1 | 1) => void;
}) {
  return (
    <section className="creator-child">
      <div className="creator-section-heading">
        <h4>File {index + 1}{file.path ? `: ${file.path}` : ""}</h4>
        <ListControls label={`file ${index + 1}`} index={index} length={length} onMove={onMove} onRemove={onRemove} />
      </div>

      <TextField label="Path (absolute, or ~/ for the owner's home)" value={file.path} required maxLength={255}
        placeholder="~/README.txt" onChange={(path) => onChange({ ...file, path })} />

      <div className="creator-two-columns">
        <SelectField label="Owner" value={file.owner} onChange={(owner) => onChange({ ...file, owner })}>
          {userOptions.map((name) => (
            <option key={name} value={name}>{name}</option>
          ))}
        </SelectField>
        <TextField label="Mode (octal)" value={file.mode} maxLength={4} placeholder="644"
          onChange={(mode) => onChange({ ...file, mode })} />
      </div>

      <TextField label="Contents" multiline code rows={5} maxLength={LAB_LIMITS.fileBytes}
        value={file.content} onChange={(content) => onChange({ ...file, content })} />
    </section>
  );
}

function ServiceEditor({
  service,
  index,
  length,
  userOptions,
  onChange,
  onRemove,
  onMove,
}: {
  service: LabService;
  index: number;
  length: number;
  userOptions: string[];
  onChange: (service: LabService) => void;
  onRemove: () => void;
  onMove: (direction: -1 | 1) => void;
}) {
  return (
    <section className="creator-child">
      <div className="creator-section-heading">
        <h4>Service {index + 1}{service.name ? `: ${service.name}` : ""}</h4>
        <ListControls label={`service ${index + 1}`} index={index} length={length} onMove={onMove} onRemove={onRemove} />
      </div>

      <div className="creator-two-columns">
        <TextField label="Name" value={service.name} required maxLength={30} placeholder="http"
          onChange={(name) => onChange({ ...service, name })} />
        <SelectField label="Run as" value={service.user} onChange={(user) => onChange({ ...service, user })}>
          {userOptions.map((name) => (
            <option key={name} value={name}>{name}</option>
          ))}
        </SelectField>
      </div>

      <TextField label="Command (one line, runs at session start)" value={service.command} required maxLength={2_000}
        placeholder="cd /srv/site && python3 -m http.server 80"
        onChange={(command) => onChange({ ...service, command })} />
    </section>
  );
}

function MachineEditor({
  machine,
  index,
  length,
  isEntry,
  onChange,
  onRemove,
  onMove,
}: {
  machine: LabMachine;
  index: number;
  length: number;
  isEntry: boolean;
  onChange: (machine: LabMachine) => void;
  onRemove: () => void;
  onMove: (direction: -1 | 1) => void;
}) {
  const userOptions = ["root", ...machine.users.map((u) => u.name).filter(Boolean)];

  const update = <K extends keyof LabMachine>(key: K, value: LabMachine[K]) =>
    onChange({ ...machine, [key]: value });

  return (
    <section className="creator-child creator-machine">
      <div className="creator-section-heading">
        <div>
          <h3>Machine {index + 1}{isEntry ? " · entry" : ""}</h3>
          <p>{LAB_TEMPLATES[machine.template].hint}</p>
        </div>
        <ListControls
          label={`machine ${index + 1}`}
          index={index}
          length={length}
          onMove={onMove}
          onRemove={onRemove}
          reorder={length > 1}
        />
      </div>

      <div className="creator-two-columns">
        <TextField label="Hostname (how other machines reach it)" value={machine.hostname} required maxLength={30}
          placeholder="box" onChange={(hostname) => update("hostname", hostname)} />
        <SelectField label="Base image" value={machine.template} onChange={(t) => update("template", t as LabMachine["template"])}>
          {LAB_TEMPLATE_IDS.map((id) => (
            <option key={id} value={id}>{LAB_TEMPLATES[id].label}</option>
          ))}
        </SelectField>
      </div>

      <div className="creator-two-columns">
        <NumberField label={`Memory (MB, ${LAB_LIMITS.memoryMinMb}–${LAB_LIMITS.memoryMaxMb})`} value={machine.memoryMb}
          min={LAB_LIMITS.memoryMinMb} max={LAB_LIMITS.memoryMaxMb} onChange={(memoryMb) => update("memoryMb", memoryMb)} />
        <SelectField label="Terminal opens as (entry machine only)" value={machine.mainUser}
          onChange={(mainUser) => update("mainUser", mainUser)}>
          {userOptions.map((name) => (
            <option key={name} value={name}>{name}</option>
          ))}
        </SelectField>
      </div>

      <TextField label="Packages to install — one per line (apt/apk names)" multiline code rows={3} maxLength={6_000}
        value={machine.packages.join("\n")} placeholder={"curl\nnano"}
        onChange={(text) => update("packages", toLines(text))} />

      {/* Users */}
      <div className="creator-section-heading" style={{ marginTop: "0.75rem" }}>
        <h4>Users</h4>
        <span className="creator-count">{machine.users.length}/{LAB_LIMITS.users}</span>
      </div>
      {machine.users.map((user, userIndex) => (
        <UserEditor
          key={userIndex}
          user={user}
          index={userIndex}
          length={machine.users.length}
          onChange={(updated) => update("users", machine.users.map((u, i) => (i === userIndex ? updated : u)))}
          onRemove={() => update("users", machine.users.filter((_, i) => i !== userIndex))}
          onMove={(dir) => update("users", moveItem(machine.users, userIndex, dir))}
        />
      ))}
      <button type="button" className="secondary-button" disabled={machine.users.length >= LAB_LIMITS.users}
        onClick={() => update("users", [...machine.users, defaultUser(`user${machine.users.length + 1}`)])}>
        <Plus size={14} aria-hidden="true" /> Add user
      </button>

      {/* Files */}
      <div className="creator-section-heading" style={{ marginTop: "0.75rem" }}>
        <h4>Files</h4>
        <span className="creator-count">{machine.files.length}/{LAB_LIMITS.files}</span>
      </div>
      {machine.files.map((file, fileIndex) => (
        <FileEditor
          key={fileIndex}
          file={file}
          index={fileIndex}
          length={machine.files.length}
          userOptions={userOptions}
          onChange={(updated) => update("files", machine.files.map((f, i) => (i === fileIndex ? updated : f)))}
          onRemove={() => update("files", machine.files.filter((_, i) => i !== fileIndex))}
          onMove={(dir) => update("files", moveItem(machine.files, fileIndex, dir))}
        />
      ))}
      <button type="button" className="secondary-button" disabled={machine.files.length >= LAB_LIMITS.files}
        onClick={() => update("files", [...machine.files, { path: "", owner: machine.mainUser || "root", mode: "644", content: "" }])}>
        <Plus size={14} aria-hidden="true" /> Add file
      </button>

      {/* Build + start scripts */}
      <TextField label="Build script (bash, as root, in the main user's home, once at build time, internet available; the build fails if it exits non-zero)" multiline code rows={5} maxLength={LAB_LIMITS.scriptChars}
        value={machine.buildScript} placeholder={"# installed after packages; set up the environment\nchmod u+s /usr/bin/find"}
        onChange={(buildScript) => update("buildScript", buildScript)} />

      <TextField label="Start script (bash, as root, in the main user's home, every time a session starts, no internet)" multiline code rows={3} maxLength={LAB_LIMITS.scriptChars}
        value={machine.startScript} placeholder={"# regenerate a per-session flag, start extra processes…"}
        onChange={(startScript) => update("startScript", startScript)} />

      {/* Services */}
      <div className="creator-section-heading" style={{ marginTop: "0.75rem" }}>
        <h4>Background services</h4>
        <span className="creator-count">{machine.services.length}/{LAB_LIMITS.services}</span>
      </div>
      {machine.services.map((service, serviceIndex) => (
        <ServiceEditor
          key={serviceIndex}
          service={service}
          index={serviceIndex}
          length={machine.services.length}
          userOptions={userOptions}
          onChange={(updated) => update("services", machine.services.map((s, i) => (i === serviceIndex ? updated : s)))}
          onRemove={() => update("services", machine.services.filter((_, i) => i !== serviceIndex))}
          onMove={(dir) => update("services", moveItem(machine.services, serviceIndex, dir))}
        />
      ))}
      <button type="button" className="secondary-button" disabled={machine.services.length >= LAB_LIMITS.services}
        onClick={() => update("services", [...machine.services, { name: "", user: machine.mainUser || "root", command: "" }])}>
        <Plus size={14} aria-hidden="true" /> Add service
      </button>

      <div className="creator-stack" style={{ marginTop: "0.75rem" }}>
        <CheckField label="Allow privilege escalation (sudo / SUID can gain root)"
          checked={machine.allowPrivilegeEscalation}
          onChange={(v) => update("allowPrivilegeEscalation", v)} />
        <CheckField label="Allow raw network tools (ping, nmap SYN scans)"
          checked={machine.rawNetwork}
          onChange={(v) => update("rawNetwork", v)} />
      </div>
    </section>
  );
}

export default function LabRecipeEditor({
  recipe,
  onChange,
}: {
  recipe: LabRecipe;
  onChange: (recipe: LabRecipe) => void;
}) {
  const memory = totalMemoryMb(recipe);
  const overBudget = memory > DEFAULT_LAB_MEMORY_BUDGET_MB;

  const setMachine = (index: number, machine: LabMachine) =>
    onChange({ ...recipe, machines: recipe.machines.map((m, i) => (i === index ? machine : m)) });

  const activePolicyList = recipe.policy.mode === "whitelist" ? recipe.policy.whitelist : recipe.policy.blacklist;

  return (
    <div className="creator-stack creator-recipe">
      {/* Presets */}
      <div className="creator-section-heading">
        <div>
          <h3>Lab machines</h3>
          <p>Start from a preset, then customise. Building creates one image per machine.</p>
        </div>
        <span className={`creator-count${overBudget ? " creator-danger-text" : ""}`}>
          {memory} / {DEFAULT_LAB_MEMORY_BUDGET_MB} MB
        </span>
      </div>

      <div className="creator-button-row">
        {LAB_PRESETS.map((preset) => (
          <button key={preset.id} type="button" className="secondary-button" title={preset.description}
            onClick={() => {
              if (window.confirm(`Replace the current recipe with the "${preset.label}" preset?`)) {
                onChange(preset.make());
              }
            }}>
            {preset.label}
          </button>
        ))}
      </div>

      {overBudget && (
        <p className="creator-inline-error">
          The machines request more memory than a single lab session may use ({DEFAULT_LAB_MEMORY_BUDGET_MB} MB). Reduce machine memory before saving.
        </p>
      )}

      {recipe.machines.map((machine, index) => (
        <MachineEditor
          key={machine.key}
          machine={machine}
          index={index}
          length={recipe.machines.length}
          isEntry={machine.key === recipe.entryMachine}
          onChange={(updated) => setMachine(index, updated)}
          onRemove={() => {
            const machines = recipe.machines.filter((_, i) => i !== index);
            const entryMachine = machine.key === recipe.entryMachine ? machines[0]?.key ?? "" : recipe.entryMachine;
            onChange({ ...recipe, machines, entryMachine });
          }}
          onMove={(dir) => onChange({ ...recipe, machines: moveItem(recipe.machines, index, dir) })}
        />
      ))}

      <button type="button" className="secondary-button" disabled={recipe.machines.length >= LAB_LIMITS.machines}
        onClick={() => onChange({ ...recipe, machines: [...recipe.machines, defaultMachine(`box${recipe.machines.length + 1}`)] })}>
        <Plus size={16} aria-hidden="true" /> Add machine
      </button>

      {recipe.machines.length > 1 && (
        <SelectField label="Terminal opens into" value={recipe.entryMachine}
          onChange={(entryMachine) => onChange({ ...recipe, entryMachine })}>
          {recipe.machines.map((m) => (
            <option key={m.key} value={m.key}>{m.hostname || "(unnamed)"}</option>
          ))}
        </SelectField>
      )}

      {/* Command policy */}
      <div className="creator-section-heading" style={{ marginTop: "1rem" }}>
        <div>
          <h3>Command policy (entry terminal)</h3>
          <p>A teaching guardrail. For a hard limit, leave the program out of the machine.</p>
        </div>
      </div>

      <SelectField label="Policy" value={recipe.policy.mode}
        onChange={(mode) => onChange({ ...recipe, policy: { ...recipe.policy, mode: mode as PolicyMode } })}>
        <option value="none">No restrictions</option>
        <option value="blacklist">Block listed commands</option>
        <option value="whitelist">Allow only listed commands</option>
      </SelectField>

      {recipe.policy.mode !== "none" && (
        <TextField
          label={recipe.policy.mode === "whitelist"
            ? "Allowed commands — one per line (bare names; bash and sh are always allowed)"
            : "Blocked commands — one per line (names; glob like mkfs* ; or a prefix like 'rm -rf /')"}
          multiline code rows={8} maxLength={10_000}
          value={activePolicyList.join("\n")}
          onChange={(text) =>
            onChange({
              ...recipe,
              policy:
                recipe.policy.mode === "whitelist"
                  ? { ...recipe.policy, whitelist: toLines(text) }
                  : { ...recipe.policy, blacklist: toLines(text) },
            })
          }
        />
      )}
    </div>
  );
}
