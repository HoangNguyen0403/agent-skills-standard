import type { Express, RequestHandler } from "express";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import type { ResolvedConfig } from "./config";
import { buildServer } from "./server";
import { SessionTracker } from "./services/SessionTracker";

export function createMcpHttpApp(
  config: ResolvedConfig,
  tracker: SessionTracker,
): Express {
  const app = createMcpExpressApp();

  const handleRequest: RequestHandler = async (req, res, next) => {
    let server: McpServer | undefined;
    let responseClosed = false;
    let cleanupPromise: Promise<void> | undefined;

    const cleanup = (): Promise<void> => {
      responseClosed = true;
      if (!server) return Promise.resolve();
      cleanupPromise ??= server.close();
      return cleanupPromise;
    };
    const cleanupOnClose = (): void => {
      void cleanup().catch((error: unknown) => {
        process.stderr.write(
          `[ags-mcp] HTTP cleanup failed: ${error instanceof Error ? error.stack : String(error)}\n`,
        );
      });
    };

    res.once("finish", cleanupOnClose);
    res.once("close", cleanupOnClose);

    try {
      // The SDK requires fresh stateless transport and protocol instances per request.
      server = await buildServer(config, { tracker });
      if (responseClosed) {
        await cleanup();
        return;
      }

      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
      });
      await server.connect(transport);
      if (responseClosed) {
        await cleanup();
        return;
      }

      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      try {
        await cleanup();
      } catch (cleanupError) {
        process.stderr.write(
          `[ags-mcp] HTTP cleanup failed: ${cleanupError instanceof Error ? cleanupError.stack : String(cleanupError)}\n`,
        );
      }

      if (res.headersSent) {
        next(error);
        return;
      }
      process.stderr.write(
        `[ags-mcp] HTTP request failed: ${error instanceof Error ? error.stack : String(error)}\n`,
      );
      res.status(500).json({
        jsonrpc: "2.0",
        error: { code: -32603, message: "Internal server error" },
        id: null,
      });
    }
  };

  app.all("/mcp", handleRequest);
  app.all("/sse", handleRequest);
  app.all("/messages", handleRequest);
  return app;
}
