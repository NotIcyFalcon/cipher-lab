#!/usr/bin/env python3

import base64
import ctypes
import errno
import hashlib
import json
import os
import resource
import selectors
import shutil
import signal
import stat
import subprocess
import sys
import time

UID = 10001
GID = 10001

SCRIPT_LIMIT = 64 * 1024
OUTPUT_LIMIT = 64 * 1024
TREE_BYTES_LIMIT = 32 * 1024 * 1024
TREE_ENTRIES_LIMIT = 4000
STEP_SECONDS = 2.5
JOB_SECONDS = 880

ROOT = "/jails/current"
STATE = "/jails/state"

libc = ctypes.CDLL(None, use_errno=True)
job_deadline = time.monotonic() + JOB_SECONDS


class ConfigurationError(Exception):
    pass


class TreeError(Exception):
    pass


def check_deadline():
    if time.monotonic() >= job_deadline:
        raise ConfigurationError("Job deadline exceeded.")


def valid_script(value, nonempty=False):
    if not isinstance(value, str):
        return False
    if "\0" in value or len(value.encode("utf-8")) > SCRIPT_LIMIT:
        return False
    return not nonempty or bool(value.strip())


def validate(job):
    if not isinstance(job, dict):
        raise ConfigurationError("Invalid job.")

    if not valid_script(job.get("scriptContent"), True):
        raise ConfigurationError("Invalid submission.")
    if not valid_script(job.get("standardSolution"), True):
        raise ConfigurationError("Invalid reference solution.")

    tests = job.get("testCases")
    if not isinstance(tests, list) or not 1 <= len(tests) <= 100:
        raise ConfigurationError("Invalid test count.")

    base = job.get("baseXp")
    if type(base) is not int or not 0 <= base <= 1_000_000:
        raise ConfigurationError("Invalid base XP.")

    ids = set()
    total = base

    for test in tests:
        if not isinstance(test, dict):
            raise ConfigurationError("Invalid test.")
        test_id = test.get("id")
        if (
            not isinstance(test_id, str)
            or not 1 <= len(test_id) <= 200
            or test_id in ids
        ):
            raise ConfigurationError("Invalid test identity.")
        ids.add(test_id)

        if not valid_script(test.get("setupScript")):
            raise ConfigurationError("Invalid setup.")
        if type(test.get("hidden")) is not bool:
            raise ConfigurationError("Invalid visibility.")

        xp = test.get("xpReward")
        if type(xp) is not int or not 0 <= xp <= 1_000_000:
            raise ConfigurationError("Invalid test XP.")
        total += xp

    if type(job.get("totalPoints")) is not int:
        raise ConfigurationError("Invalid total XP.")
    if total <= 0 or total != job["totalPoints"]:
        raise ConfigurationError("Inconsistent total XP.")


def kill_student_processes():
    # kill(-1) is evaluated in the kernel against the sender's UID.
    # The helper has the same UID as sandbox processes, not the supervisor.
    pid = os.fork()
    if pid == 0:
        try:
            os.setgroups([])
            os.setgid(GID)
            os.setuid(UID)
            os.kill(-1, signal.SIGKILL)
        finally:
            os._exit(0)

    os.waitpid(pid, 0)

    # Never inspect a filesystem while a surviving learner process can mutate it.
    deadline = time.monotonic() + 1.0
    while time.monotonic() < deadline:
        alive = False
        for name in os.listdir("/proc"):
            if not name.isdigit():
                continue
            try:
                with open("/proc/" + name + "/status", encoding="ascii") as f:
                    content = f.read()
                uid_line = next(
                    line for line in content.splitlines()
                    if line.startswith("Uid:")
                )
                state_line = next(
                    line for line in content.splitlines()
                    if line.startswith("State:")
                )
                if int(uid_line.split()[1]) == UID and "Z" not in state_line:
                    alive = True
                    break
            except (FileNotFoundError, ProcessLookupError, StopIteration):
                continue
        if not alive:
            return
        time.sleep(0.01)

    raise ConfigurationError("Sandbox processes did not terminate.")


