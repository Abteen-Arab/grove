#!/bin/bash
cd -- "$(dirname -- "$0")" || exit 1
if [ -x /usr/local/bin/python3 ]; then
  exec /usr/local/bin/python3 start.py --open
fi
exec python3 start.py --open
