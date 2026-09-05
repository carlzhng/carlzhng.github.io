#!/usr/bin/env python3
"""One-time helper to get a Spotify refresh token for GitHub Actions."""

from __future__ import annotations

import base64
import http.server
import json
import os
import secrets
import sys
import urllib.parse
import urllib.request
import webbrowser

REDIRECT_URI = "http://127.0.0.1:8888/callback"
SCOPES = "user-read-currently-playing user-read-recently-played"


def prompt(label: str, fallback: str = "") -> str:
    suffix = f" [{fallback}]" if fallback else ""
    value = input(f"{label}{suffix}: ").strip()
    return value or fallback


def main() -> int:
    print("Create an app at https://developer.spotify.com/dashboard")
    print(f"Add this Redirect URI exactly: {REDIRECT_URI}\n")

    client_id = prompt("Client ID", os.environ.get("SPOTIFY_CLIENT_ID", ""))
    client_secret = prompt("Client Secret", os.environ.get("SPOTIFY_CLIENT_SECRET", ""))
    if not client_id or not client_secret:
        print("Client ID and Client Secret are required.")
        return 1

    state = secrets.token_urlsafe(16)
    auth_url = "https://accounts.spotify.com/authorize?" + urllib.parse.urlencode({
        "client_id": client_id,
        "response_type": "code",
        "redirect_uri": REDIRECT_URI,
        "scope": SCOPES,
        "state": state,
        "show_dialog": "true",
    })

    result = {}

    class Handler(http.server.BaseHTTPRequestHandler):
        def do_GET(self):
            parsed = urllib.parse.urlparse(self.path)
            if parsed.path != "/callback":
                self.send_error(404)
                return
            query = urllib.parse.parse_qs(parsed.query)
            if query.get("state", [""])[0] != state:
                self.send_error(400, "State mismatch")
                return
            if "error" in query:
                result["error"] = query["error"][0]
            else:
                result["code"] = query.get("code", [""])[0]
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.end_headers()
            self.wfile.write(b"<html><body><p>You can close this tab and return to the terminal.</p></body></html>")

        def log_message(self, format, *args):
            return

    server = http.server.HTTPServer(("127.0.0.1", 8888), Handler)
    print("Opening Spotify authorization in your browser...")
    webbrowser.open(auth_url)
    print("If it does not open, visit:")
    print(auth_url)
    while "code" not in result and "error" not in result:
        server.handle_request()
    server.server_close()

    if result.get("error"):
        print(f"Authorization failed: {result['error']}")
        return 1
    code = result.get("code")
    if not code:
        print("No authorization code returned.")
        return 1

    basic = base64.b64encode(f"{client_id}:{client_secret}".encode("utf-8")).decode("ascii")
    req = urllib.request.Request(
        "https://accounts.spotify.com/api/token",
        data=urllib.parse.urlencode({
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": REDIRECT_URI,
        }).encode("utf-8"),
        headers={
            "Authorization": f"Basic {basic}",
            "Content-Type": "application/x-www-form-urlencoded",
        },
        method="POST",
    )
    with urllib.request.urlopen(req) as resp:
        token = json.loads(resp.read().decode("utf-8"))

    refresh = token.get("refresh_token")
    if not refresh:
        print("No refresh token returned. Try again and make sure you approve the prompts.")
        print(json.dumps(token, indent=2))
        return 1

    print("\nAdd these GitHub repository secrets:")
    print(f"  SPOTIFY_CLIENT_ID={client_id}")
    print(f"  SPOTIFY_CLIENT_SECRET={client_secret}")
    print(f"  SPOTIFY_REFRESH_TOKEN={refresh}")
    print("\nRepo settings: Settings → Secrets and variables → Actions")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except KeyboardInterrupt:
        print("\nCancelled.")
        raise SystemExit(1)
