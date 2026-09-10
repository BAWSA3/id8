/* The puppet: a drawn cursor that glides, clicks, drags and types on a fixed
   timeline. It drives the real components through real DOM events, so what
   the film shows is the product responding, not a mock of it. */

export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export async function waitFor<T>(probe: () => T | null | undefined | false, timeoutMs = 15000, every = 60): Promise<T> {
  const start = performance.now();
  for (;;) {
    const v = probe();
    if (v) return v;
    if (performance.now() - start > timeoutMs) throw new Error("waitFor timed out");
    await sleep(every);
  }
}

export function findButton(re: RegExp): HTMLButtonElement | null {
  return [...document.querySelectorAll<HTMLButtonElement>("button")].find((b) => re.test(b.innerText)) ?? null;
}

/* React reads controlled inputs through the native value setter */
function setNativeValue(el: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, "value")?.set?.call(el, value);
  el.dispatchEvent(new Event("input", { bubbles: true }));
}

type Point = { x: number; y: number };

export class Puppet {
  private el: HTMLDivElement;
  private x = 0;
  private y = 0;

  constructor() {
    this.el = document.createElement("div");
    this.el.setAttribute("aria-hidden", "true");
    this.el.style.cssText =
      "position:fixed;left:0;top:0;z-index:90;pointer-events:none;will-change:transform;opacity:0;transition:opacity .4s";
    this.el.innerHTML =
      '<svg width="22" height="30" viewBox="0 0 22 30" style="display:block;filter:drop-shadow(0 1px 2px rgba(0,0,0,.6))">' +
      '<path d="M2 2 L2 24 L8 18.5 L12 27.5 L15.5 26 L11.5 17 L19.5 17 Z" fill="#e9e4d6" stroke="#0a0a09" stroke-width="1.5" stroke-linejoin="round"/></svg>';
    document.body.appendChild(this.el);
    this.x = window.innerWidth * 0.62;
    this.y = window.innerHeight * 0.78;
    this.place(this.x, this.y);
  }

  private place(x: number, y: number) {
    this.el.style.transform = `translate(${x - 2}px, ${y - 2}px)`;
  }

  show() {
    this.el.style.opacity = "1";
  }
  hide() {
    this.el.style.opacity = "0";
  }
  destroy() {
    this.el.remove();
  }

  at(): Point {
    return { x: this.x, y: this.y };
  }

  /* a point on an element: center by default, or a fraction of its box */
  static pointOn(el: Element, fx = 0.5, fy = 0.5): Point {
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width * fx, y: r.top + r.height * fy };
  }

  async moveTo(target: Element | Point, ms = 600, fx = 0.5, fy = 0.5): Promise<void> {
    const to = target instanceof Element ? Puppet.pointOn(target, fx, fy) : target;
    const from = { x: this.x, y: this.y };
    const anim = this.el.animate(
      [{ transform: `translate(${from.x - 2}px, ${from.y - 2}px)` }, { transform: `translate(${to.x - 2}px, ${to.y - 2}px)` }],
      { duration: ms, easing: "cubic-bezier(.3,.05,.15,1)", fill: "forwards" }
    );
    /* hover as it travels, so the target primes before the click */
    const hoverAt = setInterval(() => {
      const r = anim.currentTime as number;
      const t = Math.min(1, r / ms);
      const e = 1 - Math.pow(1 - t, 3);
      const p = { x: from.x + (to.x - from.x) * e, y: from.y + (to.y - from.y) * e };
      const under = document.elementFromPoint(p.x, p.y);
      under?.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, clientX: p.x, clientY: p.y, pointerId: 1 }));
    }, 40);
    await anim.finished;
    clearInterval(hoverAt);
    anim.commitStyles();
    anim.cancel();
    this.x = to.x;
    this.y = to.y;
    this.place(to.x, to.y);
    if (target instanceof Element) {
      target.dispatchEvent(new MouseEvent("mouseover", { bubbles: true, relatedTarget: document.body }));
    }
  }

  private ripple() {
    const r = document.createElement("div");
    r.style.cssText = `position:fixed;left:${this.x - 14}px;top:${this.y - 14}px;width:28px;height:28px;border-radius:50%;border:1.5px solid #cfff2e;z-index:89;pointer-events:none;opacity:.9`;
    document.body.appendChild(r);
    r.animate([{ transform: "scale(.3)", opacity: 0.9 }, { transform: "scale(1.7)", opacity: 0 }], {
      duration: 520,
      easing: "cubic-bezier(.2,.6,.3,1)",
    }).finished.then(() => r.remove());
  }

  private press(): Promise<void> {
    return this.el
      .animate([{ scale: "1" }, { scale: ".82" }, { scale: "1" }], { duration: 180, easing: "ease-out" })
      .finished.then(() => undefined);
  }

  /* click a real element: buttons get click(), fields get focus */
  async click(el: HTMLElement): Promise<void> {
    this.ripple();
    const p = this.press();
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) el.focus();
    else el.click();
    await p;
  }

  /* pointer down and up at the cursor's point, for canvases that hit-test */
  async tap(el: Element): Promise<void> {
    this.ripple();
    const p = this.press();
    const init = { bubbles: true, clientX: this.x, clientY: this.y, pointerId: 1, isPrimary: true };
    el.dispatchEvent(new PointerEvent("pointerdown", init));
    await sleep(60);
    el.dispatchEvent(new PointerEvent("pointerup", init));
    await p;
  }

  /* press at the current point and glide to another, firing moves along the way */
  async drag(el: Element, to: Point, ms = 800): Promise<void> {
    const from = { x: this.x, y: this.y };
    el.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, clientX: from.x, clientY: from.y, pointerId: 1, isPrimary: true }));
    const anim = this.el.animate(
      [{ transform: `translate(${from.x - 2}px, ${from.y - 2}px)` }, { transform: `translate(${to.x - 2}px, ${to.y - 2}px)` }],
      { duration: ms, easing: "cubic-bezier(.35,.05,.2,1)", fill: "forwards" }
    );
    const start = performance.now();
    await new Promise<void>((resolve) => {
      const tick = () => {
        const t = Math.min(1, (performance.now() - start) / ms);
        const e = 1 - Math.pow(1 - t, 3);
        const p = { x: from.x + (to.x - from.x) * e, y: from.y + (to.y - from.y) * e };
        el.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, clientX: p.x, clientY: p.y, pointerId: 1, isPrimary: true }));
        if (t < 1) requestAnimationFrame(tick);
        else resolve();
      };
      requestAnimationFrame(tick);
    });
    await anim.finished;
    anim.commitStyles();
    anim.cancel();
    this.x = to.x;
    this.y = to.y;
    this.place(to.x, to.y);
    el.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, clientX: to.x, clientY: to.y, pointerId: 1, isPrimary: true }));
  }

  /* type into a controlled field. paced by the clock, not by timer ticks, so a
     line takes exactly text.length * msPerChar however the browser clamps timers */
  async type(el: HTMLInputElement | HTMLTextAreaElement, text: string, msPerChar = 8): Promise<void> {
    el.focus();
    const base = el.value;
    const start = performance.now();
    const total = text.length * msPerChar;
    let shown = 0;
    while (shown < text.length) {
      await sleep(Math.max(8, Math.min(msPerChar, 24)));
      const n = Math.min(text.length, Math.floor(((performance.now() - start) / total) * text.length));
      if (n > shown) {
        shown = n;
        setNativeValue(el, base + text.slice(0, shown));
      }
    }
  }

  key(el: Element, key: string, mods: { metaKey?: boolean; ctrlKey?: boolean } = {}) {
    el.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, ...mods }));
  }
}
