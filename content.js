// // Вставляем скрипт html2canvas локально
// const script = document.createElement('script');
// script.src = chrome.runtime.getURL('html2canvas.js');
// script.onload = function() {
//     console.log('html2canvas загружен и готов к использованию');

//     // Теперь можно использовать html2canvas
//     html2canvas(document.body).then(function(canvas) {
//         // Пример использования html2canvas
//         console.log('Canvas создан');
//         document.body.appendChild(canvas);
//     }).catch(function(error) {
//         console.error('Ошибка при использовании html2canvas:', error);
//     });
// };

// document.head.appendChild(script);

console.log("Content script loaded");

chrome.runtime.onMessage.addListener(function(message) {
  if (message.action === "startSelection") {
    console.log("Starting selection mode...");
    startSelection();
  } else if (message.action === "cropImage") {
    console.log("Received screenshot for cropping", message.rect);
    cropImageInDOM(message.dataUrl, message.rect);
  }
});

function startSelection() {
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
    selectionBox.style.left = startX + 'px';
    selectionBox.style.top = startY + 'px';
    selectionBox.style.width = '0px';
    selectionBox.style.height = '0px';
  }

  function onMouseMove(e) {
    if (startX === undefined || startY === undefined) return;
    endX = e.clientX;
    endY = e.clientY;
    selectionBox.style.left = Math.min(startX, endX) + 'px';
    selectionBox.style.top = Math.min(startY, endY) + 'px';
    selectionBox.style.width = Math.abs(endX - startX) + 'px';
    selectionBox.style.height = Math.abs(endY - startY) + 'px';
  }

  function onMouseUp() {
    const rect = selectionBox.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      console.error("Selection area is empty, retrying...");
      return;
    }

    overlay.remove();
    
    chrome.runtime.sendMessage({
      action: 'captureScreen',
      rect: rect,
      scale: window.devicePixelRatio
    });
  }
}

function cropImageInDOM(dataUrl, rect) {
  const scale = window.devicePixelRatio || 1;
  console.log("Cropping with scale =", scale);

  const img = new Image();
  img.onload = function () {
    console.log("Screenshot loaded, original size:", img.width, "x", img.height);

    const scaledRect = {
      left: rect.left * scale,
      top: rect.top * scale,
      width: rect.width * scale,
      height: rect.height * scale
    };
    console.log("Scaled rect:", scaledRect);

    const canvas = document.createElement("canvas");
    canvas.width = scaledRect.width;
    canvas.height = scaledRect.height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(
      img,
      scaledRect.left, scaledRect.top, scaledRect.width, scaledRect.height,
      0, 0, scaledRect.width, scaledRect.height
    );

    const croppedDataUrl = canvas.toDataURL("image/png");
    console.log("Cropped image length:", croppedDataUrl.length);

    // Отправляем изображение в фон
    chrome.runtime.sendMessage({
      action: "croppedData",
      croppedDataUrl: croppedDataUrl
    });
  };

  img.onerror = function (e) {
    console.error("Failed to load screenshot image:", e);
  };
  img.src = dataUrl;
}

// /**
//  * Обрізає скриншот із урахуванням devicePixelRatio, щоб уникнути порожньої ділянки.
//  * @param {DOMRect} rect – координати області (у CSS‑пікселях)
//  */
// function cropImageInDOM(rect) {
//   // Масштаб для HiDPI
//   const scale = window.devicePixelRatio || 1;
//   console.log("Cropping with scale =", scale);

//   // Используем html2canvas для захвата всего контента страницы
//   html2canvas(document.body, {
//     scale: scale,
//     x: rect.left,
//     y: rect.top,
//     width: rect.width,
//     height: rect.height
//   }).then(function(canvas) {
//     // Получаем base64-строку из canvas
//     const croppedDataUrl = canvas.toDataURL('image/png');
//     console.log("Cropped image length:", croppedDataUrl.length);

//     // Отправляем результат в фоновый скрипт
//     chrome.runtime.sendMessage({
//       action: 'croppedData',
//       croppedDataUrl: croppedDataUrl
//     });
//   }).catch(function(e) {
//     console.error("Error while capturing screenshot:", e);
//   });
//}
