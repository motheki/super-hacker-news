# instant-nav rig: SuperHack News

- BUILD: `EXPOSE_TESTING_API=1 bun run build`, then `bun run start --port 3100`.
- EXPOSE: `EXPOSE_TESTING_API=1` at build time; production omits it.
- RUN: `bun run test:instant` against `http://localhost:3100`.
- TEST USER: anonymous; no login, flags, plan, role, or seeded local data.
- DRIFT: live Hacker News data and upstream availability.
- LOOP: local build, start, test, edit, repeat; fully agent-drivable.
- LIVENESS: not applicable; each test run starts the freshly built local artifact.
- WALLS: `prebuild` removes stale `.next/dev` route types before production builds.
