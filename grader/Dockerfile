FROM alpine:3.23

RUN apk add --no-cache bash \
    && addgroup -g 10001 learner \
    && adduser -D -u 10001 -G learner -h /work learner \
    && mkdir -p /work

WORKDIR /

# The lifetime process uses a different UID from submitted scripts.
USER 65534:65534

CMD ["/bin/sleep", "30"]
