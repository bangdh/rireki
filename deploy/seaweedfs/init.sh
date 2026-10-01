#!/bin/sh
# Creates the five buckets and the retention rules on the SeaweedFS S3 gateway. Idempotent.
# Runs in the amazon/aws-cli image (service s3-init); credentials come from the environment.
set -eu
s3api() { command aws --endpoint-url "$S3_ENDPOINT" s3api "$@"; }

for b in rireki-originals rireki-media rireki-renders rireki-uploads rireki-public; do
  s3api head-bucket --bucket "$b" 2>/dev/null || s3api create-bucket --bucket "$b" >/dev/null
done

# Best effort: keep going if the gateway rejects a rule.
s3api put-bucket-versioning --bucket rireki-originals --versioning-configuration Status=Enabled 2>/dev/null \
  || echo "versioning not enabled on rireki-originals"
s3api put-bucket-lifecycle-configuration --bucket rireki-uploads --lifecycle-configuration \
  '{"Rules":[{"ID":"expire","Status":"Enabled","Filter":{"Prefix":""},"Expiration":{"Days":1}}]}' 2>/dev/null \
  || echo "lifecycle not applied on rireki-uploads"
s3api put-bucket-lifecycle-configuration --bucket rireki-renders --lifecycle-configuration \
  '{"Rules":[{"ID":"expire","Status":"Enabled","Filter":{"Prefix":""},"Expiration":{"Days":90}}]}' 2>/dev/null \
  || echo "lifecycle not applied on rireki-renders"

echo "S3 ready: $(s3api list-buckets --query 'Buckets[].Name' --output text)"
