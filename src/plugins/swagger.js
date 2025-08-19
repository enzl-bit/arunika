import swaggerUi from "swagger-ui-express";
import yaml from "yaml";

export function swagger(app, options) {
  const docs = {
    openapi: "3.0.0",
    info: { title: "Arunika API", version: "1.0.0" },
    paths: {}
  };

  // Hook route untuk auto-doc
  const origGet = app.get.bind(app);
  app.get = (path, handler) => {
    docs.paths[path] = { get: { responses: { 200: { description: "OK" } } } };
    origGet(path, handler);
  };

  app.get("/docs.json", (req, res) => res.json(docs));

  // ✅ serve Swagger UI
  app.use(swaggerUi.serve);
  app.get("/docs", swaggerUi.setup(docs));
}
