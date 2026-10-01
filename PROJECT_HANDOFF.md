# Cipher Lab: Project Architecture & Handoff Document

## 1. Project Overview
**Cipher Lab** is a self-hosted, single-user cybersecurity learning platform designed for hands-on terminal practice. It provides reading materials, interactive quizzes, and isolated Docker-based lab environments where the user can execute real Bash commands and submit scripts for automated grading.

## 2. Core Architecture
- **Framework**: Next.js 16.3.7 (App Router) using React 19.
- **Styling**: Custom CSS (`globals.css`) with a dark, terminal-inspired theme.
- **Database**: `better-sqlite3` integrated natively into the Next.js server, replacing an earlier `localStorage` approach.
- **Infrastructure / Deployment**: 
  - Fully Dockerized via `compose.yaml`.
  - **Web**: Next.js standalone build.
  - **Gateway**: A secondary Node.js service that has access to `/var/run/docker.sock` to spin up and tear down on-demand practice labs and grading containers.
  - **Proxy**: Caddy reverse proxy handling HTTPS via DuckDNS (`ronaks-lab.duckdns.org`).
- **Environment Context**: Development happens on a Windows host, but production deployment runs on an AWS EC2 Ubuntu instance.

## 3. Key Features & Workflows
### A. The Learning Environment (`/paths` & `/`)
- Users navigate through "Chapters" and "Missions".
- Content is statically defined in `src/content/lessons.ts`.
- **Lab Blocks**: Connect to an interactive xterm.js terminal over WebSockets (`src/components/LabTerminal.tsx`). 

### B. The Lab Gateway (`gateway/server.mjs`)
- The Next.js frontend doesn't touch Docker directly. It makes HTTP/WS requests to the internal Gateway (port 3001).
- The Gateway spawns isolated containers (e.g., `practice-box`) on an internal Docker network, injects SSH keys, and bridges the WebSocket connection via `ssh2` to the container.
- **Safety**: A maximum of 3 concurrent labs are allowed to prevent resource exhaustion.

### C. Homework & Automated Grading (`/homework`)
- Users upload `.sh` bash scripts to solve specific challenges.
- **Grader Service**: The gateway spins up an isolated Alpine Linux container (`grader/Dockerfile`) that executes the user's script against expected test cases.
- **Progress Tracking**: Submissions are saved to the SQLite database (`homework_submissions` table) which tracks awarded XP, passed tests, and raw stdout/stderr logs for the submission history UI.

## 4. Recent Refactors & Solved Problems
If you are modifying the codebase, it is highly important to understand the following recent hurdles we overcame:

1. **The Database Migration**: 
   - We attempted to use Prisma + PostgreSQL, but Windows file-locking issues (`EBUSY` on the `.prisma` binaries) broke local `npm install`.
   - **Solution**: We pivoted to a lightweight, file-based `better-sqlite3` volume mounted in Docker (`/app/data/cyberbox.sqlite`).

2. **The "better-sqlite3" Next.js Crash (Error 502)**:
   - **Problem**: Next.js App Router uses worker threads for Server Actions. When a Server Action awaited an async task (like the grader), `better-sqlite3` prepared statements would get Garbage Collected by V8. When the worker tore down, the C++ destructor fired, throwing `Assertion failed: (env) != nullptr` in `node::RemoveEnvironmentCleanupHook`, violently crashing the Next.js Docker container and resulting in 502 Bad Gateway errors.
   - **Solution**: In `src/server/db.ts`, the `db.prepare` method is monkeypatched to globally cache statements in a `Map`. This prevents the V8 Garbage Collector from ever destroying the statements, completely bypassing the bug. **Do not remove this caching layer.**

3. **Docker Native Addon Compilation**:
   - **Problem**: Node 24 (`node:24-bookworm-slim`) does not have prebuilt binaries for `better-sqlite3`. `npm ci` was failing with `node-gyp` missing Python/Make/G++.
   - **Solution**: The `Dockerfile` stages (`dependencies` and `gateway`) explicitly run `apt-get install -y python3 make g++` before installing node modules. 

4. **Standalone Output**:
   - Always ensure `output: "standalone"` remains in `next.config.ts`, otherwise the Docker multi-stage build will fail to find the `.next/standalone` directory.

## 5. Current State
- The UI is fully functional. 
- The `/homework` tab displays chapter completion, allows file uploads, and renders robust submission history logs (expected vs actual output).
- The `/paths` tab correctly queries the DB to calculate and display progress bars for reading and lab completion XP.
- User authentication is currently bypassed/hardcoded to `"ronak"` in `src/server/current-user.ts` as this is a personal, single-user instance.
