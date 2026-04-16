// ── PCB CANVAS + PARTICLES ──────────────────────────────────────────────────

export function initPCB() {
  const canvas = document.getElementById("pcbCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  let W, H, dpr;
  let rotation = 0;
  let raf;

  // Theme detection
  function isDark() {
    return document.documentElement.dataset.theme !== "light";
  }

  function colors() {
    if (isDark()) {
      return {
        bg: "transparent",
        trace: "rgba(124,92,255,0.18)",
        node: "rgba(25,195,125,0.28)",
        nodeFill: "rgba(25,195,125,0.12)",
        cube: "rgba(124,92,255,0.35)",
        cubeFill: "rgba(124,92,255,0.08)",
      };
    }
    return {
      bg: "transparent",
      trace: "rgba(91,63,255,0.10)",
      node: "rgba(10,150,80,0.20)",
      nodeFill: "rgba(10,150,80,0.06)",
      cube: "rgba(91,63,255,0.22)",
      cubeFill: "rgba(91,63,255,0.05)",
    };
  }

  function resize() {
    dpr = window.devicePixelRatio || 1;
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    ctx.scale(dpr, dpr);
    buildPCB();
  }

  // ── PCB GRID ──
  let nodes = [];
  let edges = [];

  function buildPCB() {
    nodes = [];
    edges = [];
    const cols = Math.ceil(W / 80) + 2;
    const rows = Math.ceil(H / 80) + 2;
    const ox = -40, oy = -40;
    const spacing = 80;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (Math.random() < 0.55) {
          nodes.push({
            x: ox + c * spacing + (Math.random() - 0.5) * 18,
            y: oy + r * spacing + (Math.random() - 0.5) * 18,
            r: 3 + Math.random() * 3,
            row: r, col: c
          });
        }
      }
    }

    // Connect nearby nodes as PCB traces (Manhattan-style)
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[j].x - nodes[i].x;
        const dy = nodes[j].y - nodes[i].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 130 && Math.random() < 0.35) {
          edges.push({ a: i, b: j });
        }
      }
    }
  }

  // ── CUBES ──
  const NUM_CUBES = 18;
  let cubes = [];

  function initCubes() {
    cubes = [];
    for (let i = 0; i < NUM_CUBES; i++) {
      cubes.push({
        x: Math.random() * W,
        y: Math.random() * H,
        s: 8 + Math.random() * 14,
        rx: Math.random() * Math.PI * 2,
        ry: Math.random() * Math.PI * 2,
        rz: Math.random() * Math.PI * 2,
        drx: (Math.random() - 0.5) * 0.008,
        dry: (Math.random() - 0.5) * 0.009,
        drz: (Math.random() - 0.5) * 0.006,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
        opacity: 0.3 + Math.random() * 0.5
      });
    }
  }

  function drawCube(cx, cy, s, rx, ry, rz, col) {
    // Project 8 corners of a unit cube
    const verts = [
      [-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],
      [-1,-1, 1],[1,-1, 1],[1,1, 1],[-1,1, 1]
    ];

    function rotX(v, a) { return [v[0], v[1]*Math.cos(a)-v[2]*Math.sin(a), v[1]*Math.sin(a)+v[2]*Math.cos(a)]; }
    function rotY(v, a) { return [v[0]*Math.cos(a)+v[2]*Math.sin(a), v[1], -v[0]*Math.sin(a)+v[2]*Math.cos(a)]; }
    function rotZ(v, a) { return [v[0]*Math.cos(a)-v[1]*Math.sin(a), v[0]*Math.sin(a)+v[1]*Math.cos(a), v[2]]; }

    const pts = verts.map(v => {
      let p = rotX(v, rx);
      p = rotY(p, ry);
      p = rotZ(p, rz);
      const fov = 4;
      const z = p[2] + fov;
      return [cx + (p[0] * s * fov) / z, cy + (p[1] * s * fov) / z];
    });

    const faces = [
      [0,1,2,3],[4,5,6,7],[0,1,5,4],[2,3,7,6],[0,3,7,4],[1,2,6,5]
    ];

    ctx.strokeStyle = col.cube;
    ctx.lineWidth = 0.8;
    for (const face of faces) {
      ctx.beginPath();
      ctx.moveTo(pts[face[0]][0], pts[face[0]][1]);
      for (let i = 1; i < face.length; i++) ctx.lineTo(pts[face[i]][0], pts[face[i]][1]);
      ctx.closePath();
      ctx.fillStyle = col.cubeFill;
      ctx.fill();
      ctx.stroke();
    }
  }

  function drawPCB(col, rot) {
    const cx = W / 2, cy = H / 2;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rot);
    ctx.translate(-cx, -cy);

    // Traces
    ctx.strokeStyle = col.trace;
    ctx.lineWidth = 1;
    for (const e of edges) {
      const a = nodes[e.a], b = nodes[e.b];
      ctx.beginPath();
      // Manhattan routing: horizontal then vertical
      if (Math.random() < 0.5) {
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, a.y);
        ctx.lineTo(b.x, b.y);
      } else {
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(a.x, b.y);
        ctx.lineTo(b.x, b.y);
      }
      ctx.stroke();
    }

    // Nodes (vias)
    for (const n of nodes) {
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      ctx.fillStyle = col.nodeFill;
      ctx.fill();
      ctx.strokeStyle = col.node;
      ctx.lineWidth = 1;
      ctx.stroke();
      // Inner dot
      ctx.beginPath();
      ctx.arc(n.x, n.y, 1, 0, Math.PI * 2);
      ctx.fillStyle = col.node;
      ctx.fill();
    }

    ctx.restore();
  }

  function frame() {
    ctx.clearRect(0, 0, W, H);
    const col = colors();
    rotation += 0.00018;

    drawPCB(col, rotation);

    // Cubes
    for (const c of cubes) {
      ctx.save();
      ctx.globalAlpha = c.opacity;
      drawCube(c.x, c.y, c.s, c.rx, c.ry, c.rz, col);
      ctx.restore();

      c.rx += c.drx;
      c.ry += c.dry;
      c.rz += c.drz;
      c.x += c.vx;
      c.y += c.vy;

      // Wrap edges
      if (c.x < -40) c.x = W + 40;
      if (c.x > W + 40) c.x = -40;
      if (c.y < -40) c.y = H + 40;
      if (c.y > H + 40) c.y = -40;
    }

    raf = requestAnimationFrame(frame);
  }

  resize();
  initCubes();
  window.addEventListener("resize", () => {
    ctx.resetTransform();
    ctx.scale(dpr, dpr);
    resize();
    initCubes();
  });

  frame();
}

