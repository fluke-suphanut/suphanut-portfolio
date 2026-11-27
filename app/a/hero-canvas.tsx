"use client";
// Decides whether A's WebGL field may run, and when (design/a-signal-field.md section 6):
// not under reduced motion, not with Save-Data, not without WebGL; mounted after the window `load`
// event and then an idle period, so three.js never competes with first paint, LCP or hydration
// (AC5); paused when the hero is off screen or the tab is hidden.
// The static SVG poster behind it is always there, so a skipped or lost canvas changes nothing else.
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { MOTION_STOP_EVENT } from "@/components/motion-runtime";

const SignalField = dynamic(() => import("./signal-field"), { ssr: false });

// Creating a context is not free (software GL can take tens of ms), so this runs only inside the idle
// callback, and the probe context is released right away.
function webglAvailable() {
  try {
    const c = document.createElement("canvas");
    const gl = c.getContext("webgl2") || c.getContext("webgl");
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
    return !!gl;
  } catch {
    return false;
  }
}

export default function HeroCanvas() {
  const wrap = useRef<HTMLDivElement>(null);
  const [mount, setMount] = useState(false);
  const [active, setActive] = useState(true);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
    if (reduce.matches || saveData) return;

    let idle = 0;
    const tryMount = () => {
      if (!reduce.matches && webglAvailable()) setMount(true);
    };
    const afterLoad = () => {
      idle = window.requestIdleCallback
        ? window.requestIdleCallback(tryMount, { timeout: 3000 })
        : window.setTimeout(tryMount, 300);
    };
    if (document.readyState === "complete") afterLoad();
    else window.addEventListener("load", afterLoad, { once: true });

    const stop = () => setMount(false);
    const onReduce = () => reduce.matches && stop();
    reduce.addEventListener("change", onReduce);
    window.addEventListener(MOTION_STOP_EVENT, stop);

    const hero = wrap.current?.parentElement;
    let onScreen = true;
    const sync = () => setActive(onScreen && !document.hidden);
    const io = new IntersectionObserver(([e]) => {
      onScreen = e.isIntersecting;
      sync();
    });
    if (hero) io.observe(hero);
    document.addEventListener("visibilitychange", sync);

    return () => {
      window.removeEventListener("load", afterLoad);
      if (window.cancelIdleCallback) window.cancelIdleCallback(idle);
      else clearTimeout(idle);
      reduce.removeEventListener("change", onReduce);
      window.removeEventListener(MOTION_STOP_EVENT, stop);
      io.disconnect();
      document.removeEventListener("visibilitychange", sync);
    };
  }, []);

  return (
    <div ref={wrap} className={`hero-canvas${ready ? " is-ready" : ""}`} aria-hidden="true">
      {mount && (
        <SignalField
          active={active}
          wrapper={wrap}
          onReady={() => setReady(true)}
          onLost={() => setMount(false)}
        />
      )}
    </div>
  );
}
