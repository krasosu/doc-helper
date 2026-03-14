async function triggerHelperOrDownload(url: string) {
  try {
    const response = await fetch("http://localhost:17865/open-document", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url }),
    });

    if (!response.ok) {
      console.warn("Lokaler Helper konnte die Datei nicht öffnen, falle auf Download zurück.");
      const link = document.createElement("a");
      link.href = url;
      link.download = "";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  } catch (error) {
    console.warn("Client-Helper nicht erreichbar, starte normalen Download.", error);
    const link = document.createElement("a");
    link.href = url;
    link.download = "";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

function setupDownloadButtons() {
  const wordButton = document.getElementById("download-word-button") as
    | HTMLButtonElement
    | null;
  const audioButton = document.getElementById("download-audio-button") as
    | HTMLButtonElement
    | null;

  if (!wordButton) {
    console.warn(
      "Download-Button mit ID 'download-word-button' wurde nicht gefunden.",
    );
  } else {
    wordButton.addEventListener("click", async () => {
      const documentUrl = `${window.location.origin}/static/document.docx`;
      await triggerHelperOrDownload(documentUrl);
    });
  }

  if (!audioButton) {
    console.warn(
      "Download-Button mit ID 'download-audio-button' wurde nicht gefunden.",
    );
  } else {
    audioButton.addEventListener("click", async () => {
      const audioUrl = `${window.location.origin}/static/audio.wav`;
      await triggerHelperOrDownload(audioUrl);
    });
  }
}

document.addEventListener("DOMContentLoaded", setupDownloadButtons);

