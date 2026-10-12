import { initPCB, initScrollShrink, initReveal } from "./pcb.js?v=11";

const $ = (sel) => document.querySelector(sel);
let refreshTabsLayout = () => {};
let activateAboutPanel = () => {};
const aboutDesks = new Map();
let activeAboutId = null;

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
  if (kind === "devpost") {
    return `
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
        <path fill="currentColor" d="M5 4h7.8c3.9 0 6.2 2.2 6.2 6s-2.3 6-6.2 6H9.2v4H5V4Zm7.4 8c1.7 0 2.8-1 2.8-2.4 0-1.5-1.1-2.5-2.8-2.5H9.2V12h3.2Z"/>
      </svg>
    `.trim();
  }
  return null;
}

function linkIconKey(link) {
  const label = String(link?.label || "").trim().toLowerCase();
  const url = String(link?.url || "").trim().toLowerCase();
  if (label.includes("github") || url.includes("github.com")) return "github";
  if (label.includes("devpost") || url.includes("devpost.com")) return "devpost";
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

function renderProjectMedia(p, context = "card") {
  // context: "card" | "folder" = static grid thumb; "modal" = detail (GIF / modalImage when set)
  const m = p?.media || {};
  let raw = null;
  if (context === "modal") {
    raw =
      m.modalImage ||
      m.image ||
      p?.image ||
      p?.thumbnail ||
      p?.video?.poster ||
      null;
  } else {
    raw =
      m.image ||
      p?.image ||
      p?.thumbnail ||
      p?.video?.poster ||
      null;
  }
  if (!raw) return null;
  const src = safeMediaUrl(raw);
  if (!src) return null;

  const img = document.createElement("img");
  if (context === "modal") {
    img.className = "modal-media";
  } else if (context === "folder") {
    img.className = "project-folder-thumb";
  } else {
    img.className = "project-media";
  }
  img.src = src;
  img.alt =
    context === "modal"
      ? `${p?.name || "Project"} — detail preview`
      : `${p?.name || "Project"} preview`;
  img.loading = context === "modal" ? "eager" : "lazy";
  img.decoding = context === "modal" ? "async" : "async";
  img.addEventListener("error", () => {
    img.remove();
  }, { once: true });
  return img;
}

function projectSlides(project) {
  const m = project?.media || {};
  const out = [];
  const gallery = Array.isArray(m.gallery) ? m.gallery : null;
  if (gallery && gallery.length) {
    for (const g of gallery) {
      const s = safeMediaUrl(g);
      if (s) out.push(s);
    }
  }
  if (!out.length) {
    const fallbackList = [
      m.modalImage,
      m.image,
      project?.image,
      project?.thumbnail,
      project?.video?.poster
    ].filter(Boolean);
    for (const f of fallbackList) {
      const s = safeMediaUrl(f);
      if (s) out.push(s);
    }
  }
  // de-dupe (common when modalImage == image)
  return [...new Set(out)];
}

function isGifSrc(src) {
  return /\.gif(?:[?#]|$)/i.test(src);
}

function experienceSlides(item) {
  const gallery = Array.isArray(item?.gallery) ? item.gallery : [];
  const out = [];
  for (const src of gallery) {
    const safe = safeMediaUrl(src);
    if (safe) out.push(safe);
  }
  return [...new Set(out)];
}

function buildInlineGallery(slides, label) {
  if (!slides.length) return null;

  let idx = 0;
  let generation = 0;
  const many = slides.length > 1;
  const counter = el("div", { class: "slideshow-counter" });
  const prevBtn = el("button", {
    class: "slideshow-btn press-btn",
    type: "button",
    "aria-label": "Previous photo",
    text: "‹"
  });
  const nextBtn = el("button", {
    class: "slideshow-btn press-btn",
    type: "button",
    "aria-label": "Next photo",
    text: "›"
  });
  const nav = el("div", { class: "slideshow-nav" }, [prevBtn, nextBtn]);
  const wrap = el("div", { class: "exp-gallery" }, many ? [nav, counter] : []);

  const setIdx = (n) => {
    const token = ++generation;
    idx = (n + slides.length) % slides.length;
    const src = slides[idx];
    const contain = isGifSrc(src);
    const next = document.createElement("img");
    next.className = "exp-gallery-img" + (contain ? " exp-gallery-img--contain" : "");
    next.alt = slides.length > 1
      ? `${label} photo ${idx + 1} of ${slides.length}`
      : `${label} photo`;
    next.decoding = contain ? "sync" : "async";
    next.loading = "eager";

    let committed = false;
    const commit = () => {
      if (committed || token !== generation) return;
      committed = true;
      const previous = wrap.querySelector(".exp-gallery-img");
      if (previous) previous.replaceWith(next);
      else wrap.insertBefore(next, wrap.firstChild);
      requestAnimationFrame(refreshTabsLayout);
    };
    next.addEventListener("load", commit, { once: true });
    next.src = src;
    if (next.complete && next.naturalWidth) commit();

    if (many) counter.textContent = `${idx + 1} / ${slides.length}`;
  };

  prevBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIdx(idx - 1);
  });
  nextBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIdx(idx + 1);
  });

  setIdx(0);
  return wrap;
}

