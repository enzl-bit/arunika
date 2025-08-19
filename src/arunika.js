import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import jwt from "jsonwebtoken";
import { WebSocketServer } from "ws";
import swaggerUi from "swagger-ui-dist";
import fs from "fs";
import path from "path";

export class Arunika {
  constructor() {
    this.app = express();
    this.app.use(express.json());
    this.app.use(cors());
    this.app.use(helmet());
    this.app.use(rateLimit({ windowMs: 60 * 1000, max: 60 }));
    this.wsServers = [];
  }

  // Async handler wrapper
  asyncHandler(fn) {
    return (req, res, next) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }

  // Validation middleware
  validate(schema) {
    return (req, res, next) => {
      const { body } = req;
      const errors = [];
      for (const key of schema.required || []) {
        if (body[key] === undefined) errors.push(`${key} is required`);
      }
      for (const key in schema.properties || {}) {
        const type = schema.properties[key].type;
        if (body[key] !== undefined && typeof body[key] !== type) {
          errors.push(`${key} must be ${type}`);
        }
      }
      if (errors.length) return res.status(400).json({ errors });
      next();
    };
  }

  // JWT Auth middleware
  auth(secret) {
    return (req, res, next) => {
      const authHeader = req.headers["authorization"];
      if (!authHeader) return res.status(401).json({ error: "No token" });
      const token = authHeader.split(" ")[1];
      try {
        req.user = jwt.verify(token, secret);
        next();
      } catch (err) {
        res.status(401).json({ error: "Invalid token" });
      }
    };
  }

  // Router helpers
  get(route, handler) {
    this.app.get(route, this.asyncHandler(handler));
  }

  post(route, handler) {
    this.app.post(route, this.asyncHandler(handler));
  }

  put(route, handler) {
    this.app.put(route, this.asyncHandler(handler));
  }

  delete(route, handler) {
    this.app.delete(route, this.asyncHandler(handler));
  }

  // WebSocket
  ws(route, handler) {
    const server = new WebSocketServer({ noServer: true });
    this.wsServers.push({ route, server, handler });
  }

  // Swagger UI
  swagger(route, swaggerSpec) {
    const swaggerHtml = swaggerUi.getAbsoluteFSPath();
    this.app.use(route, express.static(swaggerHtml));
    // Minimal auto-generated index.html
    this.app.get(route, (req, res) => {
      res.send(`
      <!DOCTYPE html>
      <html>
        <head><title>Swagger Docs</title></head>
        <body>
          <div id="swagger-ui"></div>
          <script src="/swagger-ui-bundle.js"></script>
          <script>
            const spec = ${JSON.stringify(swaggerSpec)};
            window.ui = SwaggerUIBundle({ spec, dom_id: '#swagger-ui' });
          </script>
        </body>
      </html>
      `);
    });
  }

  // JWT utilities
  jwt = jwt;

  // Listen
  listen(port, callback) {
    const server = this.app.listen(port, callback);

    // Upgrade WebSocket connections
    server.on("upgrade", (req, socket, head) => {
      for (const wsObj of this.wsServers) {
        if (req.url === wsObj.route) {
          wsObj.server.handleUpgrade(req, socket, head, (ws) => {
            wsObj.handler(ws, req);
          });
          return;
        }
      }
      socket.destroy();
    });

    this.server = server;
    return server;
  }

  get server() {
    return this.app;
  }
}
