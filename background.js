let lastOcrResult = ""; // Храним результат OCR

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "captureScreen") {
    chrome.tabs.captureVisibleTab((screenshotUrl) => {
      console.log("[INFO] Screenshot captured");

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

        // Сохраняем результат
        lastOcrResult = result.text || "Текст не розпізнано";

        // Отправляем результат всем popup'ам, которые открыты
        chrome.runtime.sendMessage({
          action: "ocrResult",
          text: lastOcrResult
        });
      })
      .catch(error => console.error("[ERROR] OCR request failed:", error));
  }

  // Когда popup запрашивает текст
  if (message.action === "getOcrResult") {
    sendResponse({ text: lastOcrResult });
  }
});
