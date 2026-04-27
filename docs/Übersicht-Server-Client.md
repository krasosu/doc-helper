# Übersicht: Server & Client

**Zweck:** Dateien aus MinIO/S3 in der Web-UI anzeigen, lokal im Standardprogramm öffnen und nach Bearbeitung automatisch zurück in MinIO schreiben.

---

## Server (Node.js, Express)

| Punkt | Inhalt |
|--------|--------|
| **Aufgabe** | Web-App ausliefern, Dateien aus MinIO streamen, Änderungen zurück in MinIO schreiben |
| **Tech** | Express, AWS SDK (S3/MinIO), TypeScript |
| **Wichtig** | `GET /api/files` → Liste aus Bucket; `GET /static/:key` → Download aus MinIO; `PUT /api/static/:key` → Sync zurück |
| **Config** | MinIO per ENV (Endpoint, Bucket, Keys); lokal z. B. mit `docker compose` inkl. MinIO |

---

## Web-Client (Frontend)

| Punkt | Inhalt |
|--------|--------|
| **Aufgabe** | Dateiliste anzeigen, pro Datei „Öffnen/Download“ anstoßen |
| **Ablauf** | Lädt `/api/files`, baut Buttons; Klick → zuerst Helper (`localhost:17865`), sonst Fallback-Download über `/static/...` |

---

## Client-Helper (Desktop, optional)

| Punkt | Inhalt |
|--------|--------|
| **Aufgabe** | Datei mit System-Standardprogramm öffnen und Änderungen zurück in MinIO syncen (Browser darf das nicht) |
| **Tech** | Kleiner Node-HTTP-Server, ggf. als EXE (pkg) |
| **Ablauf** | 1) Empfängt URL von der Web-App. 2) Lädt Datei, speichert temp, startet `xdg-open`/`start`. 3) Beobachtet Verzeichnis, bei Speichern → Upload per `PUT /api/static/:key` an den Server |

Ohne Helper: nur normaler Download. Mit Helper: Öffnen + automatischer Sync zurück.
