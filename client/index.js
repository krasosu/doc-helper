const http = require("http");
const https = require("https");
const { spawn } = require("child_process");
const { mkdtempSync, writeFileSync } = require("fs");
const os = require("os");
const path = require("path");

const PORT = Number(process.env.DOC_HELPER_PORT ?? 17865);

function openFileWithDefaultApp(filePath) {
  const platform = process.platform;

  if (platform === "win32") {
    const child = spawn("cmd", ["/c", "start", "", filePath], {
      detached: true,
      stdio: "ignore",
    });
    child.unref();
  } else {
    const cmd = platform === "darwin" ? "open" : "xdg-open";
    const child = spawn(cmd, [filePath], {
      detached: true,
      stdio: "ignore",
    });
    child.unref();
  }
}

function downloadDocument(urlString) {
  const url = new URL(urlString);
  const client = url.protocol === "https:" ? https : http;

  return new Promise((resolve, reject) => {
    const req = client.get(url, (res) => {
      if (res.statusCode && res.statusCode >= 400) {
        reject(
          new Error(
            `Download fehlgeschlagen: ${res.statusCode} ${res.statusMessage || ""}`,
          ),
        );
        return;
      }

      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => resolve(Buffer.concat(chunks)));
    });

    req.on("error", reject);
  }).then((buffer) => {
    const tmpDir = mkdtempSync(path.join(os.tmpdir(), "doc-open-"));
    const filePath = path.join(tmpDir, "document.docx");
    writeFileSync(filePath, buffer);
    return filePath;
  });
}

const server = http.createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === "POST" && req.url === "/open-document") {
    let body = "";
    req.on("data", (chunk) => {
      body += String(chunk);
    });
    req.on("end", () => {
      try {
        const parsed = body ? JSON.parse(body) : {};
        const url = parsed.url;

        if (!url || typeof url !== "string") {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              ok: false,
              message: "Feld 'url' im Request-Body fehlt oder ist ungültig.",
            }),
          );
          return;
        }

        downloadDocument(url)
          .then((filePath) => {
            openFileWithDefaultApp(filePath);
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ ok: true }));
          })
          .catch((error) => {
            console.error("Fehler beim Öffnen der Datei:", error);
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(
              JSON.stringify({
                ok: false,
                message: String(error && error.message ? error.message : error),
              }),
            );
          });
      } catch (error) {
        console.error("Fehler beim Verarbeiten der Anfrage:", error);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            ok: false,
            message: String(error && error.message ? error.message : error),
          }),
        );
      }
    });
    return;
  }

  res.writeHead(404);
  res.end();
});

server.listen(PORT, () => {
  console.log(`Doc-Helper läuft auf http://localhost:${PORT}`);
});

