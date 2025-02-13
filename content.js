// Вставляем скрипт html2canvas локально
const script = document.createElement('script');
script.src = chrome.runtime.getURL('html2canvas.js');
script.onload = function() {
    console.log('html2canvas загружен и готов к использованию');

    // Теперь можно использовать html2canvas
    html2canvas(document.body).then(function(canvas) {
        // Пример использования html2canvas
        console.log('Canvas создан');
        document.body.appendChild(canvas);
    }).catch(function(error) {
        console.error('Ошибка при использовании html2canvas:', error);
    });
};

document.head.appendChild(script);

console.log("Content script loaded");

// Слухаємо повідомлення з фону та від popup
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  if (message.action === "startSelection") {
    // Користувач натиснув кнопку "Виділити область" у popup
    console.log("Starting selection mode...");
    startSelection();
  }
  else if (message.action === "cropImage") {
    // Фоновий скрипт надіслав скріншот і координати
    console.log("Received screenshot for cropping", message.rect);
    cropImageInDOM(message.dataUrl, message.rect);
  }
  else if (message.action === "ocrResult") {
    // Результат OCR із фону (за бажанням можна обробити тут)
    console.log("OCR Result in content script:", message.text);
    // Наприклад, показати alert:
    // alert("Розпізнаний текст: " + message.text);
  }
});

/**
 * Запускає режим виділення області на сторінці (оверлей + прямокутник).
 */
function startSelection() {
  // Створюємо напівпрозорий оверлей
  const overlay = document.createElement('div');
  overlay.style.position = 'fixed';
  overlay.style.top = '0';
  overlay.style.left = '0';
  overlay.style.width = '100%';
  overlay.style.height = '100%';
  overlay.style.backgroundColor = 'rgba(0,0,0,0.2)';
  overlay.style.zIndex = '999999';
  document.body.appendChild(overlay);

  let startX, startY, endX, endY;
  let selectionBox = document.createElement('div');
  selectionBox.style.border = '2px dashed #fff';
  selectionBox.style.position = 'absolute';
  overlay.appendChild(selectionBox);

  overlay.addEventListener('mousedown', onMouseDown);
  overlay.addEventListener('mousemove', onMouseMove);
  overlay.addEventListener('mouseup', onMouseUp);

    function onMouseDown(e) {
    startX = e.clientX;
    startY = e.clientY;
    console.log("Mouse down at:", startX, startY);  // Лог для перевірки
    selectionBox.style.left = startX + 'px';
    selectionBox.style.top = startY + 'px';
    selectionBox.style.width = '0px';
    selectionBox.style.height = '0px';
    }

    function onMouseMove(e) {
    if (startX === undefined || startY === undefined) return;
    endX = e.clientX;
    endY = e.clientY;
    console.log("Mouse move at:", endX, endY);  // Лог для перевірки
    selectionBox.style.left = Math.min(startX, endX) + 'px';
    selectionBox.style.top = Math.min(startY, endY) + 'px';
    selectionBox.style.width = Math.abs(endX - startX) + 'px';
    selectionBox.style.height = Math.abs(endY - startY) + 'px';
    }

    function onMouseUp(e) {
    // Перевіряємо розміри до видалення оверлею
    const rect = selectionBox.getBoundingClientRect();
    console.log("Selected area:", rect);

    if (rect.width === 0 || rect.height === 0) {
        console.error("Selection area is empty, retrying...");
        return;
    }

    // Видаляємо обробники та оверлей після того, як все оброблено
    overlay.removeEventListener('mousedown', onMouseDown);
    overlay.removeEventListener('mousemove', onMouseMove);
    overlay.removeEventListener('mouseup', onMouseUp);
    document.body.removeChild(overlay);

    // Надсилаємо координати в фоновий скрипт для обробки
    chrome.runtime.sendMessage({ action: 'captureScreen', rect: rect });
    }
}

// /**
//  * Обрізає скриншот із урахуванням devicePixelRatio, щоб уникнути порожньої ділянки.
//  * @param {string} dataUrl – скриншот у форматі base64
//  * @param {DOMRect} rect – координати області (у CSS‑пікселях)
//  */
// function cropImageInDOM(dataUrl, rect) {
//   // Масштаб для HiDPI
//   const scale = window.devicePixelRatio || 1;
//   console.log("Cropping with scale =", scale);

//   const img = new Image();
//   img.onload = function() {
//     // Перевіримо реальні розміри скриншота
//     console.log("Screenshot dimensions:", img.naturalWidth, "x", img.naturalHeight);

//     // Створюємо canvas (у фізичних пікселях)
//     const canvas = document.createElement('canvas');
//     canvas.width = rect.width * scale;
//     canvas.height = rect.height * scale;
//     const ctx = canvas.getContext('2d');

//     console.log("Original rect:", rect);
//     console.log("Scaled rect:", {
//     left: rect.left * scale,
//     top: rect.top * scale,
//     width: rect.width * scale,
//     height: rect.height * scale
//     });

//     // Обрізаємо потрібну частину зображення з урахуванням масштабу
//     ctx.drawImage(
//       img,
//       rect.left * scale,
//       rect.top * scale,
//       rect.width * scale,
//       rect.height * scale,
//       0,
//       0,
//       rect.width * scale,
//       rect.height * scale
//     );

//     // Отримуємо base64 обрізаного зображення
//     const croppedDataUrl = canvas.toDataURL('image/png');
//     console.log("Cropped image length:", croppedDataUrl.length);

//     // Відправляємо обрізане зображення у фоновий скрипт
//     chrome.runtime.sendMessage({
//       action: 'croppedData',
//       croppedDataUrl: croppedDataUrl
//     });
//   };
//   img.onerror = function(e) {
//     console.error("Failed to load screenshot image:", e);
//   };
//   img.src = dataUrl;
// }

/**
 * Обрізає скриншот із урахуванням devicePixelRatio, щоб уникнути порожньої ділянки.
 * @param {DOMRect} rect – координати області (у CSS‑пікселях)
 */
function cropImageInDOM(rect) {
  // Масштаб для HiDPI
  const scale = window.devicePixelRatio || 1;
  console.log("Cropping with scale =", scale);

  // Используем html2canvas для захвата всего контента страницы
  html2canvas(document.body, {
    scale: scale,
    x: rect.left,
    y: rect.top,
    width: rect.width,
    height: rect.height
  }).then(function(canvas) {
    // Получаем base64-строку из canvas
    const croppedDataUrl = canvas.toDataURL('image/png');
    console.log("Cropped image length:", croppedDataUrl.length);

    // Отправляем результат в фоновый скрипт
    chrome.runtime.sendMessage({
      action: 'croppedData',
      croppedDataUrl: croppedDataUrl
    });
  }).catch(function(e) {
    console.error("Error while capturing screenshot:", e);
  });
}
