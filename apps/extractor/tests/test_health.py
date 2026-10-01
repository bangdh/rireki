from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


def test_health():
    assert client.get("/health").json() == {"ok": True}


def test_extract_not_implemented():
    body = {"bucket": "rireki-originals", "key": "k", "langs": "jpn+eng", "photo_bucket": "rireki-originals", "photo_key": "p"}
    assert client.post("/extract", json=body).status_code == 501
