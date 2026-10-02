FROM debian:bookworm-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       python3 bash coreutils findutils grep sed gawk \
    && rm -rf /var/lib/apt/lists/*

COPY build-runtime.py /usr/local/lib/build-runtime.py
RUN python3 /usr/local/lib/build-runtime.py \
    && rm /usr/local/lib/build-runtime.py

COPY worker.py /usr/local/lib/worker.py

RUN chmod 0555 /usr/local/lib/worker.py \
    && mkdir -p /job /jails \
    && chmod 0700 /job /jails

USER 65534:65534
WORKDIR /
ENTRYPOINT []
CMD ["/bin/sleep", "1000"]
