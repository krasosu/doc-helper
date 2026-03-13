"use strict";
function setupDownloadButton() {
    const button = document.getElementById("download-button");
    if (!button) {
        console.warn("Download-Button mit ID 'download-button' wurde nicht gefunden.");
        return;
    }
    button.addEventListener("click", async () => {
        try {
            const documentUrl = `${window.location.origin}/static/document.docx`;
            const response = await fetch("http://localhost:17865/open-document", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ url: documentUrl }),
            });
            if (!response.ok) {
                console.error("Lokaler Helper konnte die Datei nicht öffnen.");
                alert("Die Datei konnte lokal nicht geöffnet werden. Läuft der Client-Helper?");
                return;
            }
        }
        catch (error) {
            console.error("Fehler beim Aufruf des Client-Helpers:", error);
            alert("Es ist ein Fehler beim Öffnen der Datei aufgetreten (Client-Helper nicht erreichbar?).");
        }
    });
}
document.addEventListener("DOMContentLoaded", setupDownloadButton);
