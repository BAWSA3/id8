"use client";

/* The Cockpit centerpiece: a canvas-rendered 3D constellation of the idea.
   Drag to rotate, scroll to zoom, hover for target brackets, click to lock. */

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
}

const AUTO_ROT = 0.0028;
const DEBRIS_COUNT = 26;

export default function Constellation({ nodes, edges, lockedId, onLock, onYaw }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lockedRef = useRef(lockedId);

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
    let yaw = 0.6, pitch = -0.28, zoom = 1;
    let hover: string | null = null;
    let dragging = false, lx = 0, ly = 0, moved = 0;
    let raf = 0;
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
      const cy = Math.cos(yaw), sy = Math.sin(yaw);
      const cp = Math.cos(pitch), sp = Math.sin(pitch);
      const x = p[0] * cy + p[2] * sy;
      let z = -p[0] * sy + p[2] * cy;
      const y = p[1] * cp - z * sp;
      z = p[1] * sp + z * cp;
      const f = 720, s = (f / (f + z)) * zoom;
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
      if (!dragging && !reduced) yaw += AUTO_ROT;
      ctx.clearRect(0, 0, W, H);

      /* grid */
      ctx.strokeStyle = pal.grid; ctx.lineWidth = 1;
      const gs = 46;
      for (let x = (W / 2) % gs; x < W; x += gs) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      for (let y = (H / 2) % gs; y < H; y += gs) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

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

      /* floating disc under core */
      ctx.strokeStyle = pal.faint; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(c.x, c.y + 120 * c.s, 150 * c.s, 34 * c.s, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = pal.lock; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(c.x, c.y + 120 * c.s, 150 * c.s, 34 * c.s, 0, Math.PI * 0.42, Math.PI * 0.58); ctx.stroke();

      /* volumetric glow */
      const gr = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, 170 * c.s);
      gr.addColorStop(0, pal.glow); gr.addColorStop(1, "transparent");
      ctx.fillStyle = gr;
      ctx.fillRect(c.x - 180 * c.s, c.y - 180 * c.s, 360 * c.s, 360 * c.s);

      /* edges */
      for (const e of edges) {
        const A = P[e.from], B = P[e.to];
        if (!A || !B) continue;
        ctx.strokeStyle = e.kind === "supports" ? pal.good : e.kind === "contradicts" ? pal.bad : pal.faint;
        ctx.lineWidth = 1;
        ctx.setLineDash(e.kind === "contradicts" ? [5, 4] : []);
        ctx.globalAlpha = 0.8;
        ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); ctx.stroke();
        ctx.globalAlpha = 1; ctx.setLineDash([]);
      }

      /* nodes back-to-front */
      ctx.font = `10px ${monoFace}`;
      const locked = lockedRef.current;
      for (const n of [...nodes].sort((a, b) => P[b.id].z - P[a.id].z)) {
        const p = P[n.id], r = (n.kind === "core" ? 10 : 7) * p.s;
        if (n.kind === "core") {
          ctx.fillStyle = pal.ink;
          ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill();
        } else {
          ctx.strokeStyle = n.kind === "risk" ? pal.bad : n.kind === "evidence" ? pal.muted : pal.ink;
          ctx.lineWidth = 1;
          if (n.kind === "risk") ctx.setLineDash([3, 3]);
          ctx.strokeRect(p.x - r, p.y - r, r * 2, r * 2);
          ctx.setLineDash([]);
          ctx.fillStyle = pal.ink;
          ctx.fillRect(p.x - 1.5, p.y - 1.5, 3, 3);
        }
        const em = hover === n.id || locked === n.id;
        ctx.fillStyle = em ? pal.ink : pal.muted;
        ctx.fillText(n.label, p.x + r + 9, p.y - 2);
        ctx.fillStyle = pal.faint;
        ctx.fillText(n.sub, p.x + r + 9, p.y + 10);
        if (locked === n.id) drawBrackets(p.x, p.y, r, pal.lock, 1.6);
        else if (hover === n.id) drawBrackets(p.x, p.y, r, pal.lock, 1);
      }

      /* axis gizmo */
      const gx = W - 64, gy = H - 52, L = 17;
      const cy2 = Math.cos(yaw), sy2 = Math.sin(yaw), cp2 = Math.cos(pitch), sp2 = Math.sin(pitch);
      ctx.strokeStyle = pal.muted; ctx.lineWidth = 1; ctx.fillStyle = pal.muted;
      ctx.font = `8px ${monoFace}`;
      for (const [x, y, z, l] of [[L, 0, 0, "X"], [0, -L, 0, "Y"], [0, 0, L, "Z"]] as const) {
        const rx = x * cy2 + z * sy2, rz = -x * sy2 + z * cy2, ry = y * cp2 - rz * sp2;
        ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx + rx, gy + ry); ctx.stroke();
        ctx.fillText(l, gx + rx * 1.35 - 2, gy + ry * 1.35 + 2);
      }

      onYaw?.(Math.round((((yaw * 180) / Math.PI) % 360 + 360) % 360));
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
        yaw += dx * 0.005;
        pitch = Math.max(-1.1, Math.min(0.4, pitch + dy * 0.004));
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
      zoom = Math.max(0.6, Math.min(1.6, zoom - e.deltaY * 0.0012));
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
      aria-label="the board — drag to rotate, click a node to target-lock it"
    />
  );
}
