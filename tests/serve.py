from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
import os
os.chdir(Path(__file__).resolve().parents[1])
class Handler(SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path.startswith('/web/reader/'):
            self.path = '/tests/preview.html'
        super().do_GET()
ThreadingHTTPServer(('127.0.0.1', 8769), Handler).serve_forever()
