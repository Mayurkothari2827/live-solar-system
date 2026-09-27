#!/bin/bash
set -e
cd "$(dirname "$0")"
if python3 -c 'import spiceypy, requests, numpy' >/dev/null 2>&1; then
  exec python3 server.py
elif [ -d ../../work/python-libs ]; then
  exec python3 server.py
else
  python3 -m venv .venv
  .venv/bin/python -m pip install -r requirements.txt
  exec .venv/bin/python server.py
fi
