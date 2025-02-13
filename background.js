chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "captureScreen") {
    chrome.tabs.captureVisibleTab((screenshotUrl) => {
      console.log("[INFO] Screenshot captured");

      // Отправляем полный скриншот в content.js для обрезки
      chrome.tabs.sendMessage(sender.tab.id, {
        action: "cropImage",
        dataUrl: screenshotUrl,
        rect: message.rect
      });
    });
  } else if (message.action === "croppedData") {
    console.log("[INFO] Sending cropped image to server...");

    fetch("http://127.0.0.1:5000/ocr", {
      method: "POST",
      body: JSON.stringify({ image: message.croppedDataUrl }),
      headers: { "Content-Type": "application/json" }
    })
      .then(response => response.json())
      .then(result => {
        console.log("[INFO] OCR result received:", result.text);

        // Отправляем текст в popup.js
        chrome.runtime.sendMessage({
          action: "ocrResult",
          text: result.text
        });
      })
      .catch(error => console.error("[ERROR] OCR request failed:", error));
  }
});
