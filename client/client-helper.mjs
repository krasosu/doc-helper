import http from "node:http";
import https from "node:https";
import { spawn } from "node:child_process";
import { mkdtempSync, writeFileSync, watch, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const PORT = Number(process.env.DOC_HELPER_PORT ?? 17865);

function openFileWithDefaultApp(filePath) {
  const platform = process.platform;

  if (platform === "win32") {
    // Windows
    const child = spawn("cmd", ["/c", "start", "", filePath], {
      detached: true,
      stdio: "ignore",
    });
    child.unref();
  } else {
    // Linux / macOS
    const cmd = platform === "darwin" ? "open" : "xdg-open";
    const child = spawn(cmd, [filePath], {
      detached: true,
      stdio: "ignore",
    });
    child.unref();
  }
}

async function downloadDocument(urlString) {
  const url = new URL(urlString);
  const client = url.protocol === "https:" ? https : http;

  const buffer = await new Promise((resolve, reject) => {
    const req = client.get(url, (res) => {
      if (res.statusCode && res.statusCode >= 400) {
        reject(
          new Error(
            `Download failed: ${res.statusCode} ${res.statusMessage ?? ""}`,
          ),
        );
        return;
      }

      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => resolve(Buffer.concat(chunks)));
    });

    req.on("error", reject);
  });

  const tmpDir = mkdtempSync(path.join(os.tmpdir(), "doc-open-"));
  const ext = path.extname(url.pathname) || ".bin";
  const filePath = path.join(tmpDir, `download${ext}`);
  writeFileSync(filePath, buffer);

  return filePath;
}

function startSyncToServer(filePath, downloadUrl) {
  const urlObj = new URL(downloadUrl);
  const baseUrl = urlObj.origin;
  const key = urlObj.pathname.replace(/^\/static\/?/, "") || path.basename(filePath);

  let debounceTimer = null;
  const debounceMs = 2000;

  function uploadToServer() {
    try {
      const buffer = readFileSync(filePath);
      const apiUrl = `${baseUrl}/api/static/${key}`;
      fetch(apiUrl, {
        method: "PUT",
        body: buffer,
        headers: { "Content-Type": "application/octet-stream" },
      })
        .then((r) => {
          if (r.ok) console.log("Synced to MinIO:", key);
          else console.warn("Sync failed:", key, r.status);
        })
        .catch((err) => console.warn("Sync error:", err));
    } catch (err) {
      console.warn("Error reading file for sync:", err);
    }
  }

  const dirPath = path.dirname(filePath);
  const fileName = path.basename(filePath);
  try {
    watch(dirPath, (eventType, filename) => {
      if (filename != null && filename !== fileName) return;
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(uploadToServer, debounceMs);
    });
    console.log("Sync active, changes will be written to MinIO:", key);
  } catch (err) {
    console.warn("Could not start watcher:", err);
  }
}

const server = http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === "POST" && req.url === "/open-document") {
    try {
      let body = "";
      req.on("data", (chunk) => {
        body += chunk.toString();
      });
      req.on("end", async () => {
        try {
          const parsed = body ? JSON.parse(body) : {};
          const url = parsed.url;

          if (!url || typeof url !== "string") {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(
              JSON.stringify({
                ok: false,
                message: "Missing or invalid url in request body.",
              }),
            );
            return;
          }

          const filePath = await downloadDocument(url);
          openFileWithDefaultApp(filePath);
          startSyncToServer(filePath, url);

          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: true }));
        } catch (error) {
          console.error("Error opening file:", error);
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              ok: false,
              message: error instanceof Error ? error.message : String(error),
            }),
          );
        }
      });
      return;
    } catch (error) {
      console.error("Error processing request:", error);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          ok: false,
          message: error instanceof Error ? error.message : String(error),
        }),
      );
      return;
    }
  }

  res.writeHead(404);
  res.end();
});

server.listen(PORT, () => {
  console.log("Doc helper running at http://localhost:" + PORT);
});


