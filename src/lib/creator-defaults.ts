export const DEFAULT_LAB_POINTS = 100;
export const DEFAULT_LAB_USER = "Ronak";

export const DEFAULT_COMMAND_BLACKLIST = [
  "sudo",
  "su",
  "passwd",
  "chpasswd",
  "shutdown",
  "reboot",
  "poweroff",
  "halt",
  "init",
  "systemctl",
  "service",
  "mount",
  "umount",
  "mkfs",
  "fdisk",
  "parted",
  "dd",
  "iptables",
  "nft",
  "ufw",
  "useradd",
  "adduser",
  "userdel",
  "deluser",
  "groupadd",
  "groupdel",
  "visudo",
  "crontab",
  "kill",
  "killall",
  "pkill",
  "docker",
  "containerd",
  "nsenter",
  "unshare",
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
