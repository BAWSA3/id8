/* The film, beat by beat. Every wait is on the product's own state (an element
   arriving, a line finishing typing), so the take survives small timing drift. */

import { Puppet, findButton, sleep, waitFor } from "./Puppet";
import type { Take } from "@/lib/film/shim";

export interface FilmOpts {
  boardScreen: React.MutableRefObject<Map<string, { x: number; y: number }>>;
  /* the typewriter multiplier; the film shifts it between lines, never mid-line */
  setTypeSpeed: (v: number) => void;
  onBeat?: (name: string, elapsedMs: number) => void;
}

/* tunables, ms per character unless named otherwise */
export const T = {
  doorSettle: 600,
  tickerChar: 95,
  thesisChar: 4.6,
  firstAnswerChar: 4.2,
  secondAnswerChar: 2.6,
  lateAnswerChar: 1.6,
  firstQuestionHold: 720,
  questionHold: 240,
  lateQuestionHold: 160,
  speed: { read: 3.2, hurry: 5.2 },
  reviewAnimRate: 2.0,
  boardHold: 700,
};

const untilTyped = (text: string) => waitFor(() => document.body.innerText.includes(text), 12000, 80);

/* a smooth scroll that resolves when the page settles */
async function scrollToY(top: number, ms = 520): Promise<void> {
  window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
  await sleep(ms);
}
const yOf = (el: Element) => el.getBoundingClientRect().top + window.scrollY;
const untilOpaque = (el: HTMLElement) => waitFor(() => parseFloat(getComputedStyle(el).opacity) > 0.96 && el, 12000, 60);

export async function runFilm(p: Puppet, take: Take, opts: FilmOpts): Promise<void> {
  const t0 = performance.now();
  const beat = (name: string) => opts.onBeat?.(name, Math.round(performance.now() - t0));

  /* 1 · the door */
  await sleep(T.doorSettle);
  p.show();
  const open = await waitFor(() => findButton(/open the desk/i));
  await p.moveTo(open, 700);
  await sleep(320);
  await p.click(open);
  beat("door");

  /* 2 · the window: name the vehicle, the tape answers live */
  const ticker = await waitFor(() => document.querySelector<HTMLInputElement>('input[aria-label="Ticker"]'));
  await sleep(300);
  await p.moveTo(ticker, 460, 0.12, 0.5);
  await p.click(ticker);
  await sleep(120);
  await p.type(ticker, take.ticker, T.tickerChar);
  const check = await waitFor(() => findButton(/\[ check \]/i));
  await sleep(140);
  await p.moveTo(check, 360);
  await p.click(check);
  beat("window");

  /* 3 · present: the thesis, typed by hand */
  const thesis = await waitFor(() => document.getElementById("id8-input") as HTMLTextAreaElement | null);
  await sleep(260);
  await p.moveTo(thesis, 440, 0.06, 0.18);
  await p.click(thesis);
  await sleep(160);
  /* the cursor drifts out of the way while the words land */
  void p.moveTo(thesis, 900, 0.96, 0.62);
  await p.type(thesis, take.thesis, T.thesisChar);
  await sleep(260);
  const present = await waitFor(() => findButton(/present the play/i));
  await p.moveTo(present, 460);
  await p.click(present);
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
    if (field.getBoundingClientRect().bottom > window.innerHeight - 70) {
      await scrollToY(yOf(field) - window.innerHeight * 0.58, 480);
    }
    await untilTyped(take.qa[i].q);
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
    /* after the second answer the interrogation picks up pace; the board gets the reading speed back */
    if (i === 1) opts.setTypeSpeed(T.speed.hurry);
    if (i === take.qa.length - 1) opts.setTypeSpeed(T.speed.read);
    beat(`q${i + 1}`);
  }

  /* 5 · the contract, on paper */
  const sign = await waitFor(() => findButton(/take it to the board/i));
  /* the contract's lines arrive on staggered delays; the film hurries only those */
  const hurry = setInterval(() => {
    for (const a of document.getAnimations()) {
      if (a instanceof CSSAnimation && a.animationName === "doorin" && a.playbackRate === 1) a.playbackRate = T.reviewAnimRate;
    }
  }, 90);
  /* read from the top of the contract, then down to the signature */
  const header = [...document.querySelectorAll<HTMLElement>("main p")].find((el) => /structured from your words/i.test(el.innerText)) ?? sign;
  await scrollToY(yOf(header) - 96, 460);
  const claim = document.querySelector<HTMLElement>("main p.text-\\[17px\\]") ?? sign;
  await p.moveTo(claim, 520, 0.12, 0.5);
  await sleep(520);
  await scrollToY(yOf(sign) + sign.offsetHeight - window.innerHeight + 72, 520);
  await untilOpaque(sign);
  clearInterval(hurry);
  await sleep(160);
  await p.moveTo(sign, 480);
  await p.click(sign);
  beat("contract");

  /* 6 · the board: the tape lands, a line opens, the evidence fans out */
  const canvas = await waitFor(() => document.querySelector<HTMLCanvasElement>('canvas[aria-label^="the board"]'));
  await sleep(450);
  /* a slow turn while the tape reads */
  await p.moveTo({ x: window.innerWidth * 0.5, y: window.innerHeight * 0.72 }, 420);
  await p.drag(canvas, { x: window.innerWidth * 0.61, y: window.innerHeight * 0.67 }, 760);
  await sleep(220);
  /* wait for the tape to land (the analyst's real line starts typing) */
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
  await sleep(T.boardHold);
  /* the skeptic finishes on the feed before the card */
  await untilTyped(take.challenge.skepticLine.slice(-30));
  await sleep(380);
  p.hide();
  beat("end");
}
