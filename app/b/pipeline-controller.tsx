"use client";
// B's scroll behavior: the active project lights its stages on the rail (IntersectionObserver), and every
// scroll-linked fill runs through one GSAP ScrollTrigger setup that only writes the CSS variable `--p`.
// CSS maps `--p` to transforms under `html.motion-ok`, so reduced motion needs no extra branch here.
import { useEffect } from "react";
import { MOTION_STOP_EVENT, motionAllowed } from "@/components/motion-runtime";

export default function PipelineController() {
  useEffect(() => {
    // ---- active project -> rail nodes
    const blocks = Array.from(document.querySelectorAll<HTMLElement>("[data-stages]"));
    const nodes = Array.from(document.querySelectorAll<HTMLElement>("[data-rail-stage]"));
    const setActive = (stages: string[]) => {
      for (const n of nodes) n.classList.toggle("is-active", stages.includes(n.dataset.railStage!));
    };
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive((e.target as HTMLElement).dataset.stages!.split(" "));
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    blocks.forEach((b) => io.observe(b));
    if (blocks[0]) setActive(blocks[0].dataset.stages!.split(" "));

    // ---- scrubs through GSAP ScrollTrigger, loaded after hydrate
    let killed = false;
    let kill = () => {};
    if (motionAllowed()) {
      Promise.all([import("gsap"), import("gsap/ScrollTrigger")]).then(([{ gsap }, { ScrollTrigger }]) => {
        if (killed || !motionAllowed()) return;
        gsap.registerPlugin(ScrollTrigger);
        const tweens = Array.from(document.querySelectorAll<HTMLElement>("[data-gsap-scrub]")).map((el) => {
          const trigger = el.dataset.trigger ? document.querySelector(el.dataset.trigger) ?? el : el;
          return gsap.fromTo(
            el,
            { "--p": 0 },
            {
              "--p": 1,
              ease: "none",
              scrollTrigger: {
                trigger,
                start: el.dataset.start ?? "top 80%",
                end: el.dataset.end ?? "bottom 50%",
                scrub: true,
              },
            },
          );
        });
        kill = () => {
          tweens.forEach((t) => {
            t.scrollTrigger?.kill();
            t.kill();
          });
          document.querySelectorAll<HTMLElement>("[data-gsap-scrub]").forEach((el) => el.style.removeProperty("--p"));
        };
      });
    }
    const onStop = () => kill();
    window.addEventListener(MOTION_STOP_EVENT, onStop);
    return () => {
      killed = true;
      io.disconnect();
      kill();
      window.removeEventListener(MOTION_STOP_EVENT, onStop);
    };
  }, []);
  return null;
}
