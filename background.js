importScripts("./jszip.min.js");

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "fetchAndDownloadMedia") {
    let baseApiUrl =
      "https://fancentro.com/admin/lapi/vaultItems?include=storageResource%2CvaultResourceTag.resourceTag%2Cmeta&thumbnailSizes%5BvaultItem.thumb%5D=AEzPQNtN5e&thumbnailSizes%5Bstorage.resourcePath%5D=AEzPQNtN5e&page%5Bsize%5D=100&filter%5BmediaType%5D%5B0%5D=image&filter%5BmediaType%5D%5B1%5D=video&filter%5BmediaType%5D%5B2%5D=audio&sort=-createdAt";

    chrome.cookies.getAll({ domain: "fancentro.com" }, (cookies) => {
      if (!cookies.length) {
        console.error("No cookies found.");
        sendResponse({ success: false, error: "No cookies found" });
        return;
      }

      let cookieHeader = cookies
        .map((cookie) => `${cookie.name}=${cookie.value}`)
        .join("; ");

      let headers = {
        Accept: "*/*",
        "Content-Type": "application/json",
        Referer: "https://fancentro.com/admin/uploads",
        "User-Agent": navigator.userAgent,
        Cookie: cookieHeader,
      };

      let allMediaLinks = [];
      let pageNumber = 1;

      function fetchPage() {
        let apiUrl = `${baseApiUrl}&page%5Bnumber%5D=${pageNumber}`;

        fetch(apiUrl, { headers })
          .then((res) => res.json())
          .then((data) => {
            if (!data.included || !data.included.length) {
              sendResponse({ success: false, error: "No media found." });
            }

            if (pageNumber <= data.meta.page["last-page"]) {
              let mediaLinks = data.included
                .filter((item) => item.type === "storageResources")
                .map((item) => item.attributes.resourcePath)
                .map((item) => {
                  if (typeof item === "string") {
                    return item;
                  } else if (typeof item === "object") {
                    return Object.values(item)[0];
                  }
                })
                .filter(Boolean);
              allMediaLinks.push(...mediaLinks);
              pageNumber++;
              fetchPage();
            } else {
              if (allMediaLinks.length > 0) {
                console.log("Media links:", allMediaLinks);
                downloadAsZip(allMediaLinks);
                sendResponse({ success: true, links: allMediaLinks });
              } else {
                console.warn("No media found.");
                sendResponse({ success: false, error: "No media found." });
              }
            }
          })
          .catch((err) => {
            sendResponse({ success: false, error: err.message });
            console.error("Error fetching media:", err);
          });
      }

      fetchPage();
    });

    return true;
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getCookies") {
    chrome.cookies.getAll({ domain: "fancentro.com" }, (cookies) => {
      if (chrome.runtime.lastError) {
        console.error("Failed to get cookies:", chrome.runtime.lastError);
        sendResponse({ success: false, error: chrome.runtime.lastError });
      } else {
        sendResponse({ success: true, cookies });
      }
    });
    return true;
  }
});

function downloadAsZip(links) {
  console.log("%cI am inside downloadAsZip", "font-size:1.5rem; color:Red;", {
    links,
  });
  let zip = new JSZip();
  let count = 0;

  links.forEach((url, index) => {
    fetch(url)
      .then((res) => res.blob())
      .then((blob) => {
        zip.file(`media_${index + 1}.${blob.type.split("/")[1]}`, blob);
        count++;

        if (count === links.length) {
          zip.generateAsync({ type: "blob" }).then((blob) => {
            let reader = new FileReader();
            reader.readAsDataURL(blob);
            reader.onloadend = () => {
              let base64Data = reader.result;
              chrome.tabs.query(
                { active: true, currentWindow: true },
                (tabs) => {
                  if (tabs.length > 0) {
                    chrome.tabs.sendMessage(tabs[0].id, {
                      action: "triggerDownload",
                      blobData: base64Data,
                    });
                  } else {
                    console.error("No active tab found.");
                  }
                }
              );
            };
          });
        }
      })
      .catch((err) => console.error(`Failed to download ${url}:`, err));
  });
}
