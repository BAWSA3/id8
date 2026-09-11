/* The film, beat by beat. Every wait is on the product's own state (an element
   arriving, a line finishing typing), so the take survives small timing drift.
   The camera pushes in where the viewer should look and pulls back for the room. */

import { Puppet, findButton, sleep, waitFor } from "./Puppet";
import type { Camera } from "./Camera";
import type { Take } from "@/lib/film/shim";

export interface FilmOpts {
  boardScreen: React.MutableRefObject<Map<string, { x: number; y: number }>>;
  /* the typewriter multiplier; the film shifts it between lines, never mid-line */
  setTypeSpeed: (v: number) => void;
  camera: Camera;
  /* the stage scrolls inside this box, not the window */
  scroller: HTMLElement;
  /* the desk replaces the session when the play goes on the book */
  openDesk: () => void;
  onBeat?: (name: string, elapsedMs: number) => void;
}

/* tunables, ms per character unless named otherwise */
export const T = {
  doorHold: 1600,
  addressChar: 11,
  tickerChar: 95,
  thesisChar: 4.2,
  firstAnswerChar: 3.4,
  secondAnswerChar: 1.8,
  lateAnswerChar: 1.1,
  firstQuestionHold: 500,
  questionHold: 160,
  lateQuestionHold: 100,
  reasonChar: 2.2,
  speed: { read: 3.2, hurry: 5.2 },
  reviewAnimRate: 2.0,
  boardHold: 400,
  dossierHold: 800,
  deskHold: 1100,
  endHold: 400,
  zoom: { door: 1.08, window: 1.7, thesis: 1.28, question: 1.42, dossier: 1.55, ruling: 1.28, watch: 1.5 },
};

const untilTyped = (text: string) => waitFor(() => document.body.innerText.includes(text), 15000, 80);
const untilOpaque = (el: HTMLElement) => waitFor(() => parseFloat(getComputedStyle(el).opacity) > 0.96 && el, 12000, 60);
const findButtons = (re: RegExp) => [...document.querySelectorAll<HTMLButtonElement>("button")].filter((b) => re.test(b.innerText));

/* hurry the contract's entrance animations only (never the cursor's) */
function hurry(rate: number) {
  return setInterval(() => {
    for (const a of document.getAnimations()) {
      if (a instanceof CSSAnimation && a.animationName === "doorin" && a.playbackRate === 1) a.playbackRate = rate;
    }
  }, 90);
}

