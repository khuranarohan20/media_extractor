document.getElementById("download").addEventListener("click", () => {
  chrome.runtime.sendMessage({ action: "fetchAndDownloadMedia" });
});
