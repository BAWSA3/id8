/* The camera: a scripted push-in on the stage. The stage is a viewport-sized
   box wrapping the product; scaling it around a target is the whole trick.
   Fixed elements inside the stage position against the stage, so the door,
   the captions and the horizon all zoom together. The cursor lives outside. */

import { sleep } from "./Puppet";

export class Camera {
  s = 1;
  tx = 0;
  ty = 0;
  constructor(private el: HTMLElement) {
    el.style.transformOrigin = "0 0";
    el.style.willChange = "transform";
    this.apply(0);
  }
  private apply(ms: number) {
    this.el.style.transition = ms ? `transform ${ms}ms cubic-bezier(.4,.05,.2,1)` : "none";
    this.el.style.transform = `translate(${this.tx}px, ${this.ty}px) scale(${this.s})`;
  }
  /* frame a target (an element, or a screen point with an optional box) at a scale;
     the frame never shows past the stage's edges */
  async to(target: Element | { x: number; y: number; w?: number; h?: number }, scale: number, ms = 900): Promise<void> {
    const r =
      target instanceof Element
        ? target.getBoundingClientRect()
        : { left: target.x, top: target.y, width: target.w ?? 0, height: target.h ?? 0 };
    /* the target's rect is in screen space (already transformed); undo the current camera */
    const ux = (r.left - this.tx) / this.s, uy = (r.top - this.ty) / this.s;
    const uw = r.width / this.s, uh = r.height / this.s;
    const cx = ux + uw / 2, cy = uy + uh / 2;
    const vw = innerWidth, vh = innerHeight;
    this.s = scale;
    this.tx = Math.min(0, Math.max(vw - vw * scale, vw / 2 - cx * scale));
    this.ty = Math.min(0, Math.max(vh - vh * scale, vh / 2 - cy * scale));
    this.apply(ms);
    await sleep(ms);
  }
  async reset(ms = 800): Promise<void> {
    this.s = 1;
    this.tx = 0;
    this.ty = 0;
    this.apply(ms);
    await sleep(ms);
  }
}
