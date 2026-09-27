"""Servidor local del prototipo sin cache: cada recarga trae la ultima version de los archivos.

Uso:  python serve.py            (http://localhost:3000)
      python serve.py 8080
"""
import http.server
import socketserver
import sys
from pathlib import Path

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 3000
ROOT = Path(__file__).resolve().parent


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map, ".js": "text/javascript", ".webp": "image/webp"}

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store, must-revalidate")
        super().end_headers()


class Server(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True
    allow_reuse_address = True


if __name__ == "__main__":
    with Server(("0.0.0.0", PORT), NoCacheHandler) as httpd:
        print(f"Ascension Vital en http://localhost:{PORT}  (Ctrl+C para detener)")
        httpd.serve_forever()
