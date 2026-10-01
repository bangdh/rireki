# CV extractor (apps/extractor): FastAPI service that turns DOCX / PDF / photos into Markdown (tables kept), per-page
# OCR confidence and the cropped ID photo — locally, before any LLM call. Build context: apps/extractor.
# Stack (permissive licenses): Docling (MIT) · Tesseract 5 (Apache-2.0) · OpenCV + YuNet (Apache-2.0) · pdfplumber (MIT).
FROM python:3.12-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
      tesseract-ocr tesseract-ocr-jpn tesseract-ocr-eng tesseract-ocr-vie \
      tesseract-ocr-mya tesseract-ocr-ben tesseract-ocr-ind \
      libgl1 libglib2.0-0 ca-certificates curl tini \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
# Basic engine (pdfplumber, python-docx, pytesseract, OpenCV, pypdfium2) + the optional Docling engine on CPU torch.
COPY requirements.txt requirements-docling.txt ./
RUN pip install --no-cache-dir --extra-index-url https://download.pytorch.org/whl/cpu \
      -r requirements.txt -r requirements-docling.txt

# Models are fetched at build time so the container runs offline: Docling layout + TableFormer, YuNet face detector.
# convert.py uses Docling only when DOCLING_ARTIFACTS_PATH exists; photo.py uses YuNet only when YUNET_MODEL exists
# (otherwise OpenCV's bundled Haar cascade).
ENV DOCLING_ARTIFACTS_PATH=/app/models/docling \
    YUNET_MODEL=/app/models/face_detection_yunet_2023mar.onnx
RUN docling-tools models download -o "$DOCLING_ARTIFACTS_PATH" layout tableformer \
    && curl -fsSL -o "$YUNET_MODEL" \
       https://github.com/opencv/opencv_zoo/raw/main/models/face_detection_yunet/face_detection_yunet_2023mar.onnx

COPY . .
RUN useradd -r -d /app app && chown -R app:app /app
USER app
ENV OMP_NUM_THREADS=2 \
    TESSDATA_PREFIX=/usr/share/tesseract-ocr/5/tessdata \
    EXTRACTOR_WORKERS=2 \
    OCR_LANGS=jpn+eng
EXPOSE 8000
HEALTHCHECK --interval=20s --timeout=5s --retries=5 \
  CMD python -c "import urllib.request;urllib.request.urlopen('http://localhost:8000/health')"
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port 8000 --workers ${EXTRACTOR_WORKERS:-2}"]
