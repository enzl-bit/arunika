import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import Arunika from "./arunika.js";
import logger from "./plugins/logger.js";
import health from "./plugins/health.js";
import auth from "./plugins/auth.js";
import swaggerUiDist from "swagger-ui-dist";
import jwt from "jsonwebtoken";
import { z } from "zod";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In-memory DB
let todos = [];

// Init framework
const app = new Arunika();

// Plugins
app.use(logger);
app.use(auth("supersecret"));
app.plugin(health);

// --- CRUD Routes (Todos) ---
app.get("/api/v1/todos", (req, res) => {
  res.json(todos);
});

app.post("/api/v1/todos", (req, res) => {
  const schema = z.object({ title: z.string() });
  const body = schema.parse(req.body);

  const todo = { id: Date.now().toString(), title: body.title, done: false };
  todos.push(todo);
  res.status(201).json(todo);
});

app.get("/api/v1/todos/:id", (req, res) => {
  const todo = todos.find((t) => t.id === req.params.id);
  if (!todo) return res.status(404).json({ error: "Not found" });
  res.json(todo);
});

app.put("/api/v1/todos/:id", (req, res) => {
  const schema = z.object({ title: z.string().optional(), done: z.boolean().optional() });
  const body = schema.parse(req.body);

  const todo = todos.find((t) => t.id === req.params.id);
  if (!todo) return res.status(404).json({ error: "Not found" });

  Object.assign(todo, body);
  res.json(todo);
});

app.delete("/api/v1/todos/:id", (req, res) => {
  todos = todos.filter((t) => t.id !== req.params.id);
  res.status(204).end();
});

// --- Auth Route ---
app.post("/login", (req, res) => {
  const { username, password } = req.body || {};
  if (username === "admin" && password === "1234") {
    const token = jwt.sign({ user: username }, "supersecret", { expiresIn: "1h" });
    res.json({ token });
  } else {
    res.status(401).json({ error: "Unauthorized" });
  }
});

// --- Swagger Setup ---
const swaggerAssets = swaggerUiDist.getAbsoluteFSPath();
const openapiSpec = JSON.parse(fs.readFileSync(path.join(__dirname, "../docs/openapi.json"), "utf-8"));

// Serve Swagger JSON
app.get("/docs/openapi.json", (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(openapiSpec));
});

// Serve Swagger UI
app.static("/docs", swaggerAssets);
app.get("/docs", (req, res) => {
  let html = fs.readFileSync(path.join(swaggerAssets, "index.html"), "utf-8");
  html = html.replace("https://petstore.swagger.io/v2/swagger.json", "/docs/openapi.json");
  res.setHeader("Content-Type", "text/html");
  res.end(html);
});

// --- WebSocket Chat ---
app.ws("/chat", (ws) => {
  ws.send("Welcome to Arunika Chat!");
  ws.on("message", (msg) => {
    app.broadcast("/chat", msg.toString());
  });
});

// --- Start Server ---
app.listen(3000, () => {
  console.log("🚀 Arunika running at http://localhost:3000");
  console.log("📖 Swagger Docs: http://localhost:3000/docs");
});
