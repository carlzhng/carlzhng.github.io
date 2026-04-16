import { initPCB, initScrollShrink, initReveal, revealDynamic } from "./pcb.js";

const $ = (sel) => document.querySelector(sel);

function iconSvg(kind) {
  if (kind === "github") {
    return `
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
        <path fill="currentColor" d="M12 .5a11.5 11.5 0 0 0-3.64 22.4c.58.1.8-.25.8-.56v-2.1c-3.25.7-3.94-1.37-3.94-1.37-.53-1.34-1.3-1.7-1.3-1.7-1.06-.72.08-.7.08-.7 1.17.08 1.79 1.2 1.79 1.2 1.05 1.78 2.75 1.27 3.42.97.1-.76.41-1.27.74-1.56-2.6-.29-5.34-1.3-5.34-5.8 0-1.28.46-2.33 1.2-3.15-.12-.3-.52-1.52.12-3.17 0 0 .98-.31 3.2 1.2a11.08 11.08 0 0 1 5.83 0c2.22-1.51 3.2-1.2 3.2-1.2.64 1.65.24 2.87.12 3.17.75.82 1.2 1.87 1.2 3.15 0 4.51-2.75 5.5-5.37 5.79.42.36.8 1.08.8 2.18v3.24c0 .31.2.67.8.56A11.5 11.5 0 0 0 12 .5Z"/>
      </svg>
    `.trim();
  }
  if (kind === "linkedin") {
    return `
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
        <path fill="currentColor" d="M20.45 20.45h-3.56v-5.57c0-1.33-.03-3.05-1.86-3.05-1.87 0-2.15 1.46-2.15 2.96v5.66H9.32V9h3.42v1.56h.05c.48-.9 1.65-1.86 3.4-1.86 3.63 0 4.29 2.39 4.29 5.49v6.26ZM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12ZM7.12 20.45H3.56V9h3.56v11.45Z"/>
      </svg>
    `.trim();
  }
  return null;
}

function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem("theme", theme);
  const icon = $("#themeIcon");
  if (icon) icon.textContent = theme === "light" ? "◑" : "◐";
}

function initTheme() {
  const saved = localStorage.getItem("theme");
  if (saved === "light" || saved === "dark") {
    setTheme(saved);
    return;
  }
  setTheme("light");
}

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null) continue;
    if (k === "class") node.className = v;
    else if (k === "text") node.textContent = v;
    else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, String(v));
  }
  for (const child of children) node.append(child);
  return node;
}

function initials(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "Y";
  const last = (parts.length > 1 ? parts[parts.length - 1]?.[0] : parts[0]?.[1]) ?? "N";
  return (first + last).toUpperCase();
}

function safeUrl(url) {
  try {
    const u = new URL(url, window.location.href);
    return u.href;
  } catch {
    return null;
  }
}

