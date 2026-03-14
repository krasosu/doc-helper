## Simple Word & Audio Download App

Diese kleine Anwendung stellt eine Word-Datei und eine WAV-Datei über eine
Weboberfläche bereit. Die Dateien werden aus einem S3-kompatiblen Storage
bezogen (lokal per MinIO nachgestellt). Optional kann ein lokaler
Client-Helper genutzt werden, um die Dateien automatisch im Standardprogramm
des Clients zu öffnen.

### Projektstruktur

- `index.html` – UI mit zwei Buttons (Word & Audio)
- `src/main.ts` – Frontend-Logik (Kommunikation mit lokalem Helper + Fallback-Download)
- `src/server.ts` – Express-Server, der die Web-App bereitstellt und Downloads aus S3/MinIO streamt
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

Im Browser `http://<server>:3000` öffnen und einen der Buttons klicken:

- „Word-Datei herunterladen“ → `document.docx`
- „Audio (.wav) herunterladen“ → `audio.wav`

Die Frontend-Logik versucht zuerst, die Datei über den lokalen Client-Helper
automatisch zu öffnen. Falls dieser nicht erreichbar ist, wird der Browser
Fallback genutzt (normaler Download).

### Client-Helper

Der Client-Helper lebt im Ordner `client/`. Er kann:

- direkt mit Node.js gestartet werden (`node client-helper.mjs`) oder
- als eigenständige Windows-EXE gebaut werden (`doc-helper.exe`).

Details siehe `client/README.md`.

