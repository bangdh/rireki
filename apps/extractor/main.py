from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI(title="Rireki extractor")


class ExtractRequest(BaseModel):
    """Request contract from .claude/skills/cv-extraction/SKILL.md."""

    bucket: str
    key: str
    langs: str
    photo_bucket: str
    photo_key: str


@app.get("/health")
def health() -> dict:
    return {"ok": True}


@app.post("/extract")
def extract(req: ExtractRequest) -> dict:
    # Docling + Tesseract + OpenCV/YuNet pipeline: extractor lane.
    raise HTTPException(status_code=501, detail="not implemented")
