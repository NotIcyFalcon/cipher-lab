#!/usr/bin/env python3

import os
import re
import shutil
import subprocess

ROOT = "/opt/runtime"

TOOLS = """
bash cat chmod cp cut date dirname echo env expr false find
gawk grep head id ln ls mkdir mktemp mv od paste printf pwd
readlink realpath rm rmdir sed seq sh sha256sum sleep sort
stat tail tee test touch tr true truncate uname uniq wc whoami
basename xargs
""".split()

os.makedirs(ROOT + "/usr/bin", exist_ok=True)

def copy_file(source, destination):
    target = ROOT + destination
    os.makedirs(os.path.dirname(target), exist_ok=True)
    if not os.path.exists(target):
        shutil.copyfile(os.path.realpath(source), target)
        os.chmod(target, 0o555)

for tool in TOOLS:
    source = shutil.which(tool)
    if not source:
        raise RuntimeError("Missing runtime tool: " + tool)

    copy_file(source, "/usr/bin/" + tool)

    linked = subprocess.run(
        ["ldd", source],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        check=False,
    ).stdout

    for library in re.findall(r"(/[^\s()]+)", linked):
        if os.path.isfile(library):
            copy_file(library, library)

for directory in ["etc", "tmp", "work", "dev"]:
    os.makedirs(ROOT + "/" + directory, exist_ok=True)

os.symlink("usr/bin", ROOT + "/bin")

with open(ROOT + "/etc/passwd", "w", encoding="utf-8") as handle:
    handle.write(
        "root:x:0:0:root:/root:/bin/bash\n"
        "Ronak:x:10001:10001:Ronak:/work:/bin/bash\n"
    )

with open(ROOT + "/etc/group", "w", encoding="utf-8") as handle:
    handle.write("root:x:0:\nRonak:x:10001:\n")

for current, directories, files in os.walk(ROOT):
    os.chmod(current, 0o555)
    for filename in files:
        path = os.path.join(current, filename)
        if not os.path.islink(path):
            mode = os.stat(path).st_mode
            os.chmod(path, 0o555 if mode & 0o111 else 0o444)
