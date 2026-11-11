/* =========================================================
   BUILDING SCAN: a glowing 3D wireframe of the buildings around an agent.
   Plain canvas, no 3D library. Usage:
     ImfScan.open({ lat, lng, agent, buildings, sample })
   buildings: [{ outline: [[lat, lng], ...], height, levels, estimated, name, kind }]
   ========================================================= */
(() => {
  const M_PER_DEG = 111320;
  const GREEN = [57, 255, 106], RED = [255, 59, 59];
  let running = null;

  // lat/lng -> meters around the agent (x east, z north)
  function toLocal(lat0, lng0) {
    const kx = Math.cos((lat0 * Math.PI) / 180) * M_PER_DEG;
    return ([lat, lng]) => [(lng - lng0) * kx, (lat - lat0) * M_PER_DEG];
  }
  function inside(pt, poly) {
    let c = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, zi] = poly[i], [xj, zj] = poly[j];
      if ((zi > pt[1]) !== (zj > pt[1]) && pt[0] < ((xj - xi) * (pt[1] - zi)) / (zj - zi) + xi) c = !c;
    }
    return c;
  }
  const centroid = (poly) => poly.reduce((a, p) => [a[0] + p[0] / poly.length, a[1] + p[1] / poly.length], [0, 0]);

  function open({ lat, lng, agent = "Agent", buildings = [], sample = false }) {
    close();
    const local = toLocal(lat, lng);
    const shapes = buildings
      .map((b) => {
        let pts = b.outline.map(local);
        if (pts.length > 2 && pts[0][0] === pts[pts.length - 1][0] && pts[0][1] === pts[pts.length - 1][1]) pts = pts.slice(0, -1);
        const c = centroid(pts);
        return { ...b, pts, c, dist: Math.hypot(c[0], c[1]), h: Math.max(3, b.height || 3) };
      })
      .filter((b) => b.pts.length >= 3 && b.dist < 400);
    // the agent's building: the one they're inside, else the nearest
    let target = shapes.find((b) => inside([0, 0], b.pts)) || shapes.slice().sort((a, b) => a.dist - b.dist)[0];

    // ---- page furniture ----
    const root = document.createElement("div");
    root.className = "scan";
    root.innerHTML = `
      <canvas class="scan-canvas"></canvas>
      <div class="scan-hud scan-tl">
        <div class="scan-title">🛰️ SATELLITE STRUCTURE SCAN</div>
        <div class="scan-line" data-k="coords"></div>
        <div class="scan-line" data-k="count"></div>
      </div>
      <div class="scan-hud scan-tr"><button class="scan-close" type="button">✕ Close</button></div>
      <div class="scan-hud scan-bl">
        <div class="scan-line scan-target" data-k="target"></div>
        <div class="scan-line" data-k="detail"></div>
      </div>
      ${sample ? '<div class="scan-hud scan-br">SAMPLE DATA · prototype</div>' : '<div class="scan-hud scan-br">Map data © OpenStreetMap contributors</div>'}
      <div class="scan-sweep"></div>`;
    document.body.appendChild(root);
    const canvas = root.querySelector("canvas");
    const ctx = canvas.getContext("2d");
    const hud = (k, t) => { root.querySelector(`[data-k="${k}"]`).textContent = t; };
    hud("coords", `${Math.abs(lat).toFixed(4)}°${lat >= 0 ? "N" : "S"}  ${Math.abs(lng).toFixed(4)}°${lng >= 0 ? "E" : "W"}`);
    hud("count", `${shapes.length} STRUCTURES IN RANGE`);
    if (target) {
      const floors = target.levels || Math.max(1, Math.round(target.h / 3.2));
      hud("target", `▶ TARGET STRUCTURE · AGENT ${String(agent).toUpperCase()}`);
      hud("detail", `${target.name ? target.name.toUpperCase() + " · " : ""}${floors} FLOOR${floors > 1 ? "S" : ""} · ${Math.round(target.h)} m${target.estimated ? " (EST.)" : ""}`);
    } else {
      hud("target", "▶ NO STRUCTURES ON RECORD");
      hud("detail", "Agent may be outdoors");
    }

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    function size() {
      canvas.width = Math.round(root.clientWidth * dpr);
      canvas.height = Math.round(root.clientHeight * dpr);
    }
    size();
    window.addEventListener("resize", size);

    // ---- camera: slow orbit; drag to turn ----
    let yaw = -0.6, pitch = 0.62, dragging = null;
    const span = Math.max(80, Math.min(260, (target ? target.dist : 0) + 120));
    canvas.addEventListener("pointerdown", (e) => { dragging = { x: e.clientX, y: e.clientY, yaw, pitch }; canvas.setPointerCapture(e.pointerId); });
    canvas.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      yaw = dragging.yaw + (e.clientX - dragging.x) * 0.006;
      pitch = Math.min(1.3, Math.max(0.2, dragging.pitch + (e.clientY - dragging.y) * 0.004));
    });
    canvas.addEventListener("pointerup", () => { dragging = null; });

    const t0 = performance.now();
    function project(x, y, z, W, H) {
      // rotate around the agent, tilt, then perspective
      const cy = Math.cos(yaw), sy = Math.sin(yaw);
      const x1 = x * cy - z * sy, z1 = x * sy + z * cy;
      const cp = Math.cos(pitch), sp = Math.sin(pitch);
      const y2 = y * cp + z1 * sp, z2 = z1 * cp - y * sp; // looking down from above: far = higher + smaller
      const camDist = span * 2.7;
      const f = (Math.min(W, H) * 0.9) / (camDist * 0.75);
      const s = (camDist / (camDist + z2)) * f;
      return [W / 2 + x1 * s, H * 0.52 - y2 * s, z2];
    }
    const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
    const ease = (t) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);

    function frame(now) {
      const t = (now - t0) / 1000;
      if (!dragging) yaw += 0.0025;
      const W = canvas.width, H = canvas.height;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = "#020805";
      ctx.fillRect(0, 0, W, H);
      ctx.lineCap = "round";

      // ground: grid + radar rings + a sweeping ping
      ctx.lineWidth = 1 * dpr;
      const g = Math.ceil(span / 20) * 20;
      for (let v = -g; v <= g; v += 20) {
        const fade = 0.07;
        const a = project(v, 0, -g, W, H), b = project(v, 0, g, W, H);
        const c = project(-g, 0, v, W, H), d = project(g, 0, v, W, H);
        ctx.strokeStyle = rgba(GREEN, fade);
        ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.moveTo(c[0], c[1]); ctx.lineTo(d[0], d[1]); ctx.stroke();
      }
      const ping = ((t * 60) % (span * 1.4));
      for (const r of [ping, ...[50, 100, 150, 200].filter((r) => r < span)]) {
        ctx.strokeStyle = rgba(GREEN, r === ping ? Math.max(0, 0.5 - ping / (span * 2.8)) : 0.12);
        ctx.beginPath();
        for (let i = 0; i <= 64; i++) {
          const a = (i / 64) * Math.PI * 2;
          const p = project(Math.cos(a) * r, 0, Math.sin(a) * r, W, H);
          i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]);
        }
        ctx.stroke();
      }

      // buildings rise out of the ground, nearest first; far ones draw first
      const scanY = ((Math.sin(t * 0.9) + 1) / 2) * 30; // a scan plane moving up and down
      const order = shapes.slice().sort((a, b) => project(b.c[0], 0, b.c[1], W, H)[2] - project(a.c[0], 0, a.c[1], W, H)[2]);
      for (const b of order) {
        const isT = b === target;
        const grow = ease((t - 0.3 - b.dist / 220) / 1.1);
        if (grow <= 0) continue;
        const h = b.h * grow;
        const col = isT ? RED : GREEN;
        const depth = Math.max(0.25, 1 - b.dist / 380);
        const pulse = isT ? 0.65 + 0.35 * Math.sin(t * 5) : 1;
        const base = b.pts.map(([x, z]) => project(x, 0, z, W, H));
        const top = b.pts.map(([x, z]) => project(x, h, z, W, H));
        ctx.shadowColor = rgba(col, 0.9);
        ctx.shadowBlur = (isT ? 14 : 6) * dpr;
        ctx.lineWidth = (isT ? 2.2 : 1.2) * dpr;
        ctx.strokeStyle = rgba(col, (isT ? 0.95 : 0.75) * depth * pulse);
        // faint fill so buildings read as solids
        ctx.fillStyle = rgba(col, isT ? 0.08 : 0.035);
        ctx.beginPath(); top.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath(); ctx.fill();
        ctx.beginPath();
        for (const ring of [base, top]) { ring.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath(); }
        base.forEach((p, i) => { ctx.moveTo(p[0], p[1]); ctx.lineTo(top[i][0], top[i][1]); });
        // floor lines on the target, so it reads as a real structure
        if (isT) {
          const floors = b.levels || Math.max(1, Math.round(b.h / 3.2));
          for (let f = 1; f < floors; f++) {
            const fy = (h * f) / floors;
            b.pts.forEach(([x, z], i) => { const p = project(x, fy, z, W, H); i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); });
            const p0 = project(b.pts[0][0], fy, b.pts[0][1], W, H); ctx.lineTo(p0[0], p0[1]);
          }
        }
        ctx.stroke();
        // the scan plane lights up where it cuts through a building
        if (scanY < h) {
          ctx.shadowBlur = 0;
          ctx.strokeStyle = rgba(col, 0.55 * depth);
          ctx.beginPath();
          b.pts.forEach(([x, z], i) => { const p = project(x, scanY, z, W, H); i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); });
          ctx.closePath(); ctx.stroke();
        }
      }
      ctx.shadowBlur = 0;

      // the agent: a beacon rising from the ground
      if (t > 1.2) {
        const p0 = project(0, 0, 0, W, H);
        const tall = target ? target.h + 14 : 18;
        const p1 = project(0, tall, 0, W, H);
        ctx.strokeStyle = rgba(RED, 0.9);
        ctx.lineWidth = 1.5 * dpr;
        ctx.setLineDash([4 * dpr, 4 * dpr]);
        ctx.beginPath(); ctx.moveTo(p0[0], p0[1]); ctx.lineTo(p1[0], p1[1]); ctx.stroke();
        ctx.setLineDash([]);
        const r = (6 + 3 * Math.sin(t * 5)) * dpr;
        ctx.fillStyle = rgba(RED, 0.95);
        ctx.shadowColor = rgba(RED, 1); ctx.shadowBlur = 16 * dpr;
        ctx.beginPath(); ctx.arc(p1[0], p1[1], r, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
        ctx.font = `700 ${13 * dpr}px "Share Tech Mono", monospace`;
        ctx.fillStyle = rgba(RED, 1);
        ctx.fillText(`AGENT ${String(agent).toUpperCase()}`, p1[0] + 12 * dpr, p1[1] + 4 * dpr);
      }
      running = requestAnimationFrame(frame);
    }
    running = requestAnimationFrame(frame);
    root.querySelector(".scan-close").addEventListener("click", close);
    root._cleanup = () => window.removeEventListener("resize", size);
  }

  function close() {
    if (running) cancelAnimationFrame(running);
    running = null;
    const old = document.querySelector(".scan");
    if (old) { old._cleanup?.(); old.remove(); }
  }

  // A made-up neighborhood for trying the scan without real map data
  function sampleBuildings(lat, lng) {
    const kx = Math.cos((lat * Math.PI) / 180) * M_PER_DEG;
    const toLL = (x, z) => [lat + z / M_PER_DEG, lng + x / kx];
    const rect = (cx, cz, w, d, rot = 0) => {
      const c = Math.cos(rot), s = Math.sin(rot);
      return [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]]
        .map(([x, z]) => toLL(cx + x * c - z * s, cz + x * s + z * c));
    };
    const out = [];
    let seed = 7;
    const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
    // houses along streets every 60 m
    for (let row = -3; row <= 3; row++) {
      for (let col = -4; col <= 4; col++) {
        if (row === 1 && col >= 1 && col <= 3) continue; // room for the school
        if (row === 0 && col === 0) continue;            // the agent's house goes here
        const cx = col * 28 + (rnd() - 0.5) * 4, cz = row * 60 + (rnd() < 0.5 ? -14 : 14);
        const levels = rnd() < 0.3 ? 2 : 1;
        out.push({ outline: rect(cx, cz, 11 + rnd() * 5, 9 + rnd() * 4, (rnd() - 0.5) * 0.08), levels, height: levels * 3.2 + 1.5, estimated: true, kind: "house" });
      }
    }
    // an L-shaped school and a couple of apartment blocks
    const L = [[30, 40], [110, 40], [110, 95], [85, 95], [85, 62], [30, 62]].map(([x, z]) => toLL(x, z));
    out.push({ outline: L, levels: 2, height: 9, name: "Elementary School", kind: "school" });
    out.push({ outline: rect(-150, 95, 34, 18, 0.1), levels: 4, height: 14, kind: "apartments" });
    out.push({ outline: rect(-150, -100, 30, 22, -0.05), levels: 3, height: 11, kind: "apartments" });
    // the agent's own house, right at the center
    out.push({ outline: rect(0, 0, 13, 10, 0.03), levels: 2, height: 7.9, estimated: true, kind: "house" });
    return out;
  }

  window.ImfScan = { open, close, sampleBuildings };
})();
