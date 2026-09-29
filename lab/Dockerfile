FROM debian:bookworm-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       openssh-server \
       bash \
       coreutils \
       findutils \
       grep \
       less \
       nano \
       procps \
       iproute2 \
       curl \
       ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && rm -f /etc/ssh/ssh_host_* \
    && useradd --create-home --uid 1000 --shell /bin/bash Ronak \
    && usermod --password '*' Ronak \
    && install -d -m 0755 /etc/ssh/authorized_keys

COPY sshd_config /etc/ssh/sshd_config
COPY --chmod=0755 start.sh /usr/local/bin/start-lab

EXPOSE 2222
ENTRYPOINT ["/usr/local/bin/start-lab"]