export async function runFilm(p: Puppet, take: Take, opts: FilmOpts): Promise<void> {
  const { camera: cam, scroller } = opts;
  const t0 = performance.now();
  const beat = (name: string) => opts.onBeat?.(name, Math.round(performance.now() - t0));
  /* y inside the scroller, undoing the camera */
  const yOf = (el: Element) => (el.getBoundingClientRect().top - cam.ty) / cam.s + scroller.scrollTop;
  const scrollToY = async (top: number, ms = 520) => {
    scroller.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
    await sleep(ms);
  };
  const top = () => scroller.scrollTo({ top: 0 });

  /* 1 · the door: the body first, then the cursor */
  void cam.to({ x: innerWidth * 0.84, y: innerHeight * 0.5 }, T.zoom.door, T.doorHold);
  await sleep(T.doorHold - 600);
  p.show();
  const open = await waitFor(() => findButton(/open the desk/i));
  await p.moveTo(open, 700);
  await sleep(320);
  await p.click(open);
  void cam.reset(900);
  beat("door");

  /* 2 · the window: name the vehicle, the tape answers live */
  const ticker = await waitFor(() => document.querySelector<HTMLInputElement>('input[aria-label="Ticker"]'));
  const dialog = ticker.closest(".pixel-box") ?? ticker;
  await sleep(200);
  void cam.to(dialog, T.zoom.window, 900);
  if (take.vehicle?.address) {
    /* a fresh launch is named by its contract: switch the window, paste the address */
    const contract = await waitFor(() => findButton(/\[ contract \]/i));
    await p.moveTo(contract, 600);
    await p.click(contract);
    const field = await waitFor(() => document.querySelector<HTMLInputElement>('input[aria-label="Contract address"]'));
    await sleep(120);
    await p.moveTo(field, 320, 0.12, 0.5);
    await p.click(field);
    await sleep(100);
    await p.type(field, take.vehicle.address, T.addressChar);
  } else {
    await p.moveTo(ticker, 700, 0.12, 0.5);
    await p.click(ticker);
    await sleep(120);
    await p.type(ticker, take.ticker, T.tickerChar);
  }
  const check = await waitFor(() => findButton(/\[ check \]/i));
  await sleep(140);
  await p.moveTo(check, 360);
  await p.click(check);
  beat("window");
  await waitFor(() => /found ·/i.test(document.body.innerText), 15000, 80);
  beat("found");

  /* 3 · present: the thesis, typed by hand */
  const thesis = await waitFor(() => document.getElementById("id8-input") as HTMLTextAreaElement | null);
  void cam.reset(700);
  await sleep(400);
  void cam.to(thesis, T.zoom.thesis, 900);
  await p.moveTo(thesis, 500, 0.06, 0.18);
  await p.click(thesis);
  await sleep(160);
  /* the cursor drifts out of the way while the words land */
  void p.moveTo(thesis, 900, 0.96, 0.62);
  await p.type(thesis, take.thesis, T.thesisChar);
  await sleep(260);
  const present = await waitFor(() => findButton(/present the play/i));
  await p.moveTo(present, 460);
  await p.click(present);
  void cam.reset(700);
  beat("present");

  /* 4 · clarify: four questions, answered in the trader's words */
  let lastField: HTMLTextAreaElement | null = null;
  for (let i = 0; i < take.qa.length; i++) {
    /* the field for this question is a new element; never the one just sent */
    const field = await waitFor(() => {
      const f = document.querySelector<HTMLTextAreaElement>('textarea[aria-label="Your answer"]');
      return f && f !== lastField && f.isConnected ? f : null;
    });
    lastField = field;
    /* deeper questions sit low on the page; the desk scrolls the way a reader would */
    if (field.getBoundingClientRect().bottom > innerHeight - 70) {
      await scrollToY(yOf(field) - innerHeight * 0.58, 480);
    }
    await untilTyped(take.qa[i].q);
    if (i === 0) {
      const block = field.parentElement ?? field;
      void cam.to(block, T.zoom.question, 800);
    }
    await sleep(i === 0 ? T.firstQuestionHold : i === 1 ? T.questionHold : T.lateQuestionHold);
    if (i === 0) {
      await p.moveTo(field, 440, 0.08, 0.3);
      await p.click(field);
      await sleep(140);
    } else {
      await p.moveTo(field, 220, 0.08, 0.3);
      field.focus();
    }
    void p.moveTo(field, 700, 0.97, 0.7);
    await p.type(field, take.qa[i].a, i === 0 ? T.firstAnswerChar : i === 1 ? T.secondAnswerChar : T.lateAnswerChar);
    await sleep(120);
    p.key(field, "Enter", { metaKey: true });
    if (i === 0) void cam.reset(800);
    /* after the second answer the interrogation picks up pace; the board gets the reading speed back */
    if (i === 1) opts.setTypeSpeed(T.speed.hurry);
    if (i === take.qa.length - 1) opts.setTypeSpeed(T.speed.read);
    beat(`q${i + 1}`);
  }

  /* 5 · the contract, on paper */
  const sign = await waitFor(() => findButton(/take it to the board/i));
  const h1 = hurry(T.reviewAnimRate);
  const header = [...document.querySelectorAll<HTMLElement>("main p")].find((el) => /structured from your words/i.test(el.innerText)) ?? sign;
  await scrollToY(yOf(header) - 96, 380);
  const claim = document.querySelector<HTMLElement>("main p.text-\\[17px\\]") ?? sign;
  await p.moveTo(claim, 460, 0.12, 0.5);
  await sleep(380);
  await scrollToY(yOf(sign) + sign.offsetHeight - innerHeight + 72, 440);
  await untilOpaque(sign);
  clearInterval(h1);
  await sleep(160);
  await p.moveTo(sign, 480);
  await p.click(sign);
  top();
  beat("contract");

  /* 6 · the board: the tape lands, a line opens, the evidence fans out */
  const canvas = await waitFor(() => document.querySelector<HTMLCanvasElement>('canvas[aria-label^="the board"]'));
  await sleep(450);
  await p.moveTo({ x: innerWidth * 0.5, y: innerHeight * 0.72 }, 420);
  await p.drag(canvas, { x: innerWidth * 0.61, y: innerHeight * 0.67 }, 760);
  await sleep(220);
  await untilTyped(take.challenge.analystLine.slice(0, 24));
  await sleep(350);
  const a4 = await waitFor(() => opts.boardScreen.current.get("a4"));
  await p.moveTo(a4, 560);
  await p.tap(canvas);
  beat("line open");
  await sleep(620);
  const ev = await waitFor(() => {
    for (const [id, pt] of opts.boardScreen.current) if (id.startsWith("ev")) return pt;
    return null;
  });
  await p.moveTo(ev, 460);
  await p.tap(canvas);
  beat("evidence");
  /* the rows the tape found, up close */
  const dossier = [...document.querySelectorAll<HTMLElement>("section")].find((s) => /target lock/i.test(s.innerText));
  if (dossier) {
    await cam.to(dossier, T.zoom.dossier, 900);
    beat("dossier");
    await sleep(T.dossierHold);
    await cam.reset(700);
  } else {
    await sleep(T.boardHold);
  }
  /* the skeptic's first line is enough on screen; the ruling shows the rest */
  await untilTyped(take.challenge.skepticLine.slice(0, 40));
  await sleep(200);
  const rule = await waitFor(() => findButton(/make the ruling/i));
  await p.moveTo(rule, 520);
  await p.click(rule);
  top();
  beat("ruling");

  /* 7 · the ruling: hold the first contested line with a reason, cut the rest, name the book */
  const book = await waitFor(() => findButton(/put it on the book/i));
  await sleep(500);
  const holds = findButtons(/\[ hold \]/i);
  const rows = holds.map((b) => b.closest<HTMLElement>(".group")).filter((r): r is HTMLElement => Boolean(r));
  if (rows[0]) {
    await scrollToY(yOf(rows[0]) - innerHeight * 0.3, 420);
    void cam.to(rows[0], T.zoom.ruling, 800);
    const hold = rows[0].querySelector<HTMLButtonElement>("button");
    const holdBtn = [...rows[0].querySelectorAll<HTMLButtonElement>("button")].find((b) => /\[ hold \]/i.test(b.innerText)) ?? hold;
    if (holdBtn) {
      await p.moveTo(holdBtn, 500);
      await p.click(holdBtn);
      const why = await waitFor(() => document.querySelector<HTMLTextAreaElement>('textarea[aria-label^="Why you hold"]'));
      await sleep(180);
      await p.moveTo(why, 300, 0.08, 0.4);
      why.focus();
      void p.moveTo(why, 600, 0.96, 0.7);
      await p.type(why, take.holdReason ?? "the level is the tell, not the flows. a fresh narrative lags the cohorts.", T.reasonChar);
    }
    for (const row of rows.slice(1)) {
      const cut = [...row.querySelectorAll<HTMLButtonElement>("button")].find((b) => /\[ cut \]/i.test(b.innerText));
      if (!cut) continue;
      await p.moveTo(cut, 320);
      await p.click(cut);
      await sleep(160);
    }
    void cam.reset(700);
  }
  await scrollToY(yOf(book) + book.offsetHeight - innerHeight + 72, 520);
  await waitFor(() => !book.disabled && book);
  await p.moveTo(book, 480);
  await p.click(book);
  top();
  beat("book");

  /* 8 · commit: the doc, then the desk */
  const openDesk = await waitFor(() => document.querySelector<HTMLAnchorElement>('a[href="/desk"]'));
  const h2 = hurry(T.reviewAnimRate);
  await scrollToY(yOf(openDesk) - innerHeight * 0.55, 480);
  await untilOpaque(openDesk);
  clearInterval(h2);
  await sleep(240);
  await p.moveTo(openDesk, 520);
  await p.click(openDesk);
  opts.openDesk();
  top();
  beat("desk");

  /* 9 · the desk: the book, the token live, the watch reading the tape */
  const watch = await waitFor(() => [...document.querySelectorAll<HTMLElement>("section")].find((s) => /^the watch/i.test(s.innerText.trim())) ?? null);
  await waitFor(() => /breached|holding|unwatched/i.test(watch.innerText) && watch, 15000, 120);
  await sleep(500);
  await p.moveTo(watch, 520, 0.5, 0.35);
  await cam.to(watch, T.zoom.watch, 900);
  beat("watch");
  await sleep(T.deskHold);
  /* the card fades in over the zoomed desk; no pull back needed */
  await sleep(T.endHold);
  p.hide();
  beat("end");
}
