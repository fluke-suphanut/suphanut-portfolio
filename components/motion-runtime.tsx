"use client";
// One small runtime per page for the shared motion rules (design/00-shared.md section 7):
// - reveal: `[data-reveal]` gets `.is-in` once when it enters the viewport; CSS hides it only under `html.motion-ok`.
// - count-up: `[data-count]` animates from 0 to the value already in the HTML.
// - scrub (optional): `[data-scrub]` gets `--p` (0..1) from its scroll position; CSS maps it to transforms.
// - loops: `[data-loop]` gets `.is-visible` while on screen so CSS loops pause off screen.
// - nav: `aria-current` on the anchor of the section in the middle of the screen, `.is-scrolled` on the nav.
// `html.motion-ok` is set before first paint by the inline script in app/layout.tsx and only when
// `prefers-reduced-motion: no-preference`. Switching to `reduce` mid-visit stops everything here.
import { useEffect } from "react";

const EASE_OUT = (t: number) => 1 - Math.pow(1 - t, 4); // close to cubic-bezier(0.16, 1, 0.3, 1)
export const MOTION_STOP_EVENT = "motion-stop";

export function motionAllowed() {
  return document.documentElement.classList.contains("motion-ok");
}

export default function MotionRuntime({ scrub = false }: { scrub?: boolean }) {
  useEffect(() => {
    const root = document.documentElement;
    const mq = window.matchMedia("(prefers-reduced-motion: no-preference)");
    if (mq.matches) root.classList.add("motion-ok");
    else root.classList.remove("motion-ok");
    root.classList.add("motion-ready");

    const cleanups: (() => void)[] = [];
    const frames = new Set<number>();
    const timers = new Set<number>();

    // ---- count-up
    const counted = new WeakSet<Element>();
    // Count-ups write into the one existing text node. Replacing it (textContent =) creates a new
    // node per frame, and Chrome counts every new text node as a fresh LCP candidate (AC5).
    const textNode = (el: HTMLElement) => {
      if (!(el.firstChild instanceof Text) || el.childNodes.length > 1) el.textContent = el.textContent ?? "";
      return el.firstChild as Text;
    };
    const finishCount = (el: HTMLElement) => {
      if (el.dataset.final !== undefined) textNode(el).nodeValue = el.dataset.final;
      el.closest("[data-count-host]")?.classList.add("is-counted");
    };
    const runCount = (el: HTMLElement) => {
      if (counted.has(el)) return;
      counted.add(el);
      const final = el.textContent ?? "";
      el.dataset.final = final;
      const m = final.match(/^([^\d]*)(\d[\d,]*(?:\.\d+)?)(.*)$/);
      const target = m ? Number(m[2].replace(/,/g, "")) : NaN;
      if (!motionAllowed() || !m || !target) return finishCount(el);
      const decimals = m[2].split(".")[1]?.length ?? 0;
      const grouped = m[2].includes(",");
      const fmt = (v: number) =>
        grouped
          ? v.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
          : v.toFixed(decimals);
      const duration = Number(el.dataset.countDuration ?? 1000);
      const delay = Number(el.dataset.countDelay ?? 0);
      const node = textNode(el);
      node.nodeValue = m[1] + fmt(0) + m[3];
      const start = () => {
        const t0 = performance.now();
        const tick = (now: number) => {
          if (!motionAllowed()) return finishCount(el);
          const t = Math.min(1, (now - t0) / duration);
          node.nodeValue = t < 1 ? m[1] + fmt(target * EASE_OUT(t)) + m[3] : final;
          if (t < 1) frames.add(requestAnimationFrame(tick));
          else finishCount(el);
        };
        frames.add(requestAnimationFrame(tick));
      };
      timers.add(window.setTimeout(start, delay));
    };
    document.querySelectorAll<HTMLElement>('[data-count="load"]').forEach(runCount);

    // ---- reveal (once) + count-ups that wait for their block
    const reveal = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const el = e.target as HTMLElement;
          el.classList.add("is-in");
          reveal.unobserve(el);
          el.querySelectorAll<HTMLElement>('[data-count="reveal"]').forEach(runCount);
          if (el.matches('[data-count="reveal"]')) runCount(el);
        }
      },
      { threshold: 0.15 },
    );
    document.querySelectorAll("[data-reveal]").forEach((el) => reveal.observe(el));
    document.querySelectorAll<HTMLElement>('[data-count="reveal"]').forEach((el) => {
      if (!el.closest("[data-reveal]")) reveal.observe(el);
    });
    cleanups.push(() => reveal.disconnect());

    // ---- loops pause off screen
    const loops = new IntersectionObserver((entries) => {
      for (const e of entries) e.target.classList.toggle("is-visible", e.isIntersecting);
    });
    document.querySelectorAll("[data-loop]").forEach((el) => loops.observe(el));
    cleanups.push(() => loops.disconnect());

    // ---- nav state
    const nav = document.querySelector<HTMLElement>("[data-nav-root]");
    const links = new Map<string, HTMLElement>();
    document.querySelectorAll<HTMLElement>("[data-nav]").forEach((a) => links.set(a.dataset.nav!, a));
    const spy = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          links.forEach((a, id) => {
            if (id === e.target.id) a.setAttribute("aria-current", "true");
            else a.removeAttribute("aria-current");
          });
        }
      },
      { rootMargin: "-50% 0px -50% 0px" },
    );
    links.forEach((_, id) => {
      const s = document.getElementById(id);
      if (s) spy.observe(s);
    });
    cleanups.push(() => spy.disconnect());

    // ---- scrub
    const scrubs = scrub ? Array.from(document.querySelectorAll<HTMLElement>("[data-scrub]")) : [];
    let queued = 0;
    const update = () => {
      queued = 0;
      nav?.classList.toggle("is-scrolled", window.scrollY > 8);
      if (!motionAllowed()) return;
      const vh = window.innerHeight;
      for (const el of scrubs) {
        const r = el.getBoundingClientRect();
        const mode = el.dataset.scrub;
        let p: number;
        if (mode === "page") {
          const max = document.documentElement.scrollHeight - vh;
          p = max > 0 ? window.scrollY / max : 1;
        } else if (mode === "top") {
          // progress while the element's top moves from `start`·vh to `end`·vh
          const start = Number(el.dataset.start ?? 0.8) * vh;
          const end = Number(el.dataset.end ?? 0.4) * vh;
          p = (start - r.top) / (start - end);
        } else if (mode === "self") {
          // 0 when the element sits at the top of the page's first screen, 1 when scrolled past it
          p = -r.top / Math.max(1, r.height);
        } else {
          // span: from the element's top touching the viewport bottom to its bottom leaving the top
          p = (vh - r.top) / (vh + r.height);
        }
        el.style.setProperty("--p", Math.min(1, Math.max(0, p)).toFixed(4));
      }
    };
    const onScroll = () => {
      if (!queued) queued = requestAnimationFrame(update);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    update();
    cleanups.push(() => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    });

    // ---- reduced motion switched on mid-visit: stop everything, show final state
    const onChange = () => {
      if (mq.matches) return;
      root.classList.remove("motion-ok");
      frames.forEach(cancelAnimationFrame);
      timers.forEach(clearTimeout);
      document.querySelectorAll<HTMLElement>("[data-count]").forEach((el) => {
        if (el.dataset.final) finishCount(el);
      });
      scrubs.forEach((el) => el.style.removeProperty("--p"));
      window.dispatchEvent(new Event(MOTION_STOP_EVENT));
    };
    mq.addEventListener("change", onChange);
    cleanups.push(() => mq.removeEventListener("change", onChange));

    return () => {
      cleanups.forEach((f) => f());
      frames.forEach(cancelAnimationFrame);
      timers.forEach(clearTimeout);
    };
  }, [scrub]);

  return null;
}
