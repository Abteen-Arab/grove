#!/usr/bin/env python3
"""Serve Grove locally with no third-party dependencies."""
import argparse
import functools
import http.server
import webbrowser
from pathlib import Path

parser = argparse.ArgumentParser(description="Start the Grove local prototype")
parser.add_argument("--port", type=int, default=5173)
parser.add_argument("--open", action="store_true", help="Open the app in your default browser")
args = parser.parse_args()
root = Path(__file__).resolve().parent
handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(root))
try:
    with http.server.ThreadingHTTPServer(("127.0.0.1", args.port), handler) as server:
        print(f"Grove is ready at http://localhost:{args.port}", flush=True)
        print("Press Ctrl+C to stop.", flush=True)
        if args.open:
            webbrowser.open(f"http://localhost:{args.port}")
        server.serve_forever()
except KeyboardInterrupt:
    print("\nGrove stopped.")
except OSError as error:
    raise SystemExit(f"Could not start Grove: {error}. Try --port 5174.")