function buildModalSlideshow(project) {
  const slides = projectSlides(project);
  if (!slides.length) return null;

  let idx = 0;
  let generation = 0;
  let current = null;

  const counter = el("div", { class: "slideshow-counter" });

  const prevBtn = el("button", {
    class: "slideshow-btn press-btn",
    type: "button",
    "aria-label": "Previous image",
    text: "‹"
  });
  const nextBtn = el("button", {
    class: "slideshow-btn press-btn",
    type: "button",
    "aria-label": "Next image",
    text: "›"
  });

  const nav = el("div", { class: "slideshow-nav", "aria-hidden": "false" }, [prevBtn, nextBtn]);
  const wrap = el("div", { class: "modal-slideshow", id: "modalSlideshow" }, [nav, counter]);

  // Fetch the next file ahead of the click. GIFs are cached only — decoding
  // one off-screen can leave the visible copy stuck on its first frame.
  const preload = (src) => {
    if (!src) return;
    if (isGifSrc(src)) {
      fetch(src, { cache: "force-cache" }).catch(() => {});
      return;
    }
    const pre = new Image();
    pre.decoding = "async";
    pre.src = src;
  };

  // Chrome paints a GIF's first frame and then pauses it until the image
  // leaves the viewport and comes back. A one-frame detach does the same.
  const primeGif = (node, token) => {
    const run = () => {
      requestAnimationFrame(() => {
        if (token !== generation || current !== node || !node.isConnected) return;
        const parent = node.parentNode;
        const sibling = node.nextSibling;
        parent.removeChild(node);
        requestAnimationFrame(() => {
          if (token !== generation || current !== node || node.isConnected) return;
          parent.insertBefore(node, sibling);
        });
      });
    };
    const shell = document.querySelector("#projectModal .modal-inner");
    const pending = shell?.getAnimations?.().some((anim) => anim.playState === "running");
    if (pending) shell.addEventListener("animationend", run, { once: true });
    else run();
  };

  const setIdx = (n) => {
    const token = ++generation;
    idx = (n + slides.length) % slides.length;
    const src = slides[idx];
    const contain = isGifSrc(src);

    const next = document.createElement("img");
    next.className = "modal-slide-img" + (contain ? " modal-slide-img--contain" : "");
    next.alt = `${project?.name || "Project"} — preview ${idx + 1} of ${slides.length}`;
    next.decoding = contain ? "sync" : "async";
    next.loading = "eager";

    let committed = false;
    const commit = () => {
      if (committed || token !== generation) return;
      committed = true;
      current = next;
      const previous = wrap.querySelector(".modal-slide-img");
      if (previous) previous.replaceWith(next);
      else wrap.insertBefore(next, wrap.firstChild);
      if (contain) primeGif(next, token);
    };

    next.addEventListener("load", commit, { once: true });
    next.src = src;
    if (next.complete && next.naturalWidth) commit();

    counter.textContent = slides.length > 1 ? `${idx + 1} / ${slides.length}` : "";
    prevBtn.disabled = slides.length <= 1;
    nextBtn.disabled = slides.length <= 1;
    preload(slides[(idx + 1) % slides.length]);
    preload(slides[(idx - 1 + slides.length) % slides.length]);
  };

  prevBtn.addEventListener("click", (e) => {
    e.preventDefault();
    setIdx(idx - 1);
  });
  nextBtn.addEventListener("click", (e) => {
    e.preventDefault();
    setIdx(idx + 1);
  });

  setIdx(0);
  return wrap;
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
    const thumb = renderProjectMedia(p, "folder");
    const pocketChildren = thumb
      ? [thumb]
      : [el("div", { class: "project-folder-placeholder", "aria-hidden": "true" })];

    const shape = el("div", { class: "project-folder-shape", "aria-hidden": "true" }, [
      el("div", { class: "project-folder-tab" }),
      el("div", { class: "project-folder-pocket" }, pocketChildren)
    ]);

    const title = p.name || "Untitled";
    const folder = el(
      "article",
      {
        class: "project-folder card reveal-card",
        tabindex: "0",
        role: "button",
        "aria-haspopup": "dialog",
        "aria-label": `Open ${title} details`
      },
      [shape, el("h3", { class: "project-folder-title", text: title })]
    );

    folder.addEventListener("click", () => openProjectModal(p));
    folder.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openProjectModal(p);
      }
    });
    container.append(folder);
  }
}

function mountProjectBlueprint() {
  const grid = $("#projectsGrid");
  if (!grid || grid.closest(".proj-desk")) return;

  const desk = el("div", { class: "proj-desk" });
  grid.before(desk);

  const button = el("button", {
    class: "proj-blueprint",
    type: "button",
    "aria-expanded": "false",
    "aria-controls": "projectsGrid"
  });
  button.innerHTML = `
    <span class="proj-sheet" aria-hidden="true">
      <svg viewBox="0 0 280 160" fill="none" stroke="#d7f4ff" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
        <rect x="16" y="18" width="176" height="108" />
        <rect x="34" y="36" width="72" height="48" />
        <rect x="122" y="42" width="52" height="30" />
        <path d="M106 60h16M148 72v26M58 84v24h36" />
        <circle cx="58" cy="60" r="3.2" fill="#d7f4ff" stroke="none" />
        <circle cx="148" cy="98" r="3.2" fill="#d7f4ff" stroke="none" />
        <circle cx="94" cy="108" r="3.2" fill="#d7f4ff" stroke="none" />
        <path d="M16 142h176M16 136v12M192 136v12" />
        <path d="M204 18v108M198 18h12M198 126h12" />
        <rect x="208" y="86" width="56" height="40" />
        <path d="M208 100h56M208 114h56" />
      </svg>
      <span class="proj-sheet-fold"></span>
    </span>
    <span class="proj-blueprint-caption">cool builds!</span>
  `;

  [...grid.children].forEach((node, i) => node.style.setProperty("--i", String(i)));
  desk.style.setProperty("--n", String(grid.children.length));
  desk.append(button, grid);

  let closing = false;
  const setOpen = (open) => {
    if (closing) return;
    const sticker = button.querySelector(".proj-blueprint-sticker");
    if (!open) {
      if (!desk.classList.contains("is-open")) return;
      desk.classList.remove("is-open");
      button.setAttribute("aria-expanded", "false");
      if (sticker) sticker.textContent = "open me";
      closing = true;
      playIconExit(desk, () => { closing = false; });
      return;
    }
    desk.classList.add("is-open");
    button.setAttribute("aria-expanded", "true");
    if (sticker) sticker.textContent = "close";
    grid.querySelectorAll(".project-folder").forEach((node) => node.classList.add("is-visible"));
  };

  button.addEventListener("click", () => setOpen(!desk.classList.contains("is-open")));
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape" || !desk.classList.contains("is-open")) return;
    if ($("#projectModal")?.open) return;
    setOpen(false);
  });
}

