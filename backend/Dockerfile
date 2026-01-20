# Use a lightweight Python Linux image
FROM python:3.9-slim

# 1. Install System Dependencies (Tesseract OCR)
RUN apt-get update && apt-get install -y \
    tesseract-ocr \
    libtesseract-dev \
    && rm -rf /var/lib/apt/lists/*

# 2. Set up the App
WORKDIR /app
COPY . .

# 3. Install Python Libraries
RUN pip install --no-cache-dir -r requirements.txt

# 4. Run the App using Gunicorn (Production Server)
CMD ["gunicorn", "-w", "1", "-b", "0.0.0.0:5000", "app:app"]