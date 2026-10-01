# CV extractor (apps/extractor): FastAPI service that turns DOCX / PDF / photos into Markdown
# (tables kept), per-page OCR confidence and the cropped ID photo — all locally, before any LLM call.
# Stack: Docling (MIT) · Tesseract 5 (Apache-2.0) · OpenCV + YuNet face detector (Apache-2.0) · poppler CLI.
FROM python:3.12-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
      tesseract-ocr tesseract-ocr-jpn tesseract-ocr-eng tesseract-ocr-vie \
      tesseract-ocr-mya tesseract-ocr-ben tesseract-ocr-ind \
      poppler-utils libgl1 libglib2.0-0 libheif1 ca-certificates tini \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
# requirements.txt (apps/extractor): fastapi, uvicorn, docling, pdfplumber, pypdf,
# opencv-python-headless, pillow, pillow-heif, boto3, python-multipart
COPY requirements.txt ./
RUN pip install --no-cache-dir --extra-index-url https://download.pytorch.org/whl/cpu -r requirements.txt

# Download Docling layout/table models and the YuNet face model at build time so the container starts offline.
RUN python -c "from docling.utils.model_downloader import download_models; download_models()" \
    && mkdir -p /app/models && python - <<'PY'
import urllib.request
urllib.request.urlretrieve(
    "https://github.com/opencv/opencv_zoo/raw/main/models/face_detection_yunet/face_detection_yunet_2023mar.onnx",
    "/app/models/face_detection_yunet_2023mar.onnx")
PY

COPY . .
RUN useradd -r -d /app app && chown -R app:app /app
USER app
ENV OMP_NUM_THREADS=2 TESSDATA_PREFIX=/usr/share/tesseract-ocr/5/tessdata
EXPOSE 8000
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
