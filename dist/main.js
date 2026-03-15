"use strict";
async function triggerHelperOrDownload(url) {
    try {
        const response = await fetch("http://localhost:17865/open-document", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ url }),
        });
        if (!response.ok) {
            console.warn("Helper could not open file, falling back to download.");
            const link = document.createElement("a");
            link.href = url;
            link.download = "";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }
    catch (error) {
        console.warn("Helper not reachable, using normal download.", error);
        const link = document.createElement("a");
        link.href = url;
        link.download = "";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}
function renderFileList(files) {
    const container = document.getElementById("file-list");
    const emptyEl = document.getElementById("file-list-empty");
    if (!container)
        return;
    container.innerHTML = "";
    if (files.length === 0) {
        if (emptyEl)
            emptyEl.style.display = "block";
        return;
    }
    if (emptyEl)
        emptyEl.style.display = "none";
    const baseUrl = window.location.origin;
    files.forEach((key, i) => {
        if (i > 0) {
            const spacer = document.createElement("div");
            spacer.style.height = "0.75rem";
            container.appendChild(spacer);
        }
        const btn = document.createElement("button");
        btn.type = "button";
        btn.textContent = key;
        btn.addEventListener("click", () => {
            const url = `${baseUrl}/static/${key.split("/").map(encodeURIComponent).join("/")}`;
            triggerHelperOrDownload(url);
        });
        container.appendChild(btn);
    });
}
async function loadFileList() {
    const container = document.getElementById("file-list");
    if (!container)
        return;
    try {
        const res = await fetch("/api/files");
        const data = (await res.json());
        const files = Array.isArray(data.files) ? data.files : [];
        renderFileList(files);
    }
    catch (error) {
        console.error("Could not load file list:", error);
        renderFileList([]);
    }
}
document.addEventListener("DOMContentLoaded", loadFileList);
