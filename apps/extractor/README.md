# Rireki extractor (Python 3.12, FastAPI)

Setup: `pnpm --filter @rireki/extractor run setup` (uses `uv`; `run` is needed because `pnpm setup` is a pnpm built-in),
then `pnpm --filter @rireki/extractor dev` / `test`.
Without `uv`: `python3 -m venv .venv && .venv/bin/pip install -r requirements-dev.txt`.
