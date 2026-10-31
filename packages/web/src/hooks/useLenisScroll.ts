import { useEffect, type RefObject } from "react";
import Lenis from "lenis";

type ScrollElementRef = RefObject<HTMLElement | null>;

export function useLenisScroll(
  wrapperRef?: ScrollElementRef,
  contentRef?: ScrollElementRef,
) {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const wrapper = wrapperRef?.current ?? window;
    const content = contentRef?.current ?? document.documentElement;
    if (wrapperRef && !wrapperRef.current) return;

    const lenis = new Lenis({
      wrapper,
      content,
      duration: 1.15,
      easing: (time) => Math.min(1, 1.001 - Math.pow(2, -10 * time)),
      smoothWheel: true,
      wheelMultiplier: 0.9,
      touchMultiplier: 1.5,
      prevent: (node) => Boolean(node.closest("[data-lenis-prevent]")),
    });

    let frameId = 0;
    const raf = (time: number) => {
      lenis.raf(time);
      frameId = window.requestAnimationFrame(raf);
    };

    frameId = window.requestAnimationFrame(raf);

    return () => {
      window.cancelAnimationFrame(frameId);
      lenis.destroy();
    };
  }, [wrapperRef, contentRef]);
}