function safeMediaUrl(url) {
  const href = safeUrl(url);
  if (!href) return null;
  // Allow relative, same-origin, or explicit https. (Avoid javascript: etc.)
  if (href.startsWith("http://") || href.startsWith("https://") || href.startsWith(window.location.origin) || href.startsWith(window.location.href.replace(/[#?].*$/, ""))) {
    return href;
  }
  return href;
}

function guessVideoType(src) {
  const s = String(src || "").toLowerCase();
  if (s.endsWith(".webm")) return "video/webm";
  if (s.endsWith(".mp4")) return "video/mp4";
  return "";
}

function renderProjectVideo(p) {
  const v = p?.video;
  if (!v || !v.src) return null;
  const src = safeMediaUrl(v.src);
  if (!src) return null;

  const video = document.createElement("video");
  video.className = "project-video";
  video.muted = true;
  video.loop = true;
  video.playsInline = true;
  video.preload = "metadata";
  video.autoplay = true;
  video.setAttribute("aria-label", `${p?.name || "project"} preview`);
  if (v.poster) video.poster = v.poster;

  const source = document.createElement("source");
  source.src = src;
  const type = v.type || guessVideoType(src);
  if (type) source.type = type;
  video.append(source);
  return video;
}

function renderLinks(container, links, variant = "pill") {
  if (!container) return;
  container.innerHTML = "";
  for (const link of links || []) {
    const label = String(link.label || "");
    const urlRaw = String(link.url || "");
    if (label.toLowerCase() === "email") continue;
    if (urlRaw.includes("@") && !urlRaw.startsWith("http")) continue;
    if (urlRaw.toLowerCase().startsWith("mailto:")) continue;
    const href = safeUrl(link.url);
    if (!href) continue;

    const key = label.trim().toLowerCase();
    const icon = iconSvg(key);
    const isIcon = Boolean(icon);

    const a = el("a", {
      class: isIcon ? "pill pill-icon press-btn" : (variant === "pill" ? "pill press-btn" : "link"),
      href,
      target: href.startsWith("http") ? "_blank" : undefined,
      rel: href.startsWith("http") ? "noreferrer" : undefined,
      "aria-label": link.label || "Link",
      title: link.label || "Link"
    }, icon ? [] : [document.createTextNode(link.label || "Link")]);

    if (icon) a.innerHTML = icon;
    container.append(a);
  }
}

function renderQuickFacts(container, facts) {
  if (!container) return;
  container.innerHTML = "";
  for (const f of facts || []) {
    const wrap = el("div", { class: "fact" });
    const dt = el("dt", { text: f.label || "" });
    const dd = el("dd", { text: f.value || "" });
    wrap.append(dt, dd);
    container.append(wrap);
  }
}

function renderProjects(container, projects) {
  if (!container) return;
  container.innerHTML = "";
  for (const p of projects || []) {
    const preview = renderProjectVideo(p);
    const tags = el("div", { class: "meta" }, (p.tags || []).map((t) => el("span", { class: "tag", text: t })));
    const links = el("div", { class: "links" });
    for (const l of p.links || []) {
      const href = safeUrl(l.url);
      if (!href) continue;
      links.append(
        el("a", {
          class: "link",
          href,
          target: href.startsWith("http") ? "_blank" : undefined,
          rel: href.startsWith("http") ? "noreferrer" : undefined,
          text: l.label || "Link"
        })
      );
    }

    const highlights = Array.isArray(p.highlights) && p.highlights.length
      ? el("ul", {}, p.highlights.map((h) => el("li", { text: h })))
      : null;

    const cardChildren = [
      ...(preview ? [preview] : []),
      el("div", {}, [el("h3", { text: p.name || "Untitled" }), el("p", { text: p.description || "" })]),
      tags,
      ...(highlights ? [highlights] : []),
      links
    ];

    const card = el("article", { class: "card project reveal-card", tabindex: "0" }, cardChildren);
    card.addEventListener("click", () => openProjectModal(p));
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openProjectModal(p);
      }
    });
    container.append(card);
  }
}

function renderItems(container, items) {
  if (!container) return;
  container.innerHTML = "";
  for (const it of items || []) {
    const title = el("h3", { text: it.title || it.name || "" });
    const sub = it.subtitle ? el("p", { class: "sub", text: it.subtitle }) : null;
    const dates = it.dates ? el("p", { class: "meta-line", text: it.dates }) : null;
    const details = it.details ? el("p", { class: "meta-line", text: it.details }) : null;
    container.append(el("div", { class: "item reveal-card" }, [title, ...(sub ? [sub] : []), ...(dates ? [dates] : []), ...(details ? [details] : [])]));
  }
}

function initTabs() {
  const awardsBtn = $("#tabAwardsBtn");
  const expBtn = $("#tabExpBtn");
  const awardsPanel = $("#tabAwards");
  const expPanel = $("#tabExp");
  if (!awardsBtn || !expBtn || !awardsPanel || !expPanel) return;

  const set = (which) => {
    const awardsActive = which === "awards";
    awardsBtn.classList.toggle("is-active", awardsActive);
    expBtn.classList.toggle("is-active", !awardsActive);
    awardsPanel.classList.toggle("is-active", awardsActive);
    expPanel.classList.toggle("is-active", !awardsActive);
    awardsBtn.setAttribute("aria-selected", String(awardsActive));
    expBtn.setAttribute("aria-selected", String(!awardsActive));
  };

  awardsBtn.addEventListener("click", () => set("awards"));
  expBtn.addEventListener("click", () => set("exp"));
  set("exp");
}

