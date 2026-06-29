#!/usr/bin/env bash
set -euo pipefail

OLLAMA_URL="${OLLAMA_URL:-http://localhost:11434}"

MODELS=(
  "qwen2.5:7b-instruct"
  "llama3.1:8b"
  "gemma2:9b"
)

for model in "${MODELS[@]}"; do
  echo "==> Pulling $model ..."
  curl -s -X POST "$OLLAMA_URL/api/pull" \
    -H "Content-Type: application/json" \
    -d "{\"name\": \"$model\"}" | cat
  echo ""
done

echo "==> All models pulled successfully!"
