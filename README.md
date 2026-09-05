# carlzhng.github.io
Take a peak at my portfolio!

## Editing your portfolio content

Update `data.json`:
- **person**: name, role, email, links, quick facts, resume URL
- **projects**: add as many as you want 
- **about**: edit **awards** and **experiences**
- **courses**: add groups and course rows under `person.education.courses`

Course template:

```json
"courses": [
  {
    "group": "Year 1",
    "items": [
      { "code": "ECE 210", "name": "Introduction to Digital Logic Design" }
    ]
  }
]
```

Copy a group or `{ "code", "name" }` row for each course. Empty groups are hidden.

### Project video previews

Each project can optionally include:

```json
"video": {
  "src": "./assets/videos/my-project.mp4",
  "poster": "./assets/videos/my-project.jpg",
  "type": "video/mp4"
}
```

Create the folder `assets/videos/` and drop files there (MP4 or WebM recommended).

Add your resume PDF at `assets/resume.pdf`, then set `"resumeUrl": "./assets/resume.pdf"` in `data.json`.

## Spotify listening tab

GitHub Pages cannot read your Spotify history directly, so a GitHub Action refreshes `spotify.json` every 2 hours. The About **listening** tab reads that file.

1. Create an app at [Spotify Developer Dashboard](https://developer.spotify.com/dashboard).
2. Add this Redirect URI exactly: `http://127.0.0.1:8888/callback`
3. Run:

```powershell
python scripts/spotify-auth.py
```

4. Add these repository secrets (`Settings → Secrets and variables → Actions`):
   - `SPOTIFY_CLIENT_ID`
   - `SPOTIFY_CLIENT_SECRET`
   - `SPOTIFY_REFRESH_TOKEN`
5. Run **Actions → Update Spotify listening → Run workflow**.

If the action later fails with `invalid_grant`, run the auth script again and update `SPOTIFY_REFRESH_TOKEN`.

## Run locally

Run portfolio locally using the command:

```powershell
python -m http.server 5173
```

Then open `http://localhost:5173`.

## Deploy (GitHub Pages)

In your GitHub repo settings:
- **Pages → Build and deployment**: Deploy from a branch
- **Branch**: `main` (or `master`) / root (`/`)

The site is plain HTML/CSS/JS and will work on GitHub Pages with no build step.


Each project can optionally include:

```json
"video": {
  "src": "./assets/videos/my-project.mp4",
  "poster": "./assets/videos/my-project.jpg",
  "type": "video/mp4"
}
```

Create the folder `assets/videos/` and drop files there (MP4 or WebM recommended).

Add your resume PDF at `assets/resume.pdf`, then set `"resumeUrl": "./assets/resume.pdf"` in `data.json`.

## Run locally

Run portfolio locally using the command:

```powershell
python -m http.server 5173
```

Then open `http://localhost:5173`.

## Deploy (GitHub Pages)

In your GitHub repo settings:
- **Pages → Build and deployment**: Deploy from a branch
- **Branch**: `main` (or `master`) / root (`/`)

The site is plain HTML/CSS/JS and will work on GitHub Pages with no build step.
