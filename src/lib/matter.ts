/* Matter: the poster surfaces' texture, drawn on canvas. Client-safe, no React.
   Stone renders the eclipse as a lit body (raking light, hard terminator, ridged
   surface). Drift is a blurred form crossing the frame. Grain is live film noise.
   Instrument surfaces never use these; they keep the ordered dither. */

function makeNoise(seed: number) {
  const perm = new Uint8Array(512);
  let s = seed >>> 0;
  const rnd = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
  const p = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [p[i], p[j]] = [p[j], p[i]];
  }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
  const lerp = (a: number, b: number, t: number) => a + t * (b - a);
  const grad = (h: number, x: number, y: number) => (h & 1 ? -x : x) + (h & 2 ? -y : y);
  return (x: number, y: number) => {
    const X = Math.floor(x) & 255, Y = Math.floor(y) & 255;
    x -= Math.floor(x); y -= Math.floor(y);
    const u = fade(x), v = fade(y);
    const a = perm[X] + Y, b = perm[X + 1] + Y;
    return lerp(
      lerp(grad(perm[a], x, y), grad(perm[b], x - 1, y), u),
      lerp(grad(perm[a + 1], x, y - 1), grad(perm[b + 1], x - 1, y - 1), u),
      v
    );
  };
}
const noise = makeNoise(8);
const fbm = (x: number, y: number, oct: number) => {
  let v = 0, a = 0.5, f = 1;
  for (let i = 0; i < oct; i++) {
    v += a * noise(x * f, y * f);
    a *= 0.5;
    f *= 2.03;
  }
  return v;
};

export const reducedMotion = () =>
  typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;

/* the eclipse as a body. anchor and radius are fractions of the canvas width
   (anchor y of the height); the body may sit off frame. */
export function renderStone(canvas: HTMLCanvasElement, anchor: [number, number], radiusFrac: number, maxWidth = 720) {
  const W = canvas.clientWidth, H = canvas.clientHeight;
  if (!W || !H) return;
  const scale = Math.min(1, maxWidth / W);
  const w = Math.round(W * scale), h = Math.round(H * scale);
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const img = ctx.createImageData(w, h);
  const d = img.data;
  const cx = anchor[0] * w, cy = anchor[1] * h, R = radiusFrac * w;
  const lx = -0.72, ly = -0.58, lz = 0.36, ll = Math.hypot(lx, ly, lz);
  const Lx = lx / ll, Ly = ly / ll, Lz = lz / ll;
  const x0 = Math.max(0, Math.floor(cx - R)), x1 = Math.min(w, Math.ceil(cx + R));
  const y0 = Math.max(0, Math.floor(cy - R)), y1 = Math.min(h, Math.ceil(cy + R));
  for (let i = 0; i < d.length; i += 4) { d[i] = 10; d[i + 1] = 10; d[i + 2] = 9; d[i + 3] = 255; }
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const dx = (x - cx) / R, dy = (y - cy) / R, rr = dx * dx + dy * dy;
      if (rr >= 1) continue;
      const dz = Math.sqrt(1 - rr);
      /* ridged noise reads as rock: creases and facets, not blobs */
      const r1 = 1 - Math.abs(fbm(dx * 2.6 + 7, dy * 2.6 + 3, 4));
      const r2 = 1 - Math.abs(fbm(dx * 7 + 1, dy * 7 + 5, 3));
      const b = (r1 - 0.5) * 0.9 + (r2 - 0.5) * 0.35;
      const nx = dx + b * 0.38, ny = dy + b * 0.38, nz = dz + Math.abs(b) * 0.15;
      const nl = Math.hypot(nx, ny, nz);
      const lambert = Math.max(0, (nx * Lx + ny * Ly + nz * Lz) / nl);
      const t = Math.pow(lambert, 2.2);
      const band = t > 0.8 ? 0.92 : t > 0.55 ? 0.56 : t > 0.3 ? 0.3 : t > 0.12 ? 0.14 : 0.05;
      const tex = 0.72 + (1 - Math.abs(fbm(dx * 13 + 9, dy * 13 + 2, 4))) * 0.5;
      let v = Math.min(1, band * tex) * 0.82;
      v *= 1 - Math.pow(rr, 5) * 0.85; // rim darkening: the body sits in the black
      const i = (y * w + x) * 4;
      d[i] = Math.max(10, Math.round(233 * v));
      d[i + 1] = Math.max(10, Math.round(228 * v));
      d[i + 2] = Math.max(9, Math.round(214 * v));
    }
  }
  ctx.putImageData(img, 0, 0);
}

/* a blurred form entering from the right, slowly moving. t in ms. */
export function drawDrift(canvas: HTMLCanvasElement, t: number, maxWidth = 480) {
  const W = canvas.clientWidth, H = canvas.clientHeight;
  if (!W || !H) return;
  const w = Math.round(Math.min(W, maxWidth)), h = Math.max(1, Math.round((w * H) / W));
  if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.fillStyle = "#0a0a09";
  ctx.fillRect(0, 0, w, h);
  ctx.filter = `blur(${Math.round(w * 0.07)}px)`;
  const ox = Math.sin(t * 0.00021) * w * 0.03, oy = Math.cos(t * 0.00017) * h * 0.04;
  const blob = (x: number, y: number, rx: number, ry: number, a: number) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, rx);
    g.addColorStop(0, `rgba(233,228,214,${a})`);
    g.addColorStop(0.55, `rgba(233,228,214,${a * 0.45})`);
    g.addColorStop(1, "rgba(233,228,214,0)");
    ctx.save();
    ctx.translate(x, y); ctx.scale(1, ry / rx); ctx.translate(-x, -y);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, rx, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  };
  blob(w * 0.86 + ox, h * 0.48 + oy, w * 0.46, h * 0.78, 0.62);
  blob(w * 0.66 + ox * 0.6, h * 0.18 + oy, w * 0.22, h * 0.3, 0.38);
  blob(w * 1.02 + ox, h * 0.92, w * 0.34, h * 0.5, 0.5);
  ctx.filter = "none";
  const g2 = ctx.createLinearGradient(w * 0.55, 0, w * 0.95, 0);
  g2.addColorStop(0, "rgba(10,10,9,.9)");
  g2.addColorStop(0.42, "rgba(10,10,9,0)");
  g2.addColorStop(1, "rgba(10,10,9,.45)");
  ctx.fillStyle = g2;
  ctx.fillRect(0, 0, w, h);
}

/* one frame of film grain. strength 0..1 */
export function grainFrame(canvas: HTMLCanvasElement, strength: number, maxWidth = 560) {
  const W = canvas.clientWidth, H = canvas.clientHeight;
  if (!W || !H) return;
  const w = Math.round(Math.min(W, maxWidth)), h = Math.max(1, Math.round((w * H) / W));
  if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const img = ctx.createImageData(w, h);
  const d = img.data;
  const amp = 255 * strength;
  for (let i = 0; i < d.length; i += 4) {
    const n = 128 + (Math.random() - 0.5) * amp;
    d[i] = d[i + 1] = d[i + 2] = n;
    d[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
}
