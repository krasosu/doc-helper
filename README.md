## Simple Word & Audio Download App

Diese kleine Anwendung stellt eine Word-Datei und eine WAV-Datei über eine
Weboberfläche bereit. Die Dateien werden aus einem S3-kompatiblen Storage
bezogen (lokal per MinIO nachgestellt). Optional kann ein lokaler
Client-Helper genutzt werden, um die Dateien automatisch im Standardprogramm
des Clients zu öffnen.

### Projektstruktur

- `index.html` – UI (Dateiliste wird dynamisch geladen)
- `src/main.ts` – Frontend-Logik (Kommunikation mit lokalem Helper + Fallback-Download)
- `src/server.ts` – Express-Server (Dev: MinIO/S3; Prod: optional presigned URLs)
- `docker-compose.yml` – Startet Web-App + MinIO für lokale Entwicklung
- `client/` – Client-Helper, der auf jedem Client-Rechner laufen kann

### Voraussetzungen

- Node.js (18+) auf dem Server/Entwicklungsrechner
- npm
- Docker & Docker Compose (für das lokale Setup mit MinIO)

### Installation & Build (ohne Docker)

Im Projektordner:

```bash
npm install
npm run build
```

Server starten:

```bash
MINIO_ENDPOINT=http://localhost:9000 \
MINIO_BUCKET=documents \
MINIO_ACCESS_KEY=minioadmin \
MINIO_SECRET_KEY=minioadmin \
npm start
```

Standardmäßig lauscht der Server auf `http://localhost:3000`.

### Docker & MinIO (empfohlen für lokale Entwicklung)

Im Projektordner:

```bash
docker compose up --build
```

Danach:

- Web-App: `http://localhost:3000`
- MinIO Console: `http://localhost:9001` (Login: `minioadmin` / `minioadmin`)

In MinIO:

1. Bucket `documents` anlegen.
2. Die Dateien `document.docx` und `audio.wav` in diesen Bucket hochladen.

Die Route `GET /static/:key` (z. B. `/static/document.docx`) streamt dann die
Dateien direkt aus MinIO.

### Nutzung im Browser

Im Browser `http://<server>:3000` öffnen. Die UI lädt die Dateiliste aus
`GET /api/files` und zeigt pro Objekt im Bucket einen Button an.

Die Frontend-Logik versucht zuerst, die Datei über den lokalen Client-Helper
automatisch zu öffnen. Falls dieser nicht erreichbar ist, wird der Browser
Fallback genutzt (normaler Download).

### Production (presigned URLs, no S3 credentials in app)

In Produktion kannst du den Server so konfigurieren, dass er **keine S3
Credentials** benötigt und stattdessen eine Liste aus **pre-signed GET/PUT
URLs** ausliefert.

- **Wichtig:** Die pre-signed URLs müssen von einem separaten Service/Backend
  erzeugt werden (typischerweise mit S3 credentials). Diese App konsumiert
  nur die fertige Liste.

- Setze:
  - `STORAGE_MODE=presigned`
  - `PRESIGNED_FILES_JSON` **oder** `PRESIGNED_FILES_PATH`

Format (Beispiel):

```json
{
  "files": [
    {
      "key": "reports/example.xml",
      "url": "https://s3.example.com/bucket/reports/example.xml?..."
    }
  ]
}
```

- `url`: URL zum Objekt. Diese wird fürs Öffnen (GET) und für Sync-Uploads (PUT)
  wiederverwendet. Wenn ihr strikt presigned URLs nutzt, muss diese URL dafür
  geeignet sein (z. B. explizit für PUT signiert oder von eurem Backend so
  bereitgestellt, dass GET+PUT funktionieren).

Optional kannst du weiterhin `downloadUrl`/`uploadUrl` angeben; wenn `uploadUrl`
fehlt, wird `url` bzw. `downloadUrl` als Upload-URL verwendet.

### Corporate HTTPS certificates

Wenn firmeneigene TLS-Zertifikat genutzt werden, müssen Server/Helper dem CA
vertrauen.

- **Node.js (Server/Helper):** setze `NODE_EXTRA_CA_CERTS` auf eine PEM-Datei mit
  eurer CA-Chain:

```bash
export NODE_EXTRA_CA_CERTS=/path/to/company-ca.pem
```

Für Docker kannst du die Datei in den Container mounten und die Env-Variable setzen.

Beispiel (Docker run):

```bash
docker run --rm -p 3000:3000 \
  -e NODE_EXTRA_CA_CERTS=/certs/company-ca.pem \
  -v "$(pwd)/certs/company-ca.pem:/certs/company-ca.pem:ro" \
  simple-download-app
```

### Windows helper EXE + corporate CA

Die Windows-EXE wird wie gewohnt gebaut (siehe `client/README.md`). Damit sie
HTTPS zu S3/S3-compatible storage mit firmeneigenen Zertifikaten akzeptiert, starte sie mit
gesetztem `NODE_EXTRA_CA_CERTS` (Pfad zu eurer CA-PEM-Datei).

Beispiele findest du in `client/README.md` (Batch/PowerShell).

### Client-Helper

Der Client-Helper lebt im Ordner `client/`. Er kann:

- direkt mit Node.js gestartet werden (`node client-helper.mjs`) oder
- als eigenständige Windows-EXE gebaut werden (`doc-helper.exe`).

Details siehe `client/README.md`.

