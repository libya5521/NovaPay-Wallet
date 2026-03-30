// artifacts/api-server/src/index.ts
//
// Entry point — env validation runs first, before any other import resolves,
// so misconfigured deployments fail immediately with a clear error message.
//
import "./config/env.js"; // Must be first — throws on invalid env vars

import app from "./app.js";
import { logger } from "./lib/logger.js";

const rawPort = process.env["PORT"];

if (!rawPort) {
  logger.fatal("PORT environment variable is required but was not provided.");
  process.exit(1);
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0 || port > 65535) {
  logger.fatal({ rawPort }, "Invalid PORT value.");
  process.exit(1);
}

app.listen(port, () => {
  logger.info({ port, env: process.env["NODE_ENV"] ?? "development" }, "NovaPay API server listening");
});
