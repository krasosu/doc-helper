import express from "express";
import path from "node:path";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import type { Readable } from "node:stream";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ?? 3000;

const rootDir = path.join(__dirname, "..");

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

    const contentType = data.ContentType ?? "application/octet-stream";

    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${key}"`);

    const body = data.Body as Readable | undefined;
    if (!body) {
      res.status(500).send("Kein Inhalt erhalten");
      return true;
    }

    body.on("error", (err) => {
      console.error("Fehler beim Streamen aus MinIO:", err);
      if (!res.headersSent) {
        res.status(500).send("Fehler beim Streamen der Datei");
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
    console.error("Fehler beim Laden aus MinIO:", error);

    const localPath = path.join(rootDir, "static", key);
    if (existsSync(localPath)) {
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${path.basename(key)}"`,
      );
      res.sendFile(localPath);
    } else {
      res.status(404).send("Datei nicht gefunden. MinIO-Bucket prüfen und " + key + " hochladen.");
    }
  }
});

app.get("/api/files", async (_req, res) => {
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

    res.json({ files: list });
  } catch (error) {
    console.error("Fehler beim Listen aus MinIO:", error);
    res.status(500).json({ files: [] });
  }
});

app.put(
  /^\/api\/static\/(.+)$/,
  express.raw({ type: "*/*", limit: "50mb" }),
  async (req, res) => {
    const key = (req.params as { 0: string })[0];
    const body = req.body as Buffer | undefined;

    if (!body || !Buffer.isBuffer(body)) {
      res.status(400).send("Kein Dateiinhalt");
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
      console.error("Fehler beim Schreiben nach MinIO:", error);
      res.status(500).json({ ok: false, message: "Upload fehlgeschlagen" });
    }
  },
);

app.get("/", (_req, res) => {
  res.sendFile(path.join(rootDir, "index.html"));
});

app.use(express.static(rootDir));

app.listen(PORT, () => {
  console.log(`Server läuft auf http://localhost:${PORT}`);
});

