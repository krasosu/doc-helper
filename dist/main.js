"use strict";
const WORD_FILE_PATH = "static/document.docx";
const WORD_FILE_DOWNLOAD_NAME = "mein-dokument.docx";
function setupDownloadButton() {
    const button = document.getElementById("download-button");
    if (!button) {
        console.warn("Download-Button mit ID 'download-button' wurde nicht gefunden.");
        return;
    }
    button.addEventListener("click", () => {
        const link = document.createElement("a");
        link.href = WORD_FILE_PATH;
        link.download = WORD_FILE_DOWNLOAD_NAME;
        link.style.display = "none";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });
}
document.addEventListener("DOMContentLoaded", setupDownloadButton);
