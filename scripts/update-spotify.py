#!/usr/bin/env python3
"""Fetch recently played Spotify tracks and write spotify.json."""

from __future__ import annotations

import base64
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT_PATH = ROOT / "spotify.json"
RECENT_LIMIT = 10


def env(name: str) -> str:
    return (os.environ.get(name) or "").strip()


def http_json(url: str, *, method: str = "GET", data: bytes | None = None, headers: dict | None = None, allow_empty: bool = False):
    req = urllib.request.Request(url, data=data, headers=headers or {}, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            body = resp.read()
            if allow_empty and (resp.status == 204 or not body):
                return None
            return json.loads(body.decode("utf-8") or "{}")
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        if allow_empty and exc.code == 204:
            return None
        raise SystemExit(f"HTTP {exc.code} for {url}: {body}") from exc


def track_payload(track: dict | None, extra: dict | None = None) -> dict | None:
    if not track:
        return None
    artists = ", ".join(a.get("name") or "" for a in (track.get("artists") or []) if a.get("name"))
    images = (track.get("album") or {}).get("images") or []
    image = ""
    if images:
        image = images[-1].get("url") or images[0].get("url") or ""
        if len(images) > 1:
            image = images[1].get("url") or image
    url = (track.get("external_urls") or {}).get("spotify") or ""
    payload = {
        "id": track.get("id") or "",
        "name": track.get("name") or "Unknown track",
        "artists": artists or "Unknown artist",
        "album": (track.get("album") or {}).get("name") or "",
        "albumImage": image,
        "url": url,
    }
    if extra:
        payload.update(extra)
    return payload


def main() -> int:
    client_id = env("SPOTIFY_CLIENT_ID")
    client_secret = env("SPOTIFY_CLIENT_SECRET")
    refresh_token = env("SPOTIFY_REFRESH_TOKEN")
    if not (client_id and client_secret and refresh_token):
        print("Spotify secrets are not configured; skipping update.")
        return 0

    basic = base64.b64encode(f"{client_id}:{client_secret}".encode("utf-8")).decode("ascii")
    token = http_json(
        "https://accounts.spotify.com/api/token",
        method="POST",
        data=urllib.parse.urlencode({
            "grant_type": "refresh_token",
            "refresh_token": refresh_token,
        }).encode("utf-8"),
        headers={
            "Authorization": f"Basic {basic}",
            "Content-Type": "application/x-www-form-urlencoded",
        },
    )
    access_token = token.get("access_token")
    if not access_token:
        raise SystemExit(f"Spotify token refresh failed: {token}")
    if token.get("refresh_token") and token["refresh_token"] != refresh_token:
        print("::warning::Spotify returned a new refresh token. Update SPOTIFY_REFRESH_TOKEN if this workflow starts failing.")

    auth = {"Authorization": f"Bearer {access_token}"}
    now_playing_raw = http_json(
        "https://api.spotify.com/v1/me/player/currently-playing?additional_types=track",
        headers=auth,
        allow_empty=True,
    )
    recent_raw = http_json(
        f"https://api.spotify.com/v1/me/player/recently-played?limit={RECENT_LIMIT}",
        headers=auth,
    ) or {}

    now_playing = None
    if now_playing_raw and now_playing_raw.get("currently_playing_type") != "episode":
        item = now_playing_raw.get("item")
        if now_playing_raw.get("is_playing") and item:
            now_playing = track_payload(item, {"isPlaying": True})

    recent = []
    seen = {now_playing["id"]} if now_playing and now_playing.get("id") else set()
    for entry in recent_raw.get("items") or []:
        payload = track_payload(entry.get("track"), {"playedAt": entry.get("played_at") or ""})
        if not payload:
            continue
        track_id = payload.get("id")
        if track_id and track_id in seen:
            continue
        if track_id:
            seen.add(track_id)
        recent.append(payload)
        if len(recent) >= RECENT_LIMIT:
            break

    OUT_PATH.write_text(
        json.dumps({
            "updatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "nowPlaying": now_playing,
            "recent": recent,
        }, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"Wrote {OUT_PATH.name} with {len(recent)} recent track(s).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
