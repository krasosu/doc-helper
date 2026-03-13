## Client-Helper für automatisches Öffnen der Datei

Dieser Helper läuft **lokal auf jedem Client** (Windows oder Linux) und öffnet
eine vom Browser angegebene URL automatisch mit dem Standardprogramm des
Systems.

### Funktionsweise

- Der Helper lauscht auf `http://localhost:17865/open-document`.
- Die Web-Anwendung schickt einen `POST`-Request mit JSON-Body:

  ```json
  {
    "url": "http://dein-server:3000/static/document.docx"
  }
  ```

- Der Helper lädt die Datei von dieser URL herunter, speichert sie temporär
  und öffnet sie mit dem Standardprogramm:
  - Windows: `start`
  - Linux: `xdg-open`
  - macOS (falls verwendet): `open`

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