function playIconExit(desk, done) {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const count = Number(desk.style.getPropertyValue("--n")) || desk.querySelectorAll(".spill-item, .exp-badge, .project-folder").length;
  if (reduce) {
    done();
    return;
  }
  desk.classList.add("is-closing");
  const together = desk.classList.contains("icon-desk") || desk.classList.contains("exp-desk");
  const ms = together ? 620 : 400 + Math.max(0, count - 1) * 42;
  window.setTimeout(() => {
    desk.classList.remove("is-closing");
    done();
  }, ms);
}

function aimSpillAt(originEl, spill) {
  if (!originEl) return;
  const origin = originEl.getBoundingClientRect();
  const ox = origin.left + origin.width / 2;
  const oy = origin.top + origin.height * 0.72;
  spill.querySelectorAll(".spill-item").forEach((item) => {
    const rect = item.getBoundingClientRect();
    if (!rect.width && !rect.height) return;
    const dx = ox - (rect.left + rect.width / 2);
    const dy = oy - (rect.top + rect.height / 2);
    item.style.setProperty("--from-x", `${dx.toFixed(1)}px`);
    item.style.setProperty("--from-y", `${dy.toFixed(1)}px`);
  });
}

function bindSpillDesk({ id, panelId, desk, trigger, origin, spill, onClosed, onEscape }) {
  let closing = false;
  const waiters = [];
  const sticker = () => trigger.querySelector(".exp-folder-sticker");
  const aim = () => aimSpillAt(typeof origin === "function" ? origin() : origin, spill);

  const finishClose = () => {
    trigger.classList.remove("is-closing");
    onClosed?.();
    closing = false;
    requestAnimationFrame(refreshTabsLayout);
    const queued = waiters.splice(0);
    queued.forEach((fn) => fn?.());
  };

  const open = () => {
    if (closing || desk.classList.contains("is-open")) return;
    spill.querySelectorAll(".reveal-card").forEach((node) => node.classList.add("is-visible"));
    spill.style.display = "flex";
    spill.style.visibility = "hidden";
    aim();
    spill.style.visibility = "";
    desk.classList.add("is-open");
    trigger.classList.add("is-open");
    trigger.setAttribute("aria-expanded", "true");
    trigger.setAttribute("aria-selected", "true");
    spill.style.display = "";
    const label = sticker();
    if (label) label.textContent = "close";
    requestAnimationFrame(refreshTabsLayout);
  };

  const close = (done) => {
    if (!desk.classList.contains("is-open") && !closing) {
      done?.();
      return;
    }
    if (closing) {
      if (done) waiters.push(done);
      return;
    }
    aim();
    desk.classList.remove("is-open");
    trigger.classList.remove("is-open");
    trigger.classList.add("is-closing");
    trigger.setAttribute("aria-expanded", "false");
    trigger.setAttribute("aria-selected", "false");
    const label = sticker();
    if (label) label.textContent = "open me";
    closing = true;
    if (done) waiters.push(done);
    playIconExit(desk, finishClose);
  };

  aboutDesks.set(id, {
    id,
    panelId,
    open,
    close,
    isOpen: () => desk.classList.contains("is-open"),
    isBusy: () => closing
  });

  trigger.addEventListener("click", () => selectAboutDesk(id));
  settleAboutOrbit();
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape" || !desk.classList.contains("is-open")) return;
    if (document.querySelector("dialog[open]")) return;
    if (onEscape?.()) return;
    selectAboutDesk(id);
  }, true);
}

const orbitBases = { awards: -120, exp: 0, listening: 120 };
let orbitRotation = 0;
let orbitShown = 0;
let orbitFrame = 0;

function normDeg(deg) {
  let x = ((deg % 360) + 360) % 360;
  if (x > 180) x -= 360;
  return x;
}

function nearestOrbit(current, ideal) {
  let best = ideal;
  let bestDist = Infinity;
  for (let k = -3; k <= 3; k += 1) {
    const candidate = ideal + 360 * k;
    const dist = Math.abs(candidate - current);
    if (dist < bestDist) {
      bestDist = dist;
      best = candidate;
    }
  }
  return best;
}

