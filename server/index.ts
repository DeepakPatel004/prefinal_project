
import express, { type Request, Response, NextFunction } from "express";
import { pool } from "./db";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));


const app = express();

declare module 'http' {
  interface IncomingMessage {
    rawBody: unknown
  }
}
app.use(express.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Ensure DB has the new columns added by recent schema updates.
  // This runs a harmless, idempotent ALTER TABLE to add missing columns
  // used by the server code (dispute_count, admin_only). If your
  // migration system is separate, you can remove this, but it's useful
  // to avoid runtime errors when the DB schema is slightly out of date.
  try {
    await pool.query(`ALTER TABLE grievances
      ADD COLUMN IF NOT EXISTS dispute_count integer NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS admin_only boolean NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS blockchain_tx_hash text;`);
    console.log("DB migration applied: dispute_count/admin_only/blockchain_tx_hash ensured");
  } catch (err) {
    console.error("Error applying DB migration for grievances migration:", err);
  }
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    // Log full error for debugging
    console.error('Unhandled error in request pipeline:', err);

    // Only send a JSON response if headers have not already been sent
    if (!res.headersSent) {
      res.status(status).json({ message });
    }

    // Do NOT rethrow the error here — rethrowing causes an uncaught exception
    // in Node's event loop when no 'error' listener exists. We already logged
    // the error above; return to allow the server to continue running.
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    
  }, () => {
    log(`serving on port ${port}`);
  });
  // start background scheduler for timers and escalations
  try {
    const { startScheduler } = await import('./scheduler');
    startScheduler();
  } catch (err) {
    console.error('Failed to start scheduler:', err);
  }
})();
