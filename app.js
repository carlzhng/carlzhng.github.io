import { initPCB, initScrollShrink, initReveal } from "./pcb.js";

const $ = (sel) => document.querySelector(sel);
let refreshTabsLayout = () => {};

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

function buildModalSlideshow(project) {
  const slides = projectSlides(project);
  if (!slides.length) return null;

  let idx = 0;

  const img = document.createElement("img");
  img.className = "modal-slide-img";
  img.alt = `${project?.name || "Project"} — preview`;

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
  const wrap = el("div", { class: "modal-slideshow", id: "modalSlideshow" }, [img, nav, counter]);

  const setIdx = (n) => {
    idx = (n + slides.length) % slides.length;
    const src = slides[idx];
    img.src = src;
    const contain = /\.gif(\?|#|$)/i.test(src);
    img.classList.toggle("modal-slide-img--contain", contain);
    counter.textContent = slides.length > 1 ? `${idx + 1} / ${slides.length}` : "";
    prevBtn.disabled = slides.length <= 1;
    nextBtn.disabled = slides.length <= 1;
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
  for (const it of items || []) {
    const fileUrl = it.file ? safeMediaUrl(it.file) : null;

    const bodyChildren = [el("h3", { text: it.title || it.name || "" })];
    if (it.subtitle) bodyChildren.push(el("p", { class: "sub", text: it.subtitle }));
    if (it.dates) bodyChildren.push(el("p", { class: "meta-line", text: it.dates }));
    const children = [el("div", { class: "item-body" }, bodyChildren)];

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

    container.append(el("div", { class: "item item--cert reveal-card" }, children));
  }
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
    { id: "exp", btn: $("#tabExpBtn"), panel: $("#tabExp") },
    { id: "awards", btn: $("#tabAwardsBtn"), panel: $("#tabAwards") }
  ].filter((t) => t.btn && t.panel);

  if (tabConfig.length < 2) return;

  const panelsWrap = tabConfig[0].panel.parentElement;
  let activeIdx = Math.max(0, tabConfig.findIndex((t) => t.id === "exp"));
  let isAnimating = false;

  const updatePanelHeight = () => {
    if (!panelsWrap) return;
    const h = Math.max(...tabConfig.map((t) => t.panel.scrollHeight));
    panelsWrap.style.height = `${h}px`;
  };

  const set = (idx) => {
    if (isAnimating || idx === activeIdx || idx < 0 || idx >= tabConfig.length) return;
    isAnimating = true;

    const prevPanel = tabConfig[activeIdx].panel;
    const nextPanel = tabConfig[idx].panel;

    panelsWrap?.setAttribute("data-dir", idx > activeIdx ? "right" : "left");
    prevPanel.classList.add("is-leaving");
    prevPanel.classList.remove("is-active");
    nextPanel.classList.add("is-entering");
    nextPanel.classList.add("is-active");

    tabConfig.forEach((t, i) => {
      const active = i === idx;
      t.btn.classList.toggle("is-active", active);
      t.btn.setAttribute("aria-selected", String(active));
    });

    requestAnimationFrame(updatePanelHeight);
    window.setTimeout(() => {
      prevPanel.classList.remove("is-leaving");
      nextPanel.classList.remove("is-entering");
      activeIdx = idx;
      isAnimating = false;
    }, 260);
  };

  tabConfig.forEach((t, i) => {
    t.panel.classList.toggle("is-active", i === activeIdx);
    t.btn.classList.toggle("is-active", i === activeIdx);
    t.btn.setAttribute("aria-selected", String(i === activeIdx));
    t.btn.addEventListener("click", () => set(i));
  });

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

function initContact(person) {
  const emailLink = $("#emailLink");
  const locationText = $("#locationText");
  const contactLinks = $("#contactLinks");

  if (emailLink) {
    emailLink.textContent = person.email || "you@example.com";
    emailLink.href = `mailto:${person.email || "you@example.com"}`;
  }
  if (locationText) locationText.textContent = person.location || "";
  renderLinks(contactLinks, person.links, "link");
}

async function main() {
  initTheme();
  initTabs();
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

  const resumeButton = $("#resumeButton");
  if (resumeButton && person.resumeUrl) {
    resumeButton.setAttribute("href", person.resumeUrl);
    resumeButton.setAttribute("target", "_blank");
    resumeButton.setAttribute("rel", "noreferrer");
  }

  renderLinks($("#heroLinks"), person.links, "pill");
  renderProjects($("#projectsGrid"), data.projects);
  $("#aboutSubtitle").textContent = data.about?.subtitle || "";
  renderAwards($("#awardsList"), data.about?.awards);
  renderItems($("#expList"), data.about?.experiences);
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