// ── SCROLL SHRINK ──────────────────────────────────────────────────────────
export function initScrollShrink() {
  const wrap = document.getElementById("heroNameWrap");
  const heroSection = document.getElementById("home");
  if (!wrap || !heroSection) return;

  function onScroll() {
    const scrollY = window.scrollY;
    const heroH = heroSection.offsetHeight;
    const progress = Math.min(scrollY / (heroH * 0.7), 1);

    const scale = 1 - progress * 0.38;
    const translateY = -progress * 60;
    const opacity = 1 - progress * 0.7;

    wrap.style.transform = `scale(${scale}) translateY(${translateY}px)`;
    wrap.style.opacity = opacity;
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
}

// ── REVEAL ON SCROLL ───────────────────────────────────────────────────────
export function initReveal() {
  const cards = document.querySelectorAll(".reveal-card");
  const obs = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          obs.unobserve(entry.target);
        }
      }
    },
    { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
  );
  for (const c of cards) obs.observe(c);
}

// ── PROJECT CARD REVEAL (called after dynamic render) ─────────────────────
export function revealDynamic() {
  const cards = document.querySelectorAll(".reveal-card:not(.is-visible)");
  const obs = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          obs.unobserve(entry.target);
        }
      }
    },
    { threshold: 0.1, rootMargin: "0px 0px -20px 0px" }
  );
  for (const c of cards) obs.observe(c);
}
