var _a, _b, _c, _d, _e, _f;
import express from "express";
import path from "node:path";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = (_a = process.env.PORT) !== null && _a !== void 0 ? _a : 3000;
const rootDir = path.join(__dirname, "..");
const s3Endpoint = (_b = process.env.MINIO_ENDPOINT) !== null && _b !== void 0 ? _b : "http://localhost:9000";
const s3Region = (_c = process.env.MINIO_REGION) !== null && _c !== void 0 ? _c : "us-east-1";
const s3Bucket = (_d = process.env.MINIO_BUCKET) !== null && _d !== void 0 ? _d : "documents";
const s3AccessKey = (_e = process.env.MINIO_ACCESS_KEY) !== null && _e !== void 0 ? _e : "minioadmin";
const s3SecretKey = (_f = process.env.MINIO_SECRET_KEY) !== null && _f !== void 0 ? _f : "minioadmin";
const s3Client = new S3Client({
    endpoint: s3Endpoint,
    region: s3Region,
    credentials: {
        accessKeyId: s3AccessKey,
        secretAccessKey: s3SecretKey,
    },
    forcePathStyle: true,
});
function sendFileFromMinIO(key, res) {
    return (async () => {
        var _a;
        const command = new GetObjectCommand({
            Bucket: s3Bucket,
            Key: key,
        });
        const data = await s3Client.send(command);
        const contentType = (_a = data.ContentType) !== null && _a !== void 0 ? _a : (key.endsWith(".docx")
            ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            : key.endsWith(".wav")
                ? "audio/wav"
                : "application/octet-stream");
        res.setHeader("Content-Type", contentType);
        res.setHeader("Content-Disposition", `attachment; filename="${key}"`);
        const body = data.Body;
        if (!body) {
            res.status(500).send("Kein Inhalt erhalten");
            return true;
        }
        body.on("error", (err) => {
            console.error("Fehler beim Streamen aus MinIO:", err);
            if (!res.headersSent) {
                res.status(500).send("Fehler beim Streamen der Datei");
            }
            else {
                res.end();
            }
        });
        body.pipe(res);
        return true;
    })();
}
app.get("/static/:key", async (req, res) => {
    const { key } = req.params;
    try {
        await sendFileFromMinIO(key, res);
    }
    catch (error) {
        console.error("Fehler beim Laden aus MinIO:", error);
        const localPath = path.join(rootDir, "static", key);
        if (existsSync(localPath)) {
            res.setHeader("Content-Disposition", `attachment; filename="${path.basename(key)}"`);
            res.sendFile(localPath);
        }
        else {
            res.status(404).send("Datei nicht gefunden. MinIO-Bucket 'documents' prüfen und " + key + " hochladen.");
        }
    }
});
app.put("/api/static/:key", express.raw({ type: "*/*", limit: "50mb" }), async (req, res) => {
    const key = req.params.key;
    const body = req.body;
    if (!body || !Buffer.isBuffer(body)) {
        res.status(400).send("Kein Dateiinhalt");
        return;
    }
    try {
        await s3Client.send(new PutObjectCommand({
            Bucket: s3Bucket,
            Key: key,
            Body: body,
        }));
        res.status(200).json({ ok: true });
    }
    catch (error) {
        console.error("Fehler beim Schreiben nach MinIO:", error);
        res.status(500).json({ ok: false, message: "Upload fehlgeschlagen" });
    }
});
app.get("/", (_req, res) => {
    res.sendFile(path.join(rootDir, "index.html"));
});
app.use(express.static(rootDir));
app.listen(PORT, () => {
    console.log(`Server läuft auf http://localhost:${PORT}`);
});
