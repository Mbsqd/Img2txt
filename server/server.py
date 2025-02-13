from flask import Flask, request, jsonify
from PIL import Image
import pytesseract
import base64
import io
import os
from datetime import datetime
from test_image import image_base

app = Flask(__name__)

# Создаём папку для сохранённых изображений, если её нет
SAVE_DIR = "saved_images"
os.makedirs(SAVE_DIR, exist_ok=True)

print("Start server")

@app.route("/ocr", methods=["POST"])
def ocr():
    data = request.get_json()

    image_data = data['image']

    # Проверяем и извлекаем данные изображения
    if image_data.startswith("data:image"):
        image_data = image_data.split(",", 1)[1]

    print("Data: ", data)
    print("Image: ", image_data)

    # Декодируем изображение
    image = Image.open(io.BytesIO(base64.b64decode(image_data)))

    # Генерируем имя файла по текущему времени
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    # Определяем формат изображения
    image_format = image.format.lower()
    filename = f"{SAVE_DIR}/screenshot_{timestamp}.{image_format}"

    # Сохраняем изображение
    image.save(filename)
    print(f"[INFO] Изображение сохранено: {filename}")

    # Распознаём текст
    text = pytesseract.image_to_string(image, lang="eng")

    # Выводим распознанный текст в консоль
    print(f"[OCR RESULT]\n{text}\n{'='*40}")

    return jsonify({"text": text})  # Отправляем текст обратно в расширение

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
