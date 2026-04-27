import express from "express";
import path from "node:path";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import type { Readable } from "node:stream";

type FileEntry = {
  key: string;
  downloadUrl: string;
  uploadUrl?: string;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ?? 3000;

const rootDir = path.join(__dirname, "..");

const storageMode = (process.env.STORAGE_MODE ?? "s3").toLowerCase(); // "s3" | "presigned"

const s3Endpoint = process.env.MINIO_ENDPOINT ?? "http://localhost:9000";
const s3Region = process.env.MINIO_REGION ?? "us-east-1";
const s3Bucket = process.env.MINIO_BUCKET ?? "documents";
const s3AccessKey = process.env.MINIO_ACCESS_KEY ?? "minioadmin";
const s3SecretKey = process.env.MINIO_SECRET_KEY ?? "minioadmin";

const s3Client = new S3Client({
  endpoint: s3Endpoint,
  region: s3Region,
  credentials: {
    accessKeyId: s3AccessKey,
    secretAccessKey: s3SecretKey,
  },
  forcePathStyle: true,
});

function sendFileFromMinIO(key: string, res: express.Response): Promise<boolean> {
  return (async () => {
    const command = new GetObjectCommand({
      Bucket: s3Bucket,
      Key: key,
    });

    const data = await s3Client.send(command);

    const contentType =
      data.ContentType ??
      (key.endsWith(".xml")
        ? "application/xml"
        : key.endsWith(".json")
          ? "application/json"
          : key.endsWith(".txt")
            ? "text/plain"
            : "application/octet-stream");

    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${key}"`);

    const body = data.Body as Readable | undefined;
    if (!body) {
      res.status(500).send("No content received");
      return true;
    }

    body.on("error", (err) => {
      console.error("Error streaming from MinIO:", err);
      if (!res.headersSent) {
        res.status(500).send("Error streaming file");
      } else {
        res.end();
      }
    });

    body.pipe(res);
    return true;
  })();
}

app.get(/^\/static\/(.+)$/, async (req, res) => {
  const key = (req.params as { 0: string })[0];

  try {
    await sendFileFromMinIO(key, res);
  } catch (error) {
    console.error("Error loading from MinIO:", error);

    const localPath = path.join(rootDir, "static", key);
    if (existsSync(localPath)) {
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${path.basename(key)}"`,
      );
      res.sendFile(localPath);
    } else {
      res.status(404).send("File not found. Check bucket and upload: " + key);
    }
  }
});

async function loadPresignedFileEntries(): Promise<FileEntry[]> {
  const jsonInline = process.env.PRESIGNED_FILES_JSON;
  const jsonPath = process.env.PRESIGNED_FILES_PATH;

  if (!jsonInline && !jsonPath) {
    return [];
  }

  const raw = jsonInline ?? (await readFile(jsonPath as string, "utf8"));
  const parsed = JSON.parse(raw) as unknown;

  const list = Array.isArray(parsed)
    ? parsed
    : typeof parsed === "object" && parsed !== null && "files" in parsed
      ? (parsed as { files?: unknown }).files
      : [];

  if (!Array.isArray(list)) return [];

  return list
    .map((item): FileEntry | null => {
      if (!item || typeof item !== "object") return null;
      const rec = item as Record<string, unknown>;
      const key = typeof rec.key === "string" ? rec.key : "";
      const downloadUrl = typeof rec.downloadUrl === "string" ? rec.downloadUrl : "";
      const uploadUrl = typeof rec.uploadUrl === "string" ? rec.uploadUrl : undefined;
      if (!key || !downloadUrl) return null;
      return { key, downloadUrl, uploadUrl };
    })
    .filter((x): x is FileEntry => x !== null);
}

app.get("/api/files", async (_req, res) => {
  if (storageMode === "presigned") {
    try {
      const files = await loadPresignedFileEntries();
      res.json({ files });
    } catch (error) {
      console.error("Error loading presigned file list:", error);
      res.status(500).json({ files: [] });
    }
    return;
  }

  try {
    const list: string[] = [];
    let continuationToken: string | undefined;

    do {
      const result = await s3Client.send(
        new ListObjectsV2Command({
          Bucket: s3Bucket,
          ContinuationToken: continuationToken,
        }),
      );
      for (const obj of result.Contents ?? []) {
        if (obj.Key) list.push(obj.Key);
      }
      continuationToken = result.IsTruncated ? result.NextContinuationToken : undefined;
    } while (continuationToken);

    const files: FileEntry[] = list.map((key) => ({
      key,
      downloadUrl: `/static/${key}`,
      uploadUrl: `/api/static/${key}`,
    }));

    res.json({ files });
  } catch (error) {
    console.error("Error listing from MinIO:", error);
    res.status(500).json({ files: [] });
  }
});

app.put(
  /^\/api\/static\/(.+)$/,
  express.raw({ type: "*/*", limit: "50mb" }),
  async (req, res) => {
    if (storageMode === "presigned") {
      res.status(501).json({
        ok: false,
        message:
          "Upload is disabled in presigned mode. Use a presigned uploadUrl from your backend.",
      });
      return;
    }

    const key = (req.params as { 0: string })[0];
    const body = req.body as Buffer | undefined;

    if (!body || !Buffer.isBuffer(body)) {
      res.status(400).send("No file content");
      return;
    }

    try {
      await s3Client.send(
        new PutObjectCommand({
          Bucket: s3Bucket,
          Key: key,
          Body: body,
        }),
      );
      res.status(200).json({ ok: true });
    } catch (error) {
      console.error("Error writing to MinIO:", error);
      res.status(500).json({ ok: false, message: "Upload failed" });
    }
  },
);

app.get("/", (_req, res) => {
  res.sendFile(path.join(rootDir, "index.html"));
});

app.use(express.static(rootDir));

app.listen(PORT, () => {
  console.log("Server running at http://localhost:" + PORT);
});

