## Simple Word & Audio Download App

Diese kleine Anwendung stellt eine Word-Datei und eine WAV-Datei über eine
Weboberfläche bereit. Optional kann ein lokaler Client-Helper genutzt werden,
um die Dateien automatisch im Standardprogramm des Clients zu öffnen.

### Projektstruktur

- `index.html` – UI mit zwei Buttons (Word & Audio)
- `src/main.ts` – Frontend-Logik (Kommunikation mit lokalem Helper + Fallback-Download)
- `src/server.ts` – Express-Server, der die Web-App und den `static`-Ordner bereitstellt
- `static/` – enthält `document.docx` und `audio.wav`
- `client/` – Client-Helper, der auf jedem Client-Rechner laufen kann

### Voraussetzungen

- Node.js (18+) auf dem Server/Entwicklungsrechner
- npm

### Installation & Build

Im Projektordner:

```bash
npm install
npm run build
```

### Server starten

```bash
npm start
```

Standardmäßig lauscht der Server auf `http://localhost:3000`. In
Produktionsszenarien kannst du den Port über `PORT` setzen oder den Server in
einen Docker-Container packen.

### Nutzung im Browser

1. `static/document.docx` und `static/audio.wav` bereitstellen.
2. Im Browser `http://<server>:3000` öffnen.
3. Buttons:
   - „Word-Datei herunterladen“ – `document.docx`
   - „Audio (.wav) herunterladen“ – `audio.wav`

Die Frontend-Logik versucht zuerst, die Datei über den lokalen Client-Helper
automatisch zu öffnen. Falls dieser nicht erreichbar ist, wird der Browser
Fallback genutzt (normaler Download).

### Client-Helper

Der Client-Helper lebt im Ordner `client/`. Er kann:

- direkt mit Node.js gestartet werden (`node client-helper.mjs`) oder
- als eigenständige Windows-EXE gebaut werden (`doc-helper.exe`).

Details siehe `client/README.md`.

