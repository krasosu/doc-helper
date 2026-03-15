var _a, _b, _c, _d, _e, _f;
import express from "express";
import path from "node:path";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { S3Client, GetObjectCommand, PutObjectCommand, ListObjectsV2Command, } from "@aws-sdk/client-s3";
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
        const contentType = (_a = data.ContentType) !== null && _a !== void 0 ? _a : "application/octet-stream";
        res.setHeader("Content-Type", contentType);
        res.setHeader("Content-Disposition", `attachment; filename="${key}"`);
        const body = data.Body;
        if (!body) {
            res.status(500).send("No content received");
            return true;
        }
        body.on("error", (err) => {
            console.error("Error streaming from MinIO:", err);
            if (!res.headersSent) {
                res.status(500).send("Error streaming file");
            }
            else {
                res.end();
            }
        });
        body.pipe(res);
        return true;
    })();
}
app.get(/^\/static\/(.+)$/, async (req, res) => {
    const key = req.params[0];
    try {
        await sendFileFromMinIO(key, res);
    }
    catch (error) {
        console.error("Error loading from MinIO:", error);
        const localPath = path.join(rootDir, "static", key);
        if (existsSync(localPath)) {
            res.setHeader("Content-Disposition", `attachment; filename="${path.basename(key)}"`);
            res.sendFile(localPath);
        }
        else {
            res.status(404).send("File not found. Check bucket and upload: " + key);
        }
    }
});
app.get("/api/files", async (_req, res) => {
    var _a;
    try {
        const list = [];
        let continuationToken;
        do {
            const result = await s3Client.send(new ListObjectsV2Command({
                Bucket: s3Bucket,
                ContinuationToken: continuationToken,
            }));
            for (const obj of (_a = result.Contents) !== null && _a !== void 0 ? _a : []) {
                if (obj.Key)
                    list.push(obj.Key);
            }
            continuationToken = result.IsTruncated ? result.NextContinuationToken : undefined;
        } while (continuationToken);
        res.json({ files: list });
    }
    catch (error) {
        console.error("Error listing from MinIO:", error);
        res.status(500).json({ files: [] });
    }
});
app.put(/^\/api\/static\/(.+)$/, express.raw({ type: "*/*", limit: "50mb" }), async (req, res) => {
    const key = req.params[0];
    const body = req.body;
    if (!body || !Buffer.isBuffer(body)) {
        res.status(400).send("No file content");
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
        console.error("Error writing to MinIO:", error);
        res.status(500).json({ ok: false, message: "Upload failed" });
    }
});
app.get("/", (_req, res) => {
    res.sendFile(path.join(rootDir, "index.html"));
});
app.use(express.static(rootDir));
app.listen(PORT, () => {
    console.log("Server running at http://localhost:" + PORT);
});
