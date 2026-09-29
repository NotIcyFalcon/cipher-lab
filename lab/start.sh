#!/bin/sh
set -eu

install -d -m 0755 /run/sshd
cp -R /etc/skel/. /home/Ronak/

cat > /home/Ronak/README.txt <<'TEXT'
Welcome to Cipher Lab.

Start with:
  pwd
  whoami
  ls -la

There is a small clue hidden in this directory.

Your files stay between terminal connections.
Restarting or resetting the lab clears your practice files.
TEXT

printf '%s\n' \
  'Clue found! A filename beginning with a dot is normally hidden.' \
  > /home/Ronak/.first-clue

chown -R Ronak:Ronak /home/Ronak
chmod 0700 /home/Ronak

exec /usr/sbin/sshd -D -e -f /etc/ssh/sshd_config
