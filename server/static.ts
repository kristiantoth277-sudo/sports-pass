import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function serveStatic(app: Express) {
  const candidates = [
    path.resolve(process.cwd(), "dist", "public"),
    path.resolve(process.cwd(), "public"),
  ];

  let distPath = candidates.find(p => fs.existsSync(p));

  if (!distPath) {
    throw new Error(
      `Could not find build directory. Tried: ${candidates.join(", ")}`,
    );
  }

  console.log(`[static] Serving static files from: ${distPath}`);

  app.use(express.static(distPath));

  app.use("/{*path}", (_req, res) => {
    res.sendFile(path.resolve(distPath!, "index.html"));
  });
}