function paintAboutOrbit(rotation, dim) {
  orbitShown = rotation;
  const wrap = document.querySelector(".about-icons");
  if (!wrap) return;
  wrap.classList.add("is-orbit");
  wrap.classList.toggle("is-focused", dim);
  const slots = [...wrap.querySelectorAll("[data-icon]")];
  if (!slots.length || wrap.clientWidth < 80) return;
  const slotWidth = slots[0].offsetWidth || 200;
  const rx = ((wrap.clientWidth - slotWidth) / 2) / Math.sin((2 * Math.PI) / 3);
  const ry = 34;
  slots.forEach((el) => {
    const angle = normDeg(orbitBases[el.dataset.icon] + rotation);
    const rad = angle * Math.PI / 180;
    const depth = Math.cos(rad);
    const front = Math.abs(angle) < 46;
    const x = Math.sin(rad) * rx;
    const y = (1 - depth) * ry;
    const scale = dim && !front ? 0.78 : (front && dim ? 1.06 : 1);
    el.style.zIndex = front ? "4" : "1";
    el.style.opacity = dim && !front ? "0.42" : "1";
    el.style.filter = dim && !front ? "grayscale(1)" : "none";
    el.style.transform = `translate(calc(-50% + ${x.toFixed(1)}px), ${y.toFixed(1)}px) scale(${scale})`;
    el.classList.toggle("is-focus", dim && front);
  });
}

function placeAboutIcons(activeId, done) {
  const wrap = document.querySelector(".about-icons");
  if (!wrap || !wrap.querySelector("[data-icon] button")) {
    done?.();
    return;
  }
  const ideal = activeId ? -orbitBases[activeId] : 0;
  const from = orbitShown;
  const to = nearestOrbit(from, ideal);
  orbitRotation = to;
  const dim = Boolean(activeId);
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (orbitFrame) cancelAnimationFrame(orbitFrame);
  if (reduce || Math.abs(to - from) < 0.5) {
    paintAboutOrbit(to, dim);
    done?.();
    return;
  }
  const start = performance.now();
  const duration = 720;
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const tick = (now) => {
    const t = Math.min(1, (now - start) / duration);
    paintAboutOrbit(from + (to - from) * ease(t), dim);
    if (t < 1) orbitFrame = requestAnimationFrame(tick);
    else {
      orbitFrame = 0;
      paintAboutOrbit(to, dim);
      done?.();
    }
  };
  orbitFrame = requestAnimationFrame(tick);
}

function settleAboutOrbit() {
  const ready = ["exp", "awards", "listening"].every((iconId) => document.querySelector(`[data-icon="${iconId}"] button`));
  if (!ready || orbitFrame) return;
  paintAboutOrbit(orbitRotation, Boolean(activeAboutId));
}

window.addEventListener("resize", () => {
  if (orbitFrame) return;
  settleAboutOrbit();
});

function selectAboutDesk(id) {
  const next = aboutDesks.get(id);
  if (!next || (next.isBusy() && activeAboutId === id)) return;
  if (activeAboutId === id) {
    next.close(() => {
      if (activeAboutId === id) {
        activeAboutId = null;
        placeAboutIcons(null);
      }
    });
    return;
  }
  const prev = activeAboutId ? aboutDesks.get(activeAboutId) : null;
  activeAboutId = id;
  const openNext = () => {
    if (activeAboutId !== id) return;
    activateAboutPanel(next.panelId);
    next.open();
  };
  if (prev && (prev.isOpen() || prev.isBusy())) {
    placeAboutIcons(id);
    prev.close(openNext);
  } else {
    placeAboutIcons(id, openNext);
  }
}

function experienceOrg(item) {
  if (item?.org) return String(item.org);
  const sub = String(item?.subtitle || "");
  const place = sub.split("|")[0].trim();
  return place || "Experience";
}

function experienceMark(org) {
  const key = org.toLowerCase();
  if (key.includes("university of alberta") || key.includes("faculty of engineering")) {
    return `<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="30" fill="#0b6b3a"/><circle cx="32" cy="32" r="23" fill="none" stroke="#ffd24a" stroke-width="3"/><text x="32" y="39" text-anchor="middle" font-family="ui-sans-serif, system-ui, sans-serif" font-size="18" font-weight="700" fill="#ffd24a">UA</text></svg>`;
  }
  if (key.includes("bionix")) {
    return `<svg viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="18" fill="#12324a"/><path fill="#7ee0c6" d="M30 10h4v8h-4zM24 18h16v6H24z"/><circle cx="32" cy="16" r="4" fill="#f4b942"/><path fill="#d7fff4" d="M27 26h10l4 10-6 2v12h-6V38l-6-2 4-10z"/><rect x="26" y="50" width="5" height="6" rx="1" fill="#f4b942"/><rect x="33" y="50" width="5" height="6" rx="1" fill="#f4b942"/></svg>`;
  }
  if (key.includes("scarlett")) {
    return `<svg viewBox="0 0 64 64" aria-hidden="true"><path fill="#c23b4a" d="M32 4 56 14v18c0 14-10 24-24 28C18 56 8 46 8 32V14L32 4z"/><path fill="#fff4f4" d="M32 14l4.2 8.6 9.5 1.4-6.9 6.7 1.6 9.4L32 35.6 23.6 40l1.6-9.4-6.9-6.7 9.5-1.4L32 14z"/></svg>`;
  }
  if (key.includes("calgary")) {
    return `<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="30" fill="#c8102e"/><path fill="#fff" d="M8 42h48v6H8zM14 40l8-14 6 8 6-16 6 12 8-8 4 18H14z"/><circle cx="46" cy="18" r="4" fill="#ffd24a"/></svg>`;
  }
  if (key.includes("junior achievement")) {
    return `<svg viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="18" fill="#0b3d91"/><circle cx="32" cy="28" r="12" fill="#ffd24a"/><path fill="#0b3d91" d="M32 20l2.2 4.6 5 .7-3.6 3.5.9 5L32 31.6 27.5 34l.9-5-3.6-3.5 5-.7L32 20z"/><path fill="#fff" d="M18 44h28v4H18zM22 40h20v4H22z"/></svg>`;
  }
  const letters = initials(org);
  return `<svg viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="18" fill="#5b3fff"/><text x="32" y="40" text-anchor="middle" font-family="ui-sans-serif, system-ui, sans-serif" font-size="22" font-weight="700" fill="#fff">${letters}</text></svg>`;
}

