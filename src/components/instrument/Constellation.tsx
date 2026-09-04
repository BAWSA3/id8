"use client";

/* The board: a canvas-rendered 3D map of the play. Still until you drag it,
   scroll to zoom, hover for target brackets, click to lock. Nodes that arrive
   (the tape landing, a line opening) ease in rather than pop. */

import { useEffect, useRef } from "react";
import type { IdeaEdge, IdeaNode } from "@/lib/session";

interface Palette {
  ink: string; muted: string; faint: string; lock: string;
  good: string; bad: string; grid: string; glow: string;
}

interface Props {
  nodes: IdeaNode[];
  edges: IdeaEdge[];
  lockedId: string | null;
  onLock: (id: string) => void;
  onYaw?: (deg: number) => void;
  /* starting zoom — smaller stages (the ruling's side board) start pulled back */
  initialZoom?: number;
}

const DEBRIS_COUNT = 26;
const BORN_MS = 460;

export default function Constellation({ nodes, edges, lockedId, onLock, onYaw, initialZoom = 1 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lockedRef = useRef(lockedId);
  /* the view and the arrival clock persist across scene rebuilds — opening a
     line changes what's on the board, not where you're looking from */
  const viewRef = useRef({ yaw: 0.6, pitch: -0.28, zoom: initialZoom });
  const bornRef = useRef(new Map<string, number>());

  useEffect(() => {
    lockedRef.current = lockedId;
  }, [lockedId]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const cs = getComputedStyle(document.documentElement);
    const pal: Palette = {
      ink: cs.getPropertyValue("--ink").trim(),
      muted: cs.getPropertyValue("--muted").trim(),
      faint: cs.getPropertyValue("--faint").trim(),
      lock: cs.getPropertyValue("--lock").trim(),
      good: cs.getPropertyValue("--good").trim(),
      bad: cs.getPropertyValue("--bad").trim(),
      grid: cs.getPropertyValue("--gridline").trim(),
      glow: cs.getPropertyValue("--glow").trim(),
    };
    const monoFace = cs.getPropertyValue("--mono").trim() || "monospace";

    let W = 0, H = 0;
    const v = viewRef.current;
    let hover: string | null = null;
    let dragging = false, lx = 0, ly = 0, moved = 0;
    let raf = 0;
    const born = bornRef.current;
    const debris = Array.from({ length: DEBRIS_COUNT }, (_, i) => ({
      x: ((i * 97) % 100) / 100, y: ((i * 57) % 100) / 100,
      s: (i % 3) + 1, v: 0.00004 * ((i % 5) + 1),
    }));

    function resize() {
      if (!canvas || !ctx) return;
      const dpr = Math.min(devicePixelRatio || 1, 2);
      W = canvas.clientWidth; H = canvas.clientHeight;
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function project(p: [number, number, number]) {
      const cy = Math.cos(v.yaw), sy = Math.sin(v.yaw);
      const cp = Math.cos(v.pitch), sp = Math.sin(v.pitch);
      const x = p[0] * cy + p[2] * sy;
      let z = -p[0] * sy + p[2] * cy;
      const y = p[1] * cp - z * sp;
      z = p[1] * sp + z * cp;
      const f = 720, s = (f / (f + z)) * v.zoom;
      return { x: W / 2 + x * s, y: H / 2 - 30 + y * s, s, z };
    }

    function drawBrackets(x: number, y: number, r: number, color: string, lw: number) {
      if (!ctx) return;
      const g = r + 7, a = 6;
      ctx.strokeStyle = color; ctx.lineWidth = lw;
      for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) {
        ctx.beginPath();
        ctx.moveTo(x + dx * g, y + dy * g - dy * a);
        ctx.lineTo(x + dx * g, y + dy * g);
        ctx.lineTo(x + dx * g - dx * a, y + dy * g);
        ctx.stroke();
      }
    }

    function frame() {
      if (!ctx) return;
      ctx.clearRect(0, 0, W, H);
      const now = performance.now();

      /* debris */
      ctx.fillStyle = pal.faint;
      for (const d of debris) {
        d.x = (d.x + d.v) % 1;
        ctx.globalAlpha = 0.5;
        ctx.fillRect(d.x * W, d.y * H, d.s, d.s);
        ctx.globalAlpha = 1;
      }

      const P: Record<string, ReturnType<typeof project>> = {};
      for (const n of nodes) P[n.id] = project(n.pos);
      const core = nodes.find((n) => n.kind === "core");
      const c = core ? P[core.id] : { x: W / 2, y: H / 2, s: 1, z: 0 };

      /* arrivals: anything not seen before starts easing in now */
      for (const n of nodes) if (!born.has(n.id)) born.set(n.id, now);
      const ease = (id: string) => {
        const t = Math.min(1, (now - (born.get(id) ?? now)) / BORN_MS);
        return reduced ? 1 : 1 - Math.pow(1 - t, 3);
      };

      /* volumetric glow */
      const gr = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, 170 * c.s);
      gr.addColorStop(0, pal.glow); gr.addColorStop(1, "transparent");
      ctx.fillStyle = gr;
      ctx.fillRect(c.x - 180 * c.s, c.y - 180 * c.s, 360 * c.s, 360 * c.s);

      /* edges */
      for (const e of edges) {
        const A = P[e.from], B = P[e.to];
        if (!A || !B) continue;
        ctx.strokeStyle = e.kind === "supports" ? pal.good : e.kind === "contradicts" || e.kind === "risk" ? pal.bad : pal.faint;
        ctx.lineWidth = 1;
        /* contradicts = evidence on the tape (dashed); risk = an open question, nothing verified yet (dotted, quieter) */
        ctx.setLineDash(e.kind === "contradicts" ? [5, 4] : e.kind === "risk" ? [2, 5] : []);
        ctx.globalAlpha = (e.kind === "risk" ? 0.45 : 0.8) * Math.min(ease(e.from), ease(e.to));
        ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); ctx.stroke();
        ctx.globalAlpha = 1; ctx.setLineDash([]);
      }

      /* labels: front-to-back, each label claims a screen box; a label that
         would land on a claimed box flips to the node's left, then steps down.
         The locked node always keeps its natural place. */
      ctx.font = `10px ${monoFace}`;
      const locked = lockedRef.current;
      const claimed: { x: number; y: number; w: number; h: number }[] = [];
      const labelAt: Record<string, { x: number; y: number; align: "left" | "right" }> = {};
      const charW = 6.1, lineH = 12, boxH = 24;
      const overlaps = (b: { x: number; y: number; w: number; h: number }) =>
        claimed.some((c) => b.x < c.x + c.w && b.x + b.w > c.x && b.y < c.y + c.h && b.y + b.h > c.y);
      for (const n of [...nodes].sort((a, b) => (a.id === locked ? -1 : b.id === locked ? 1 : P[a.id].z - P[b.id].z))) {
        const p = P[n.id], r = (n.kind === "core" ? 10 : 7) * p.s;
        const w = Math.max(n.label.length, n.sub.length) * charW;
        /* right, left, then one and two steps down and up on each side */
        const candidates: { x: number; y: number; align: "left" | "right" }[] = [];
        for (const dy of [0, 1, -1, 2, -2]) {
          candidates.push({ x: p.x + r + 9, y: p.y - 2 + dy * boxH, align: "left" });
          candidates.push({ x: p.x - r - 9, y: p.y - 2 + dy * boxH, align: "right" });
        }
        let pick = candidates[0];
        for (const cnd of candidates) {
          const box = { x: cnd.align === "left" ? cnd.x : cnd.x - w, y: cnd.y - lineH + 2, w, h: boxH };
          if (!overlaps(box)) { pick = cnd; claimed.push(box); break; }
        }
        labelAt[n.id] = pick;
      }

      /* nodes back-to-front */
      for (const n of [...nodes].sort((a, b) => P[b.id].z - P[a.id].z)) {
        const k = ease(n.id);
        const p = P[n.id], r = (n.kind === "core" ? 10 : 7) * p.s * (0.6 + 0.4 * k);
        ctx.globalAlpha = k;
        if (n.kind === "core") {
          ctx.fillStyle = pal.ink;
          ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill();
        } else {
          /* the node wears its verdict: contested red, supported green, held/revised acid */
          const tone = n.dossier.tag.tone;
          ctx.strokeStyle =
            n.kind === "risk" ? pal.bad
            : tone === "contested" ? pal.bad
            : tone === "ok" ? pal.good
            : tone === "lock" ? pal.lock
            : n.kind === "evidence" ? pal.muted : pal.ink;
          ctx.lineWidth = 1;
          if (n.kind === "risk") ctx.setLineDash([3, 3]);
          ctx.strokeRect(p.x - r, p.y - r, r * 2, r * 2);
          ctx.setLineDash([]);
          ctx.fillStyle = pal.ink;
          ctx.fillRect(p.x - 1.5, p.y - 1.5, 3, 3);
        }
        const em = hover === n.id || locked === n.id;
        const L = labelAt[n.id];
        ctx.textAlign = L.align;
        ctx.fillStyle = em ? pal.ink : pal.muted;
        ctx.fillText(n.label, L.x, L.y);
        ctx.fillStyle = pal.faint;
        ctx.fillText(n.sub, L.x, L.y + lineH);
        ctx.textAlign = "left";
        if (L.y !== p.y - 2 || L.align !== "left") {
          /* a displaced label gets a hairline leader back to its node */
          ctx.strokeStyle = pal.faint; ctx.lineWidth = 1; ctx.globalAlpha = 0.6;
          ctx.beginPath(); ctx.moveTo(p.x + (L.align === "left" ? r : -r), p.y); ctx.lineTo(L.x + (L.align === "left" ? -3 : 3), L.y - 3); ctx.stroke();
          ctx.globalAlpha = 1;
        }
        if (locked === n.id) drawBrackets(p.x, p.y, r, pal.lock, 1.6);
        else if (hover === n.id) drawBrackets(p.x, p.y, r, pal.lock, 1);
        ctx.globalAlpha = 1;
      }

      /* axis gizmo */
      const gx = W - 64, gy = H - 52, L = 17;
      const cy2 = Math.cos(v.yaw), sy2 = Math.sin(v.yaw), cp2 = Math.cos(v.pitch), sp2 = Math.sin(v.pitch);
      ctx.strokeStyle = pal.muted; ctx.lineWidth = 1; ctx.fillStyle = pal.muted;
      ctx.font = `8px ${monoFace}`;
      for (const [x, y, z, l] of [[L, 0, 0, "X"], [0, -L, 0, "Y"], [0, 0, L, "Z"]] as const) {
        const rx = x * cy2 + z * sy2, rz = -x * sy2 + z * cy2, ry = y * cp2 - rz * sp2;
        ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx + rx, gy + ry); ctx.stroke();
        ctx.fillText(l, gx + rx * 1.35 - 2, gy + ry * 1.35 + 2);
      }

      onYaw?.(Math.round((((v.yaw * 180) / Math.PI) % 360 + 360) % 360));
      raf = requestAnimationFrame(frame);
    }

    function pick(mx: number, my: number): string | null {
      let best: string | null = null, bd = 22;
      for (const n of nodes) {
        const p = project(n.pos);
        const d = Math.hypot(p.x - mx, p.y - my);
        if (d < bd) { bd = d; best = n.id; }
      }
      return best;
    }

    const onDown = (e: PointerEvent) => {
      dragging = true; moved = 0; lx = e.clientX; ly = e.clientY;
      canvas.classList.add("dragging");
      canvas.setPointerCapture(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      if (dragging) {
        const dx = e.clientX - lx, dy = e.clientY - ly;
        moved += Math.abs(dx) + Math.abs(dy);
        v.yaw += dx * 0.005;
        v.pitch = Math.max(-1.1, Math.min(0.4, v.pitch + dy * 0.004));
        lx = e.clientX; ly = e.clientY;
      } else {
        hover = pick(e.clientX - r.left, e.clientY - r.top);
        canvas.style.cursor = hover ? "pointer" : "grab";
      }
    };
    const onUp = (e: PointerEvent) => {
      dragging = false;
      canvas.classList.remove("dragging");
      if (moved < 6) {
        const r = canvas.getBoundingClientRect();
        const id = pick(e.clientX - r.left, e.clientY - r.top);
        if (id) onLock(id);
      }
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      v.zoom = Math.max(0.6, Math.min(1.6, v.zoom - e.deltaY * 0.0012));
    };

    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("wheel", onWheel, { passive: false });
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("wheel", onWheel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, edges]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 h-full w-full cursor-grab touch-pan-y md:touch-none [&.dragging]:cursor-grabbing"
      aria-label="the board. drag to rotate, click a node to target-lock it"
    />
  );
}
