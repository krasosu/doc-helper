import express from "express";
import path from "node:path";
import { existsSync } from "node:fs";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
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

app.get("/static/:key", async (req, res) => {
  const { key } = req.params;

  try {
    const command = new GetObjectCommand({
      Bucket: s3Bucket,
      Key: key,
    });

    const data = await s3Client.send(command);

    const contentType =
      data.ContentType ??
      (key.endsWith(".docx")
        ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        : key.endsWith(".wav")
          ? "audio/wav"
          : "application/octet-stream");

    res.setHeader("Content-Type", contentType);

    const body = data.Body as Readable | undefined;
    if (!body) {
      res.status(500).send("Kein Inhalt erhalten");
      return;
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
  } catch (error) {
    console.error("Fehler beim Laden aus MinIO:", error);
    res.status(404).send("Datei nicht gefunden");
  }
});

app.get("/", (_req, res) => {
  res.sendFile(path.join(rootDir, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server läuft auf http://localhost:${PORT}`);
});

