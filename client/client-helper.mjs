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

function startSync(filePath, params) {
  const downloadUrl = params.downloadUrl;
  const key = params.key ?? path.basename(filePath);
  const uploadUrl = params.uploadUrl;

  let debounceTimer = null;
  const debounceMs = 2000;

  function upload() {
    try {
      const buffer = readFileSync(filePath);
      const targetUrl = uploadUrl
        ? uploadUrl
        : (() => {
            const baseUrl = new URL(downloadUrl).origin;
            return `${baseUrl}/api/static/${key}`;
          })();

      fetch(targetUrl, {
        method: "PUT",
        body: buffer,
        headers: { "Content-Type": "application/octet-stream" },
      })
        .then((r) => {
          if (r.ok) console.log("Synced:", key);
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
      debounceTimer = setTimeout(upload, debounceMs);
    });
    console.log("Sync active:", key);
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
          const downloadUrl =
            typeof parsed.downloadUrl === "string"
              ? parsed.downloadUrl
              : typeof parsed.url === "string"
                ? parsed.url
                : "";
          const uploadUrl = typeof parsed.uploadUrl === "string" ? parsed.uploadUrl : undefined;
          const key = typeof parsed.key === "string" ? parsed.key : undefined;

          if (!downloadUrl) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(
              JSON.stringify({
                ok: false,
                message: "Missing or invalid downloadUrl in request body.",
              }),
            );
            return;
          }

          const filePath = await downloadDocument(downloadUrl);
          openFileWithDefaultApp(filePath);
          startSync(filePath, { key, downloadUrl, uploadUrl });

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


