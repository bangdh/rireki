#!/bin/sh
# Creates buckets, lifecycle rules, the application user and its policy. Idempotent.
set -eu
mc alias set local http://minio:9000 "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD"

for b in rireki-originals rireki-media rireki-renders rireki-uploads rireki-public; do
  mc mb --ignore-existing "local/$b"
done

mc version enable local/rireki-originals
mc anonymous set download local/rireki-public
mc ilm rule add local/rireki-uploads --expire-days 1 2>/dev/null || true
mc ilm rule add local/rireki-renders --expire-days 90 2>/dev/null || true

# Application credentials: full access to the five buckets, nothing else.
mc admin user add local "$S3_ACCESS_KEY" "$S3_SECRET_KEY" 2>/dev/null || true
mc admin policy create local rireki-app /app-policy.json 2>/dev/null || true
mc admin policy attach local rireki-app --user "$S3_ACCESS_KEY" 2>/dev/null || true

echo "MinIO ready: buckets, lifecycle and app user configured."
