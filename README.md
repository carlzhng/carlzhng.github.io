# carlzhng.github.io
Take a peak at my portfolio!

## Editing your portfolio content

Update `data.json`:
- **person**: name, role, email, links, quick facts, resume URL
- **projects**: add as many as you want 
- **about**: edit **awards** and **experiences**

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