def remove_tree(path):
    if os.path.lexists(path):
        shutil.rmtree(path)


def new_jail(initial=None):
    check_deadline()
    remove_tree(ROOT)
    shutil.copytree("/opt/runtime", ROOT, symlinks=True)

    for name in ("work", "tmp"):
        os.chmod(ROOT + "/" + name, 0o700)
        os.chown(ROOT + "/" + name, UID, GID)

    # A real null device, created by the trusted image supervisor.
    # CAP_MKNOD is intentionally not required: copy the device through
    # /proc/self/fd is not used. /dev/null is supplied as a regular writable
    # sink file instead; Bash redirections remain supported.
    null = ROOT + "/dev/null"
    with open(null, "wb"):
        pass
    os.chmod(null, 0o666)

    if initial:
        clone_state(initial, ROOT + "/work")


def clone_state(source, destination):
    # Clone only the setup /work tree. Do not follow symlinks.
    def clone(src, dst):
        metadata = os.lstat(src)

        if stat.S_ISDIR(metadata.st_mode):
            if not os.path.exists(dst):
                os.mkdir(dst, 0o700)

            for entry in os.scandir(src):
                clone(entry.path, os.path.join(dst, entry.name))

            os.chmod(dst, stat.S_IMODE(metadata.st_mode))
            os.chown(dst, UID, GID)

        elif stat.S_ISREG(metadata.st_mode):
            with open(src, "rb") as incoming, open(dst, "wb") as outgoing:
                shutil.copyfileobj(incoming, outgoing)
            os.chmod(dst, stat.S_IMODE(metadata.st_mode))
            os.chown(dst, UID, GID)

        elif stat.S_ISLNK(metadata.st_mode):
            os.symlink(os.readlink(src), dst)
            os.lchown(dst, UID, GID)

        elif stat.S_ISFIFO(metadata.st_mode):
            os.mkfifo(dst, stat.S_IMODE(metadata.st_mode))
            os.chown(dst, UID, GID)

        else:
            raise ConfigurationError(
                "Setup states may contain directories, files, symlinks, and FIFOs."
            )

    clone(source, destination)


def child_setup():
    os.setsid()
    os.umask(0o022)

    os.chroot(ROOT)
    os.chdir("/work")

    resource.setrlimit(resource.RLIMIT_CORE, (0, 0))
    resource.setrlimit(resource.RLIMIT_NOFILE, (64, 64))
    resource.setrlimit(resource.RLIMIT_NPROC, (32, 32))
    resource.setrlimit(resource.RLIMIT_FSIZE, (16 * 1024 * 1024,) * 2)
    resource.setrlimit(resource.RLIMIT_CPU, (2, 2))

    os.setgroups([])
    os.setgid(GID)
    os.setuid(UID)

    # PR_SET_NO_NEW_PRIVS. setuid above also clears effective/permitted caps.
    if libc.prctl(38, 1, 0, 0, 0) != 0:
        os._exit(125)


