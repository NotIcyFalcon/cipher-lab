// Turns one machine of a lab recipe into a Docker build context:
// a Dockerfile, a root provision script (build time) and an entrypoint
// (start time). Pure string generation — no Docker calls — so it can be
// tested on its own.

const TEMPLATE_IMAGES = {
  debian: { image: "debian:bookworm-slim", family: "apt" },
  ubuntu: { image: "ubuntu:24.04", family: "apt" },
  alpine: { image: "alpine:3.20", family: "apk" },
  python: { image: "python:3.12-slim-bookworm", family: "apt" },
  kali: { image: "kalilinux/kali-rolling", family: "apt" },
};

// Single-quote a string for safe embedding in a POSIX shell script.
function sq(value) {
  return "'" + String(value).replace(/'/g, "'\\''") + "'";
}

function homeOf(user) {
  return user === "root" ? "/root" : `/home/${user}`;
}

function resolvePath(path, owner) {
  if (path.startsWith("~/")) {
    return homeOf(owner.split(":")[0]) + "/" + path.slice(2);
  }
  return path;
}

// Bake the command policy into the image so the entry terminal can use it.
// Both modes use a bash rcfile with a DEBUG trap (extdebug makes a non-zero
// return skip the command). whitelist additionally restricts PATH to a
// directory of symlinks to the allowed commands, so a non-allowed binary is
// not even found by name. This is a teaching guardrail, not a hard boundary;
// for a real limit, leave the program out of the machine.
function guardCommon(l) {
  l.push("[ -f /etc/profile ] && . /etc/profile 2>/dev/null");
  l.push('[ -f "$HOME/.bashrc" ] && . "$HOME/.bashrc" 2>/dev/null');
  l.push("shopt -s extdebug");
  l.push("__cb_block() {");
  l.push('  printf "\\033[33mcyberbox: \\"%s\\" is not allowed in this lab.\\033[0m\\n" "$1" >&2');
  l.push("}");
}

// A bash array literal of single-quoted, policy-validated entries (entries
// contain no quotes or newlines, enforced by the recipe schema).
function bashArray(entries) {
  return "(" + entries.map((e) => "'" + String(e).replace(/'/g, "") + "'").join(" ") + ")";
}

function policySetup(policy) {
  if (!policy || policy.mode === "none") return [];
  const l = ["", "# ---- command policy ----", "install -d /cyberbox"];

  if (policy.mode === "whitelist") {
    const names = new Set(["bash", "sh"]);
    l.push("install -d -m 0755 /cyberbox/allowed");
    for (const entry of policy.whitelist) {
      // Only bare command names can be allowed; "cmd arg" entries are ignored.
      if (/\s/.test(entry)) continue;
      const name = basename(entry);
      names.add(name);
      l.push(`__p="$(command -v ${sq(entry)} 2>/dev/null || true)"; [ -n "$__p" ] && ln -sf "$__p" /cyberbox/allowed/${sq(name)} || true`);
    }
    l.push('for __b in bash sh; do __p="$(command -v "$__b" 2>/dev/null || true)"; [ -n "$__p" ] && ln -sf "$__p" /cyberbox/allowed/"$__b" || true; done');

    l.push("cat > /cyberbox/guard.bash <<'CBGUARD'");
    guardCommon(l);
    // Re-assert the restricted PATH in case /etc/profile reset it.
    l.push("PATH=/cyberbox/allowed; export PATH");
    l.push(`declare -A __cb_allow`);
    const words = [...names].map((n) => "'" + n.replace(/'/g, "") + "'").join(" ");
    l.push(`for __n in ${words}; do __cb_allow["$__n"]=1; done`);
    l.push("__cb_check() {");
    l.push('  local c="$BASH_COMMAND" first base');
    l.push('  case "$c" in __cb_*|"") return 0;; esac');
    l.push('  first="${c%% *}"; base="${first##*/}"');
    l.push('  [[ -n ${__cb_allow["$base"]} ]] && return 0');
    l.push('  __cb_block "$base"; return 1');
    l.push("}");
    l.push("trap __cb_check DEBUG");
    l.push('PS1="\\u@\\h:\\w\\$ "');
    l.push("CBGUARD");
  } else {
    l.push("cat > /cyberbox/guard.bash <<'CBGUARD'");
    guardCommon(l);
    l.push(`__cb_deny=${bashArray(policy.blacklist)}`);
    l.push("__cb_check() {");
    l.push('  local c="$BASH_COMMAND" first base rule');
    l.push('  case "$c" in __cb_*|"") return 0;; esac');
    l.push('  first="${c%% *}"; base="${first##*/}"');
    l.push('  for rule in "${__cb_deny[@]}"; do');
    l.push('    case "$rule" in');
    l.push('      *" "*) case "$c" in $rule*) __cb_block "$rule"; return 1;; esac;;');
    l.push('      *) case "$base" in $rule) __cb_block "$rule"; return 1;; esac;;');
    l.push('    esac');
    l.push('  done');
    l.push("  return 0");
    l.push("}");
    l.push("trap __cb_check DEBUG");
    l.push('PS1="\\u@\\h:\\w\\$ "');
    l.push("CBGUARD");
  }

  l.push("chmod 0644 /cyberbox/guard.bash");
  return l;
}

function provisionScript(machine, family, policy) {
  const l = [];
  l.push("#!/bin/sh");
  l.push("set -eu");
  l.push("");

  // Base tools every lab needs: a shell, sudo, and an account-management base.
  if (family === "apk") {
    l.push("apk add --no-cache bash shadow sudo coreutils >/dev/null");
    if (machine.packages.length) {
      l.push(`apk add --no-cache ${machine.packages.map(sq).join(" ")}`);
    }
  } else {
    l.push("export DEBIAN_FRONTEND=noninteractive");
    l.push("apt-get update");
    l.push("apt-get install -y --no-install-recommends bash sudo passwd coreutils ca-certificates");
    if (machine.packages.length) {
      l.push(`apt-get install -y --no-install-recommends ${machine.packages.map(sq).join(" ")}`);
    }
    l.push("rm -rf /var/lib/apt/lists/*");
  }
  l.push("");

  // Users
  for (const user of machine.users) {
    const home = homeOf(user.name);
    const shell = user.shell === "sh" ? "/bin/sh" : "/bin/bash";
    l.push(`useradd --create-home --home-dir ${sq(home)} --shell ${shell} ${sq(user.name)} 2>/dev/null || true`);
    if (user.password) {
      l.push(`printf '%s:%s' ${sq(user.name)} ${sq(user.password)} | chpasswd`);
    } else {
      // No interactive password login; the terminal uses docker exec.
      l.push(`passwd -l ${sq(user.name)} >/dev/null 2>&1 || true`);
    }
    for (const group of user.groups) {
      l.push(`groupadd -f ${sq(group)}`);
      l.push(`usermod -aG ${sq(group)} ${sq(user.name)}`);
    }
    if (user.sudo === "all") {
      l.push(`printf '%s ALL=(ALL) NOPASSWD:ALL\\n' ${sq(user.name)} > /etc/sudoers.d/90-${user.name}`);
      l.push(`chmod 440 /etc/sudoers.d/90-${user.name}`);
    } else if (user.sudo === "commands" && user.sudoCommands.length) {
      const spec = user.sudoCommands.join(", ");
      l.push(`printf '%s ALL=(ALL) NOPASSWD: %s\\n' ${sq(user.name)} ${sq(spec)} > /etc/sudoers.d/90-${user.name}`);
      l.push(`chmod 440 /etc/sudoers.d/90-${user.name}`);
    }
  }
  l.push("");

  // Files (staged into /cyberbox/files by the Dockerfile COPY)
  machine.files.forEach((file, index) => {
    const dest = resolvePath(file.path, file.owner);
    const staged = `/cyberbox/files/${index}`;
    l.push(`install -d ${sq(dirname(dest))}`);
    l.push(`cp ${sq(staged)} ${sq(dest)}`);
    l.push(`chown ${sq(file.owner)} ${sq(dest)}`);
    l.push(`chmod ${sq(file.mode)} ${sq(dest)}`);
  });
  if (machine.files.length) l.push("rm -rf /cyberbox/files");
  l.push("");

  // Admin-authored build script, run as root with network available.
  if (machine.buildScript.trim()) {
    l.push("# ---- build script ----");
    l.push(machine.buildScript);
  }

  l.push(...policySetup(policy));

  return l.join("\n") + "\n";
}

function entrypointScript(machine) {
  const l = [];
  l.push("#!/bin/sh");
  l.push("# Runs each time a lab session starts. No network here.");
  l.push("set -u");
  l.push("mkdir -p /cyberbox/log");
  l.push("");

  for (const service of machine.services) {
    const log = `/cyberbox/log/${service.name}.log`;
    if (service.user === "root") {
      l.push(`( ${service.command} ) >${sq(log)} 2>&1 &`);
    } else {
      l.push(`su ${sq(service.user)} -c ${sq(service.command)} >${sq(log)} 2>&1 &`);
    }
  }
  if (machine.services.length) l.push("");

  if (machine.startScript.trim()) {
    l.push("# ---- start script ----");
    l.push(machine.startScript);
    l.push("");
  }

  // Keep the container alive; tini (Init: true) reaps the backgrounded services.
  l.push("exec tail -f /dev/null");
  return l.join("\n") + "\n";
}

export function renderMachine(machine, policy) {
  const template = TEMPLATE_IMAGES[machine.template];
  if (!template) throw new Error(`Unknown template: ${machine.template}`);

  const provision = provisionScript(machine, template.family, policy);
  const entrypoint = entrypointScript(machine);

  const dockerfile = [
    `FROM ${template.image}`,
    "LABEL cyberbox.kind=lab",
    "WORKDIR /root",
    "COPY cyberbox/ /cyberbox/",
    "RUN chmod +x /cyberbox/provision.sh /cyberbox/entrypoint.sh \\",
    " && /cyberbox/provision.sh \\",
    " && rm -f /cyberbox/provision.sh",
    'ENTRYPOINT ["/cyberbox/entrypoint.sh"]',
    "",
  ].join("\n");

  const context = [
    { name: "Dockerfile", content: dockerfile, mode: 0o644 },
    { name: "cyberbox/provision.sh", content: provision, mode: 0o755 },
    { name: "cyberbox/entrypoint.sh", content: entrypoint, mode: 0o755 },
  ];

  machine.files.forEach((file, index) => {
    context.push({ name: `cyberbox/files/${index}`, content: file.content, mode: 0o644 });
  });

  return { dockerfile, context, mainUser: machine.mainUser };
}

function dirname(path) {
  const index = path.lastIndexOf("/");
  return index <= 0 ? "/" : path.slice(0, index);
}

function basename(path) {
  return path.slice(path.lastIndexOf("/") + 1);
}

export { homeOf, resolvePath };