function renderExperiences(container, items) {
  if (!container) return;
  container.innerHTML = "";
  const list = items || [];
  if (!list.length) return;

  const desk = el("div", { class: "icon-desk exp-desk" });
  const folder = el("button", {
    class: "exp-folder icon-trigger",
    id: "expIcon",
    type: "button",
    role: "tab",
    "aria-selected": "false",
    "aria-expanded": "false",
    "aria-controls": "tabExp",
    "aria-label": "Experiences"
  });
  folder.innerHTML = `
    <span class="exp-folder-shape" aria-hidden="true">
      <span class="exp-folder-pocket">
        <span class="exp-folder-peek"></span>
        <span class="exp-folder-peek"></span>
        <span class="exp-folder-peek"></span>
      </span>
      <span class="exp-folder-lid">
        <span class="exp-folder-tab"></span>
        <span class="exp-folder-lid-face"></span>
      </span>
    </span>
    <span class="exp-folder-caption">experiences</span>
  `;

  const spill = el("div", { class: "exp-spill", id: "expSpill" });
  const detail = el("div", { class: "item exp-detail", role: "region", "aria-live": "polite" });
  let selected = null;

  const showDetail = (it, badge) => {
    selected = it;
    spill.querySelectorAll(".exp-badge").forEach((node) => {
      node.classList.toggle("is-selected", node === badge);
      node.setAttribute("aria-pressed", String(node === badge));
    });
    detail.innerHTML = "";
    const close = el("button", {
      class: "exp-detail-close",
      type: "button",
      "aria-label": "Close experience details",
      text: "×"
    });
    close.addEventListener("click", () => {
      selected = null;
      detail.classList.remove("is-open");
      spill.querySelectorAll(".exp-badge").forEach((node) => {
        node.classList.remove("is-selected");
        node.setAttribute("aria-pressed", "false");
      });
      requestAnimationFrame(refreshTabsLayout);
    });
    const bits = [
      close,
      el("h3", { text: it.title || it.name || experienceOrg(it) }),
      it.subtitle ? el("p", { class: "sub", text: it.subtitle }) : null,
      it.dates ? el("p", { class: "meta-line", text: it.dates }) : null,
      it.details ? el("p", { class: "meta-line", text: it.details }) : null
    ].filter(Boolean);
    const gallery = buildInlineGallery(experienceSlides(it), it.title || it.name || experienceOrg(it));
    if (gallery) bits.push(gallery);
    detail.append(...bits);
    detail.classList.remove("is-open");
    void detail.offsetWidth;
    detail.classList.add("is-open");
    requestAnimationFrame(() => {
      refreshTabsLayout();
      detail.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  };

  list.forEach((it, i) => {
    const org = experienceOrg(it);
    const role = it.title || it.name || org;
    const badge = el("button", {
      class: "exp-badge spill-item",
      type: "button",
      "aria-pressed": "false",
      "aria-label": `${role} at ${org}`,
      style: `--i:${i}`
    });
    const face = el("span", { class: "exp-badge-face" });
    const logo = it.logo ? safeMediaUrl(it.logo) : null;
    if (logo) {
      const img = el("img", { src: logo, alt: "" });
      face.append(img);
    } else {
      face.innerHTML = experienceMark(org);
    }
    badge.append(
      face,
      el("span", { class: "exp-badge-role", text: role }),
      el("span", { class: "exp-badge-org", text: org })
    );
    badge.addEventListener("click", () => showDetail(it, badge));
    spill.append(badge);
  });

  spill.style.setProperty("--n", String(list.length));
  desk.style.setProperty("--n", String(list.length));

  const clearDetail = () => {
    selected = null;
    detail.classList.remove("is-open");
    spill.querySelectorAll(".exp-badge").forEach((node) => {
      node.classList.remove("is-selected");
      node.setAttribute("aria-pressed", "false");
    });
    requestAnimationFrame(refreshTabsLayout);
  };

  $("#iconSlotExp")?.append(folder);
  desk.append(spill, detail);
  container.append(desk);
  bindSpillDesk({
    id: "exp",
    panelId: "exp",
    desk,
    trigger: folder,
    origin: () => folder.querySelector(".exp-folder-pocket") || folder,
    spill,
    onClosed: clearDetail,
    onEscape: () => {
      if (!detail.classList.contains("is-open")) return false;
      clearDetail();
      return true;
    }
  });
}

function courseGroups(courses) {
  if (!Array.isArray(courses) || !courses.length) return [];
  if (courses.some((c) => Array.isArray(c?.items))) {
    return courses
      .map((group) => ({
        group: group.group || group.label || "",
        items: (group.items || []).filter((c) => c?.code || c?.name)
      }))
      .filter((group) => group.items.length);
  }
  return [{
    group: "",
    items: courses.filter((c) => c?.code || c?.name)
  }].filter((group) => group.items.length);
}

function renderCourses(container, courses) {
  const section = $("#eduCourses");
  if (!container) return;
  container.innerHTML = "";
  const groups = courseGroups(courses);
  if (!groups.length) {
    if (section) section.hidden = true;
    return;
  }
  if (section) section.hidden = false;
  for (const group of groups) {
    const rows = group.items.map((course) =>
      el("div", { class: "course-row" }, [
        el("span", { class: "course-code", text: course.code || "" }),
        el("span", { class: "course-name", text: course.name || "" })
      ])
    );
    const children = [];
    if (group.group) children.push(el("p", { class: "course-group-label", text: group.group }));
    children.push(el("div", { class: "course-list" }, rows));
    container.append(el("div", { class: "course-group" }, children));
  }
}

function initCoursesToggle() {
  const btn = $("#coursesToggle");
  const panel = $("#coursesPanel");
  if (!btn || !panel) return;

  const setOpen = (open) => {
    btn.setAttribute("aria-expanded", String(open));
    panel.classList.toggle("is-open", open);
  };

  setOpen(false);
  btn.addEventListener("click", () => {
    const open = btn.getAttribute("aria-expanded") === "true";
    setOpen(!open);
  });
}

function timeAgo(iso) {
  const then = Date.parse(iso);
  if (!Number.isFinite(then)) return "";
  const sec = Math.max(0, Math.round((Date.now() - then) / 1000));
  if (sec < 60) return "just now";
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  return `${day}d ago`;
}

function renderTrackRow(track, { live = false } = {}) {
  const href = safeUrl(track?.url);
  const row = el(href ? "a" : "div", {
    class: live ? "track-row track-row--live spill-item" : "track-row spill-item",
    href: href || undefined,
    target: href ? "_blank" : undefined,
    rel: href ? "noreferrer" : undefined
  });

  if (track?.albumImage) {
    const img = el("img", {
      class: "track-art",
      src: track.albumImage,
      alt: ""
    });
    img.loading = "lazy";
    img.addEventListener("load", () => refreshTabsLayout());
    img.addEventListener("error", () => {
      img.remove();
      refreshTabsLayout();
    }, { once: true });
    row.append(img);
  } else {
    row.append(el("div", { class: "track-art track-art--empty", "aria-hidden": "true" }));
  }

  const metaChildren = [
    el("p", { class: "track-name", text: track?.name || "Unknown track" }),
    el("p", { class: "track-artists", text: track?.artists || "" })
  ];
  if (live) {
    metaChildren.push(el("p", { class: "track-live", text: "now playing" }));
  } else if (track?.playedAt) {
    const ago = timeAgo(track.playedAt);
    if (ago) metaChildren.push(el("p", { class: "track-played", text: ago }));
  }
  row.append(el("div", { class: "track-meta" }, metaChildren));
  return row;
}

function listeningEmpty(title, subtitle) {
  return el("div", { class: "item spill-item" }, [
    el("h3", { text: title }),
    el("p", { class: "sub", text: subtitle })
  ]);
}

async function renderListening(container) {
  if (!container) return;
  container.innerHTML = "";
  const desk = el("div", { class: "icon-desk music-desk" });
  const disc = el("button", {
    class: "music-disc icon-trigger",
    id: "listenIcon",
    type: "button",
    role: "tab",
    "aria-selected": "false",
    "aria-expanded": "false",
    "aria-controls": "tabListening",
    "aria-label": "Listening"
  });
  disc.innerHTML = `
    <span class="disc-shape" aria-hidden="true">
      <span class="disc-pop">
        <span class="disc-vinyl"></span>
      </span>
    </span>
    <span class="exp-folder-caption">;)</span>
  `;
  const spill = el("div", { class: "exp-spill track-spill", id: "listenSpill" });
  try {
    const res = await fetch("./spotify.json", { cache: "no-store" });
    if (!res.ok) throw new Error("spotify.json missing");
    const data = await res.json();
    const now = data?.nowPlaying || null;
    const recent = Array.isArray(data?.recent) ? data.recent : [];
    let i = 0;
    if (now) {
      const row = renderTrackRow(now, { live: true });
      row.style.setProperty("--i", String(i));
      i += 1;
      spill.append(row);
    }
    for (const track of recent) {
      const row = renderTrackRow(track);
      row.style.setProperty("--i", String(i));
      i += 1;
      spill.append(row);
    }
    if (!now && !recent.length) {
      const empty = listeningEmpty(
        "No recent tracks yet",
        "This list updates automatically after Spotify is connected."
      );
      empty.style.setProperty("--i", "0");
      spill.append(empty);
    }
  } catch {
    const empty = listeningEmpty(
      "Listening data unavailable",
      "Couldn’t load recently played tracks right now."
    );
    empty.style.setProperty("--i", "0");
    spill.append(empty);
  }
  const count = spill.querySelectorAll(".spill-item").length;
  spill.style.setProperty("--n", String(count));
  desk.style.setProperty("--n", String(count));
  $("#iconSlotListen")?.append(disc);
  desk.append(spill);
  container.append(desk);
  bindSpillDesk({
    id: "listening",
    panelId: "listening",
    desk,
    trigger: disc,
    origin: () => disc.querySelector(".disc-vinyl") || disc,
    spill
  });
  refreshTabsLayout();
}

function certificateIconSvg() {
  return `
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">
      <path fill="currentColor" d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Zm0 2.5L18.5 9H14V4.5ZM8 13h8v2H8v-2Zm0 4h5v2H8v-2Z"/>
    </svg>
  `.trim();
}

function isPdfUrl(url) {
  return /\.pdf(\?|#|$)/i.test(String(url || ""));
}

function renderAwards(container, items) {
  if (!container) return;
  container.innerHTML = "";
  const list = items || [];
  const desk = el("div", { class: "icon-desk award-desk" });
  const trophy = el("button", {
    class: "prize-trophy icon-trigger",
    id: "awardsIcon",
    type: "button",
    role: "tab",
    "aria-selected": "false",
    "aria-expanded": "false",
    "aria-controls": "tabAwards",
    "aria-label": "Awards and certificates"
  });
  trophy.innerHTML = `
    <span class="prize-shape" aria-hidden="true">
      <span class="prize-cup">
        <span class="prize-bowl-wrap">
          <span class="prize-handle left"></span>
          <span class="prize-handle right"></span>
          <span class="prize-bowl"><span class="prize-star">★</span></span>
        </span>
        <span class="prize-stem"></span>
        <span class="prize-base"></span>
      </span>
    </span>
    <span class="exp-folder-caption">awards &amp; certificates</span>
  `;
  const spill = el("div", { class: "exp-spill award-spill", id: "awardSpill" });

  list.forEach((it, i) => {
    const bodyChildren = [el("h3", { text: it.title || it.name || "" })];
    if (it.subtitle) bodyChildren.push(el("p", { class: "sub", text: it.subtitle }));
    if (it.dates) bodyChildren.push(el("p", { class: "meta-line", text: it.dates }));
    const children = [el("div", { class: "item-body" }, bodyChildren)];
    const fileUrl = it.file ? safeMediaUrl(it.file) : null;
    if (fileUrl) {
      const iconBtn = el("button", {
        class: "cert-icon-btn press-btn",
        type: "button",
        "aria-label": `View certificate: ${it.title || it.name || "Certificate"}`,
        title: "View certificate"
      });
      iconBtn.innerHTML = certificateIconSvg();
      iconBtn.addEventListener("click", () => openCertificateModal(it));
      children.push(iconBtn);
    }
    spill.append(el("div", {
      class: "item item--cert spill-item",
      style: `--i:${i}`
    }, children));
  });

  spill.style.setProperty("--n", String(list.length));
  desk.style.setProperty("--n", String(list.length));
  $("#iconSlotAwards")?.append(trophy);
  desk.append(spill);
  container.append(desk);
  bindSpillDesk({
    id: "awards",
    panelId: "awards",
    desk,
    trigger: trophy,
    origin: () => trophy.querySelector(".prize-bowl") || trophy,
    spill
  });
}

function openCertificateModal(cert) {
  const modal = $("#certificateModal");
  const mediaWrap = $("#certModalMedia");
  const fileUrl = safeMediaUrl(cert?.file);
  if (!modal || !mediaWrap || !fileUrl) return;

  $("#certModalTitle").textContent = cert.title || cert.name || "Certificate";
  mediaWrap.innerHTML = "";

  if (isPdfUrl(fileUrl)) {
    mediaWrap.append(
      el("iframe", {
        class: "cert-modal-pdf",
        src: fileUrl,
        title: `${cert.title || "Certificate"} — PDF`
      })
    );
  } else {
    const img = el("img", {
      class: "cert-modal-img",
      src: fileUrl,
      alt: `${cert.title || "Certificate"} — certificate`
    });
    img.loading = "eager";
    mediaWrap.append(img);
  }

  modal.showModal();
}

function initTabs() {
  const tabConfig = [
    { id: "exp", panel: $("#tabExp") },
    { id: "awards", panel: $("#tabAwards") },
    { id: "listening", panel: $("#tabListening") }
  ].filter((t) => t.panel);

  if (!tabConfig.length) return;

  const panelsWrap = tabConfig[0].panel.parentElement;
  let activeId = "exp";

  const updatePanelHeight = () => {
    if (!panelsWrap) return;
    const active = tabConfig.find((t) => t.panel.classList.contains("is-active"))?.panel;
    if (!active) return;
    const inner = active.firstElementChild;
    const content = inner ? inner.offsetHeight : active.scrollHeight;
    const styles = getComputedStyle(panelsWrap);
    const pad = (parseFloat(styles.paddingTop) || 0) + (parseFloat(styles.paddingBottom) || 0);
    panelsWrap.style.height = `${Math.ceil(content + pad)}px`;
  };

  activateAboutPanel = (id) => {
    const next = tabConfig.find((t) => t.id === id);
    if (!next) return;
    tabConfig.forEach((t) => {
      const on = t.id === id;
      t.panel.classList.toggle("is-active", on);
      if (!on) t.panel.classList.remove("is-entering");
    });
    activeId = id;
    requestAnimationFrame(updatePanelHeight);
  };

  tabConfig.forEach((t) => t.panel.classList.toggle("is-active", t.id === activeId));
  window.addEventListener("resize", updatePanelHeight);
  refreshTabsLayout = updatePanelHeight;
  requestAnimationFrame(updatePanelHeight);
}

function openProjectModal(project) {
  const modal = $("#projectModal");
  if (!modal) return;
  $("#modalTitle").textContent = project?.name || "project";
  $("#modalDesc").textContent = project?.description || "";

  const existing = $("#modalVideo");
  const existingMedia = $("#modalMedia");
  const existingSlideshow = $("#modalSlideshow");
  if (existing) existing.remove();
  if (existingMedia) existingMedia.remove();
  if (existingSlideshow) existingSlideshow.remove();
  const modalInner = modal.querySelector(".stack");
  const slideshow = buildModalSlideshow(project);
  if (slideshow) modalInner?.insertBefore(slideshow, modalInner.firstChild);

  const shell = modal.querySelector(".modal-inner");
  if (shell) shell.style.animation = "";

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
      const key = linkIconKey(l);
      const icon = key ? iconSvg(key) : null;
      links.append(
        el("a", {
          class: icon ? "pill pill-icon project-link-icon" : "pill",
          href,
          target: href.startsWith("http") ? "_blank" : undefined,
          rel: href.startsWith("http") ? "noreferrer" : undefined,
          text: icon ? undefined : (l.label || "link"),
          "aria-label": l.label || "link",
          title: l.label || "link"
        })
      );
      if (icon) {
        const last = links.lastElementChild;
        if (last) last.innerHTML = icon;
      }
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

  const shell = modal.querySelector(".modal-inner");
  shell?.addEventListener("animationend", (e) => {
    if (e.target !== shell) return;
    // Drop the pop animation so it doesn't leave a transform on the dialog.
    // A leftover transform keeps GIFs frozen on the first frame.
    shell.style.animation = "none";
  });
}

function initCertificateModal() {
  const modal = $("#certificateModal");
  const close = $("#certModalClose");
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

function contactMark(kind) {
  const key = String(kind || "").toLowerCase();
  if (key.includes("github")) return iconSvg("github");
  if (key.includes("linkedin")) return iconSvg("linkedin");
  if (key.includes("mail") || key.includes("email")) {
    return `<svg viewBox="0 0 64 64" aria-hidden="true"><rect x="8" y="16" width="48" height="32" rx="6" fill="#7c5cff"/><path fill="#fff" d="M10 20l22 14L54 20v-2H10v2z"/></svg>`;
  }
  return `<svg viewBox="0 0 64 64" aria-hidden="true"><path fill="#19c37d" d="M32 6c-9 0-16 7-16 16 0 12 16 36 16 36s16-24 16-36c0-9-7-16-16-16z"/><circle cx="32" cy="22" r="6" fill="#fff"/></svg>`;
}

function initContact(person) {
  const mount = $("#contactMount");
  if (!mount) return;
  mount.innerHTML = "";

  const aside = el("div", { class: "contact-aside" });
  const items = [];
  if (person?.email) {
    items.push({ label: "email", sub: person.email, href: `mailto:${person.email}`, mark: "email" });
  }
  if (person?.location) {
    items.push({ label: "location", sub: person.location, mark: "pin" });
  }
  for (const link of person?.links || []) {
    const href = safeUrl(link.url);
    if (!href) continue;
    let sub = "";
    try { sub = new URL(href).hostname.replace(/^www\./, ""); } catch { sub = ""; }
    items.push({ label: link.label || "Link", sub, href, mark: link.label || "" });
  }

  items.forEach((it) => {
    const node = el(it.href ? "a" : "div", {
      class: "contact-line",
      href: it.href || undefined,
      target: it.href && it.href.startsWith("http") ? "_blank" : undefined,
      rel: it.href && it.href.startsWith("http") ? "noreferrer" : undefined
    });
    const mark = el("span", { class: "contact-line-mark", "aria-hidden": "true" });
    mark.innerHTML = contactMark(it.mark);
    const text = el("span", { class: "contact-line-text" });
    text.append(el("span", { class: "contact-line-label", text: it.label }));
    if (it.sub) text.append(el("span", { class: "contact-line-value", text: it.sub }));
    node.append(mark, text);
    aside.append(node);
  });

  mount.append(aside);
}

async function main() {
  initTheme();
  initTabs();
  initCoursesToggle();
  initModal();
  initCertificateModal();
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
  document.title = person.name || "Carlson Zheng";
  const brandName = $("#brandName");
  const footerName = $("#footerName");
  if (brandName) brandName.textContent = person.name || "Your Name";
  if (footerName) footerName.textContent = person.name || "Your Name";
  $("#heroKicker").textContent = person.hero?.kicker || "portfolio";
  $("#heroName").textContent = person.hero?.nameLower || (person.name || "Your Name");
  $("#aboutMeText").textContent = person.hero?.aboutMe || "";

  $("#eduProgram").textContent = person.education?.program || "—";
  $("#eduSchool").textContent = person.education?.school || "—";
  const metaParts = [person.education?.location, person.education?.dates, person.education?.gpa ? `GPA: ${person.education.gpa}` : null].filter(Boolean);
  $("#eduMeta").textContent = metaParts.length ? metaParts.join(" • ") : "—";
  renderCourses($("#coursesList"), person.education?.courses);

  const resumeButton = $("#resumeButton");
  if (resumeButton && person.resumeUrl) {
    resumeButton.setAttribute("href", person.resumeUrl);
    resumeButton.setAttribute("target", "_blank");
    resumeButton.setAttribute("rel", "noreferrer");
  }

  renderLinks($("#heroLinks"), person.links, "pill");
  renderProjects($("#projectsGrid"), data.projects);
  mountProjectBlueprint();
  $("#aboutSubtitle").textContent = data.about?.subtitle || "";
  renderAwards($("#awardsList"), data.about?.awards);
  renderExperiences($("#expList"), data.about?.experiences);
  await renderListening($("#listeningList"));
  refreshTabsLayout();
  initContact(person);
  requestAnimationFrame(() => initReveal());
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