def run_script(script):
    check_deadline()

    script_path = ROOT + "/submission.sh"
    with open(script_path, "w", encoding="utf-8", newline="") as handle:
        handle.write(script)
    os.chmod(script_path, 0o444)

    process = subprocess.Popen(
        ["/bin/bash", "--noprofile", "--norc", "/submission.sh"],
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        close_fds=True,
        preexec_fn=child_setup,
        env={
            "HOME": "/work",
            "PATH": "/usr/bin:/bin",
            "LANG": "C",
            "LC_ALL": "C",
            "TZ": "UTC",
            "USER": "Ronak",
            "LOGNAME": "Ronak",
            "BASH_ENV": "/dev/null",
            "ENV": "/dev/null",
        },
    )

    selector = selectors.DefaultSelector()
    buffers = {"stdout": bytearray(), "stderr": bytearray()}

    selector.register(process.stdout, selectors.EVENT_READ, "stdout")
    selector.register(process.stderr, selectors.EVENT_READ, "stderr")

    deadline = min(job_deadline, time.monotonic() + STEP_SECONDS)
    failure = ""
    killed_descendants = False
    total_output = 0

    try:
        while selector.get_map():
            if time.monotonic() >= deadline:
                failure = "Execution time limit exceeded."
                break

            if process.poll() is not None and not killed_descendants:
                kill_student_processes()
                killed_descendants = True

            for key, _ in selector.select(0.03):
                chunk = os.read(key.fileobj.fileno(), 8192)

                if not chunk:
                    selector.unregister(key.fileobj)
                    continue

                total_output += len(chunk)
                if total_output > OUTPUT_LIMIT:
                    failure = "Output limit exceeded."
                    break

                buffers[key.data].extend(chunk)

            if failure:
                break
    finally:
        kill_student_processes()

        try:
            process.wait(timeout=1)
        except subprocess.TimeoutExpired:
            raise ConfigurationError("Sandbox process could not be reaped.")

        selector.close()
        process.stdout.close()
        process.stderr.close()

    return {
        "exit": process.returncode,
        "stdout": bytes(buffers["stdout"]),
        "stderr": bytes(buffers["stderr"]),
        "error": failure,
        "ok": process.returncode == 0 and not failure,
    }


def snapshot(path):
    result = {}
    entries = 0
    total_bytes = 0

    def visit(full, relative):
        nonlocal entries, total_bytes

        check_deadline()
        entries += 1

        if entries > TREE_ENTRIES_LIMIT:
            raise TreeError("Folder entry limit exceeded.")

        metadata = os.lstat(full)
        executable = metadata.st_mode & 0o111
        key = base64.b64encode(relative).decode("ascii")

        if stat.S_ISDIR(metadata.st_mode):
            result[key] = ("directory", executable)

            with os.scandir(full) as children:
                ordered = sorted(children, key=lambda entry: os.fsencode(entry.name))

            for entry in ordered:
                name = os.fsencode(entry.name)
                child_relative = name if relative == b"." else relative + b"/" + name
                visit(os.path.join(full, name), child_relative)

        elif stat.S_ISREG(metadata.st_mode):
            total_bytes += metadata.st_size

            if total_bytes > TREE_BYTES_LIMIT:
                raise TreeError("Folder byte limit exceeded.")

            digest = hashlib.sha256()

            # No sandbox processes remain; still explicitly reject symlink opens.
            descriptor = os.open(full, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK)
            with os.fdopen(descriptor, "rb") as handle:
                opened = os.fstat(handle.fileno())
                if not stat.S_ISREG(opened.st_mode):
                    raise TreeError("Entry changed type.")
                while True:
                    chunk = handle.read(64 * 1024)
                    if not chunk:
                        break
                    digest.update(chunk)

            result[key] = (
                "file", executable, metadata.st_size, digest.hexdigest()
            )

        elif stat.S_ISLNK(metadata.st_mode):
            target = os.readlink(full)
            if isinstance(target, str):
                target = os.fsencode(target)

            result[key] = (
                "symlink",
                executable,
                base64.b64encode(target).decode("ascii"),
            )

        elif stat.S_ISFIFO(metadata.st_mode):
            result[key] = ("fifo", executable)

        elif stat.S_ISSOCK(metadata.st_mode):
            result[key] = ("socket", executable)

        elif stat.S_ISCHR(metadata.st_mode):
            result[key] = (
                "character-device", executable,
                os.major(metadata.st_rdev), os.minor(metadata.st_rdev),
            )

        elif stat.S_ISBLK(metadata.st_mode):
            result[key] = (
                "block-device", executable,
                os.major(metadata.st_rdev), os.minor(metadata.st_rdev),
            )

        else:
            raise TreeError("Unsupported entry type.")

    visit(os.fsencode(path), b".")
    return result


