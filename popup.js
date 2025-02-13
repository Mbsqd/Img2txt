// Запрашиваем последний OCR-результат
chrome.runtime.sendMessage({ action: "getOcrResult" }, (response) => {
  if (response && response.text) {
    document.getElementById("recognizedText").textContent = response.text;
  }
});

// Обробка кнопки "Обрати область"
document.getElementById("selectAreaButton").addEventListener("click", function () {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    chrome.tabs.sendMessage(tabs[0].id, { action: "startSelection" });
  });
});

// Обробка кнопки "Копіювати"
document.getElementById("copyButton").addEventListener("click", function () {
  const recognizedTextElement = document.getElementById("recognizedText");
  const textToCopy = recognizedTextElement.textContent.trim();

  if (textToCopy) {
    navigator.clipboard.writeText(textToCopy);
  } else {
    alert("Немає тексту для копіювання.");
  }
});
