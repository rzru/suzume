# Suzume (Simple NAS Mode)

Standalone LAN-accessible web app stack using:
- `suzume-server` (Rust API)
- `suzume-client` (Svelte web client)
- host `ollama` daemon (outside Docker Compose)

## Runtime model

- Deploy on one NAS host.
- Expose only LAN ports for client and API.
- Run `ollama` as host daemon and point backend to host endpoint.
- Use:
  - `GET /health` for container health checks (fast 200 response)
  - `GET /status` for on-demand dependency status (client-facing)
- `suzume-server` uses Docker host networking in Compose so it can reach host-local `127.0.0.1` services.

`/status` returns:
- `ollama_connected`: boolean
- `anki_connected`: boolean

## Quick start (local NAS)

1. Start Ollama on host:
   - `ollama serve`
   - this is managed by the machine owner (outside this repo)
2. Ensure Anki/AnkiConnect endpoint is reachable from the host (default `http://127.0.0.1:8765`).
3. From project root:
   - `docker compose up -d --build`
4. Open on LAN:
   - client: `http://<nas-ip>:4173`

## Configuration
Set environment variables via shell or `.env` next to `docker-compose.yml`.

- `SUZUME_SERVER_BIND_IP` default `0.0.0.0`
- `SUZUME_SERVER_PORT` default `18080`
- `SUZUME_CLIENT_BIND_IP` default `0.0.0.0`
- `SUZUME_CLIENT_PORT` default `4173`
- `OLLAMA_BASE_URL` default `http://127.0.0.1:11434`
- `ANKI_CONNECT_URL` default `http://127.0.0.1:8765`
- `SUZUME_ALLOWED_ORIGINS` default `http://localhost:4173,http://127.0.0.1:4173`
- `RUST_LOG` default `info,tower_http=info`

## Autorun on NAS boot

### Option A: NAS-native container auto-start

Configure your NAS to auto-start Docker and restore containers.

### Option B: systemd units

Templates are provided in `deploy/systemd/`:
- `suzume-stack.service` for Docker Compose stack

Install example (root/system scope):
1. copy units to `/etc/systemd/system/`
2. `systemctl daemon-reload`
3. `systemctl enable --now suzume-stack.service`

If your NAS uses different binary paths or users, edit unit files first.

## Updates

- rebuild and restart stack:
  - `docker compose up -d --build`
- stop stack:
  - `docker compose down`

## Troubleshooting

- Check health endpoint first:
  - `curl http://<nas-ip>:18080/health`
- Check dependency status:
  - `curl http://<nas-ip>:18080/status`
- If `ollama_connected` is false:
  - verify host daemon: `ollama serve`
  - verify backend `OLLAMA_BASE_URL`
- If `anki_connected` is false:
  - verify AnkiConnect endpoint and `ANKI_CONNECT_URL`

## Future hardening (optional)

- add reverse proxy for local TLS and stricter auth boundary
- move client/API to one entrypoint host/port
- tighten firewall rules to trusted LAN ranges only