def display_path(encoded):
    raw = base64.b64decode(encoded)
    return raw.decode("utf-8", errors="backslashreplace")


def describe(initial, final):
    changes = []

    for path in sorted(set(initial) | set(final)):
        before = initial.get(path)
        after = final.get(path)
        name = display_path(path)

        if before is None:
            changes.append("Created " + after[0] + " " + name)
        elif after is None:
            changes.append("Removed " + before[0] + " " + name)
        elif before != after:
            changes.append("Changed " + name)

        if len(changes) >= 20:
            changes.append("Further changes omitted.")
            break

    return ("\n".join(changes) or "No changes.").encode(
        "utf-8"
    )[:1000].decode("utf-8", errors="ignore")


def diagnostic(value, size=2048):
    return value.decode("utf-8", errors="replace")[:size]


def execute(job):
    validate(job)

    results = []
    awarded = 0

    for test in job["testCases"]:
        check_deadline()

        # Setup runs once for this test.
        new_jail()
        setup = run_script(test["setupScript"])

        if not setup["ok"]:
            raise ConfigurationError("Setup script failed.")

        try:
            initial = snapshot(ROOT + "/work")
        except TreeError as error:
            raise ConfigurationError(str(error))

        remove_tree(STATE)
        os.mkdir(STATE, 0o700)
        clone_state(ROOT + "/work", STATE)

        # Reference execution gets a fresh copy of that exact setup state.
        new_jail(STATE)
        reference = run_script(job["standardSolution"])

        if not reference["ok"]:
            raise ConfigurationError("Reference solution failed.")

        try:
            expected_tree = snapshot(ROOT + "/work")
        except TreeError as error:
            raise ConfigurationError(str(error))

        # Student execution gets an independent fresh copy.
        new_jail(STATE)
        student = run_script(job["scriptContent"])

        actual_tree = None
        folder_error = ""

        try:
            actual_tree = snapshot(ROOT + "/work")
        except TreeError as error:
            folder_error = str(error)

        passed = (
            reference["ok"]
            and student["ok"]
            and actual_tree is not None
            and reference["stdout"] == student["stdout"]
            and expected_tree == actual_tree
        )

        if passed:
            awarded += test["xpReward"]

        hidden = test["hidden"]

        result = {
            "id": test["id"],
            "passed": passed,
            "expectedOutput": "" if hidden else diagnostic(reference["stdout"]),
            "actualOutput": "" if hidden else diagnostic(student["stdout"]),
            "stderr": "" if hidden else diagnostic(student["stderr"]),
            "expectedFolder": "" if hidden else describe(initial, expected_tree),
            "actualFolder": "" if hidden else (
                describe(initial, actual_tree)
                if actual_tree is not None
                else folder_error
            ),
            "error": "" if hidden else (
                student["error"]
                or folder_error
                or (
                    "Script exited with status " + str(student["exit"])
                    if student["exit"] != 0
                    else ""
                )
            )[:300],
        }

        results.append(result)

    passed_tests = sum(1 for result in results if result["passed"])

    if passed_tests == len(results):
        awarded += job["baseXp"]

    return {
        "passedTests": passed_tests,
        "totalPoints": job["totalPoints"],
        "awardedXp": awarded,
        "results": results,
    }


def main():
    with open("/job/input.json", "rb") as handle:
        raw = handle.read(16 * 1024 * 1024 + 1)

    if len(raw) > 16 * 1024 * 1024:
        raise ConfigurationError("Job too large.")

    job = json.loads(raw.decode("utf-8"))
    result = execute(job)

    print(json.dumps(result, ensure_ascii=True, separators=(",", ":")))


if __name__ == "__main__":
    try:
        main()
    except Exception:
        # Never emit setup scripts, hidden data, or the reference solution.
        sys.stderr.write("Grading infrastructure or reference configuration failed.\n")
        sys.exit(1)
