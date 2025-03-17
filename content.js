chrome.runtime.sendMessage({ action: "getCookies" }, (response) => {
  if (response.success) {
    console.log("Cookies:", response.cookies);
  } else {
    console.error("Error fetching cookies:", response.error);
  }
});

chrome.runtime.onMessage.addListener((request) => {
  if (request.action === "triggerDownload") {
    let blob = fetch(request.blobData)
      .then((res) => res.blob())
      .then((blob) => {
        let blobUrl = URL.createObjectURL(blob);
        let link = document.createElement("a");
        link.href = blobUrl;
        link.download = "media.zip";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      })
      .catch((err) => console.error("Error creating Blob:", err));
  }
});