function openProjectModal(project) {
  const modal = $("#projectModal");
  if (!modal) return;
  $("#modalTitle").textContent = project?.name || "project";
  $("#modalDesc").textContent = project?.description || "";

  const existing = $("#modalVideo");
  if (existing) existing.remove();
  const modalInner = modal.querySelector(".stack");
  const mv = renderProjectVideo(project);
  if (mv) {
    mv.id = "modalVideo";
    mv.className = "modal-video";
    modalInner?.insertBefore(mv, modalInner.firstChild);
  }

  const tags = $("#modalTags");
  if (tags) {
    tags.innerHTML = "";
    for (const t of project?.tags || []) tags.append(el("span", { class: "chip", text: t }));
  }

  const highlights = $("#modalHighlights");
  if (highlights) {
    highlights.innerHTML = "";
    const hs = project?.highlights || [];
    if (Array.isArray(hs) && hs.length) highlights.append(el("ul", {}, hs.map((h) => el("li", { text: h }))));
  }

  const links = $("#modalLinks");
  if (links) {
    links.innerHTML = "";
    for (const l of project?.links || []) {
      const href = safeUrl(l.url);
      if (!href) continue;
      links.append(
        el("a", {
          class: "pill",
          href,
          target: href.startsWith("http") ? "_blank" : undefined,
          rel: href.startsWith("http") ? "noreferrer" : undefined,
          text: l.label || "link"
        })
      );
    }
  }

  modal.showModal();
}

function initModal() {
  const modal = $("#projectModal");
  const close = $("#modalClose");
  if (!modal || !close) return;
  close.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    modal.close();
  });
  modal.addEventListener("cancel", (e) => {
    e.preventDefault();
    modal.close();
  });
  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.close();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal.open) modal.close();
  });
}

function initContact(person) {
  const locationText = $("#locationText");
  const contactLinks = $("#contactLinks");

  if (locationText) locationText.textContent = person.location || "";
  renderLinks(contactLinks, person.links, "link");
}

async function main() {
  initTheme();
  initTabs();
  initModal();
  initPCB();
  initScrollShrink();

  $("#themeToggle")?.addEventListener("click", () => {
    const current = document.documentElement.dataset.theme === "light" ? "light" : "dark";
    setTheme(current === "light" ? "dark" : "light");
  });

  const year = $("#year");
  if (year) year.textContent = String(new Date().getFullYear());

  const res = await fetch("./data.json", { cache: "no-store" });
  const data = await res.json();

  const person = data.person || {};
  $("#brandName").textContent = person.name || "Your Name";
  $("#footerName").textContent = person.name || "Your Name";
  $("#heroKicker").textContent = person.hero?.kicker || "portfolio";
  $("#heroName").textContent = person.hero?.nameLower || (person.name || "Your Name");
  $("#aboutMeText").textContent = person.hero?.aboutMe || "";

  $("#eduProgram").textContent = person.education?.program || "—";
  $("#eduSchool").textContent = person.education?.school || "—";
  const metaParts = [person.education?.location, person.education?.dates, person.education?.gpa ? `GPA: ${person.education.gpa}` : null].filter(Boolean);
  $("#eduMeta").textContent = metaParts.length ? metaParts.join(" • ") : "—";

  const resumeButton = $("#resumeButton");
  if (resumeButton && person.resumeUrl) resumeButton.setAttribute("href", person.resumeUrl);

  renderLinks($("#heroLinks"), person.links, "pill");
  renderProjects($("#projectsGrid"), data.projects);
  $("#aboutSubtitle").textContent = data.about?.subtitle || "";
  renderItems($("#awardsList"), data.about?.awards);
  renderItems($("#expList"), data.about?.experiences);
  initContact(person);
  initReveal();
  setTimeout(revealDynamic, 80);
}

main().catch((err) => {
  console.error(err);
  const grid = $("#projectsGrid");
  if (grid) {
    grid.innerHTML = "";
    grid.append(
      el("div", { class: "card" }, [
        el("h3", { text: "Couldn’t load content" }),
        el("p", { class: "muted", text: "Please check that data.json is valid JSON." })
      ])
    );
  }
});

