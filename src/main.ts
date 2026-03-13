function setupDownloadButton() {
  const button = document.getElementById("download-button") as
    | HTMLButtonElement
    | null;

  if (!button) {
    console.warn("Download-Button mit ID 'download-button' wurde nicht gefunden.");
    return;
  }

  button.addEventListener("click", async () => {
    try {
      const response = await fetch("/api/open-document", { method: "POST" });

      if (!response.ok) {
        console.error("Dokument konnte nicht geöffnet werden.");
        alert("Die Datei konnte nicht geöffnet werden.");
        return;
      }
    } catch (error) {
      console.error("Fehler beim Aufruf des Bridge-Services:", error);
      alert("Es ist ein Fehler beim Öffnen der Datei aufgetreten.");
    }
  });
}

document.addEventListener("DOMContentLoaded", setupDownloadButton);

