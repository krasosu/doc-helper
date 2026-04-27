type FileEntry = {
  key: string;
  downloadUrl: string;
  uploadUrl?: string;
};

function toAbsoluteUrl(url: string) {
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("/")) return `${window.location.origin}${url}`;
  return `${window.location.origin}/${url}`;
}

async function triggerHelperOrDownload(entry: FileEntry) {
  const downloadUrl = toAbsoluteUrl(entry.downloadUrl);
  const uploadUrl = toAbsoluteUrl(entry.uploadUrl ?? entry.downloadUrl);

  try {
    const response = await fetch("http://localhost:17865/open-document", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        key: entry.key,
        downloadUrl,
        uploadUrl,
      }),
    });

    if (!response.ok) {
      console.warn("Helper could not open file, falling back to download.");
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = "";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  } catch (error) {
    console.warn("Helper not reachable, using normal download.", error);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = "";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

function renderFileList(files: FileEntry[]) {
  const container = document.getElementById("file-list");
  const emptyEl = document.getElementById("file-list-empty");

  if (!container) return;

  container.innerHTML = "";

  if (files.length === 0) {
    if (emptyEl) emptyEl.style.display = "block";
    return;
  }

  if (emptyEl) emptyEl.style.display = "none";

  files.forEach((entry, i) => {
    if (i > 0) {
      const spacer = document.createElement("div");
      spacer.style.height = "0.75rem";
      container.appendChild(spacer);
    }
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = entry.key;
    btn.addEventListener("click", () => {
      triggerHelperOrDownload(entry);
    });
    container.appendChild(btn);
  });
}

async function loadFileList() {
  const container = document.getElementById("file-list");
  if (!container) return;

  try {
    const res = await fetch("/api/files");
    const data = (await res.json()) as { files?: FileEntry[] };
    const files = Array.isArray(data.files) ? data.files : [];
    renderFileList(files);
  } catch (error) {
    console.error("Could not load file list:", error);
    renderFileList([]);
  }
}

document.addEventListener("DOMContentLoaded", loadFileList);
