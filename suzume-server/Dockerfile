FROM rust:1.88-bookworm AS builder
WORKDIR /app

COPY Cargo.toml Cargo.toml
COPY suzume-server/Cargo.toml suzume-server/Cargo.toml
COPY suzume-server/src suzume-server/src

RUN cargo build --release -p suzume-server

FROM debian:bookworm-slim AS runtime
WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates curl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/target/release/suzume-server /usr/local/bin/suzume-server

ENV SUZUME_SERVER_HOST=0.0.0.0
ENV SUZUME_SERVER_PORT=18080
EXPOSE 18080

CMD ["suzume-server"]
