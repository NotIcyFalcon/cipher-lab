export const DEFAULT_LAB_POINTS = 100;
export const DEFAULT_LAB_USER = "ronak";

/**
 * Default "Block listed commands" policy for new labs. Entries are matched
 * against the command name (glob patterns such as mkfs* are allowed) or, for
 * entries containing a space, against the start of the typed command line.
 * This is a teaching guardrail; for hard limits, leave the program out of the
 * machine (or delete it in the build script).
 */
export const DEFAULT_COMMAND_BLACKLIST = [
  "sudo",
  "su",
  "passwd",
  "chpasswd",
  "chsh",
  "chfn",
  "shutdown",
  "reboot",
  "poweroff",
  "halt",
  "init",
  "telinit",
  "systemctl",
  "service",
  "mount",
  "umount",
  "mkfs*",
  "fdisk",
  "sfdisk",
  "parted",
  "dd",
  "iptables*",
  "ip6tables*",
  "nft",
  "ufw",
  "useradd",
  "adduser",
  "userdel",
  "deluser",
  "usermod",
  "groupadd",
  "groupdel",
  "visudo",
  "crontab",
  "insmod",
  "rmmod",
  "modprobe",
  "chroot",
  "nsenter",
  "unshare",
  "docker",
  "containerd",
  "ctr",
  "kill",
  "killall",
  "pkill",
  "chmod 777",
  "rm -rf /",
  "rm -rf /*",
] as const;

export function learningLabPoints(value: unknown): number {
  // Existing blocks did not have a points property.
  if (value === undefined) return DEFAULT_LAB_POINTS;

  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < 0 ||
    value > 1_000_000
  ) {
    throw new Error("Lab points must be an integer between 0 and 1000000.");
  }

  return value;
}
