import express from "express";
import path from "node:path";
import { existsSync } from "node:fs";
import { spawn } from "node:child_process";

const app = express();
const PORT = process.env.PORT ?? 3000;

const rootDir = path.join(__dirname, "..");

app.use(express.static(rootDir));

app.post("/api/open-document", (_req, res) => {
  const docPath = path.join(rootDir, "static", "document.docx");

  if (!existsSync(docPath)) {
    res.status(404).json({ ok: false, message: "Datei nicht gefunden." });
    return;
  }

  const opener = spawn("xdg-open", [docPath], {
    detached: true,
    stdio: "ignore",
  });

  opener.on("error", (err) => {
    console.error("Fehler beim Öffnen der Datei:", err);
  });

  opener.unref();

  res.json({ ok: true });
});

app.get("*", (_req, res) => {
  res.sendFile(path.join(rootDir, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server läuft auf http://localhost:${PORT}`);
});

