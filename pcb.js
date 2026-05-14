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
        isDark: true,
        /** Heavier veil (~#070b13 at ~0x0f) plus alpha so grids sit on a deep slab */
        bg: "rgba(6,10,18,0.78)",
        trace: "rgba(78,92,138,0.26)",
        node: "rgba(52,146,118,0.38)",
        nodeFill: "rgba(22,62,54,0.22)",
        /** Muted violet–slate wireframe; darker fills read as shaded faces */
        cube: "rgba(68,74,118,0.38)",
        cubeFill: "rgba(18,20,34,0.52)",
        cubeOpacityMul: 0.74,
      };
    }
    return {
      isDark: false,
      bg: "rgba(247,247,251,0.22)",
      trace: "rgba(91,63,255,0.16)",
      node: "rgba(11,138,88,0.34)",
      nodeFill: "rgba(11,138,88,0.10)",
      cube: "rgba(91,63,255,0.30)",
      cubeFill: "rgba(91,63,255,0.08)",
      cubeOpacityMul: 1,
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
          // Store a stable routing mode per edge so traces do not jitter frame-to-frame.
          edges.push({ a: i, b: j, horizontalFirst: Math.random() < 0.5 });
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
        drx: (Math.random() - 0.5) * 0.012,
        dry: (Math.random() - 0.5) * 0.013,
        drz: (Math.random() - 0.5) * 0.009,
        vx: (Math.random() - 0.5) * 0.52,
        vy: (Math.random() - 0.5) * 0.52,
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
      if (e.horizontalFirst) {
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
    const col = colors();
    ctx.clearRect(0, 0, W, H);
    if (col.bg) {
      ctx.fillStyle = col.bg;
      ctx.fillRect(0, 0, W, H);
    }
    rotation += 0.00042;

    drawPCB(col, rotation);

    // Cubes
    const cubeMul = col.cubeOpacityMul ?? 1;
    for (const c of cubes) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, c.opacity * cubeMul);
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
    // Slower progression so the name minimizes gradually as user scrolls.
    const progress = Math.min(scrollY / (heroH * 1.35), 1);

    const scale = 1 - progress * 0.32;
    const translateY = -progress * 42;
    const opacity = 1 - progress * 0.18;

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
    { threshold: 0.1, rootMargin: "0px 0px -28px 0px" }
  );
  for (const c of cards) obs.observe(c);
}
