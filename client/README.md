## Client-Helper für automatisches Öffnen der Datei

Dieser Helper läuft **lokal auf jedem Client** (Windows oder Linux) und öffnet
eine vom Browser angegebene URL automatisch mit dem Standardprogramm des
Systems.

### Funktionsweise

- Der Helper lauscht auf `http://localhost:17865/open-document`.
- Die Web-Anwendung schickt einen `POST`-Request mit JSON-Body, z. B.:

  ```json
  {
    "key": "document.docx",
    "downloadUrl": "http://dein-server:3000/static/document.docx",
    "uploadUrl": "http://dein-server:3000/api/static/document.docx"
  }
  ```

  In Production kann `downloadUrl`/`uploadUrl` auch auf **pre-signed Ceph/S3 URLs**
  zeigen (HTTPS inkl. Query-Parameter). `uploadUrl` ist optional, aber nötig, wenn
  du automatische Uploads nach dem Speichern möchtest.

- Die Web-App liefert die Dateiliste über `/api/files`. In Dev wird MinIO genutzt,
  in Prod kann ein presigned-Index verwendet werden.
- Der Helper lädt die Datei von der angegebenen URL, speichert sie temporär
  mit passender Dateiendung und öffnet sie mit dem Standardprogramm:
  - Windows: `start`
  - Linux: `xdg-open`
  - macOS (falls verwendet): `open`

- **Sync / Upload on save:** Nach dem Öffnen beobachtet der Helper die temporäre
  Datei (über das Verzeichnis). Speichern im Programm löst nach kurzer Verzögerung
  (2s) einen Upload aus:
  - Wenn `uploadUrl` gesetzt ist: `PUT uploadUrl` (pre-signed upload)
  - Sonst: `PUT http(s)://<server>/api/static/:key` (Dev/MinIO)

### Corporate HTTPS certificates (Ceph)

Wenn Ceph ein firmeneigenes TLS-Zertifikat nutzt, muss Node.js dem CA vertrauen:

```bash
export NODE_EXTRA_CA_CERTS=/path/to/company-ca.pem
node client-helper.mjs
```

### Start (Linux & Windows, mit installiertem Node.js)

1. In dieses Verzeichnis wechseln:

   ```bash
   cd client
   ```

2. Helper starten:

   ```bash
   node client-helper.mjs
   ```

   Optional kannst du den Port per Umgebungsvariable ändern:

   ```bash
   DOC_HELPER_PORT=17865 node client-helper.mjs
   ```

Solange der Helper läuft, kann die Web-Anwendung die konkrete Download-URL an
ihn übergeben; der Helper hat selbst **keine fest verdrahteten Dokument-URLs**
mehr.

---

### Bauen einer Windows-EXE mit `pkg`

Diese Schritte führst du **einmalig auf einem Rechner mit Node.js und npm**
aus (z. B. deinem Entwicklungsrechner). Die erzeugte `doc-helper.exe` kannst du
anschließend auf beliebige Windows-Clients kopieren – dort ist kein Node.js
erforderlich.

1. Global `pkg` installieren:

   ```bash
   npm install -g pkg
   ```

2. In das `client`-Verzeichnis wechseln:

   ```bash
   cd client
   ```

3. EXE für Windows (64‑bit) bauen:

   ```bash
   pkg index.js --targets node18-win-x64 --output doc-helper.exe
   ```

   - Ergebnis: `doc-helper.exe` im `client`-Ordner.

4. `doc-helper.exe` auf den Windows-Client kopieren und dort starten:

   ```powershell
   cd Pfad\zu\deinem\Ordner
   .\doc-helper.exe
   ```

   In der Konsole sollte erscheinen:

   ```text
   Doc-Helper läuft auf http://localhost:17865
   ```

   Solange dieses Fenster geöffnet bleibt, kann die Web-Anwendung den Helper
   nutzen und Dokumente lokal im Standardprogramm öffnen.

