#!/bin/sh
set -e

for var in DATABASE_URL DIRECT_URL JWT_SECRET; do
  current=$(eval echo \"\$$var\")
  stripped=$(echo "$current" | sed 's/^"//; s/"$//')
  if [ "$current" != "$stripped" ]; then
    export "$var=$stripped"
  fi
done

exec npm run start
