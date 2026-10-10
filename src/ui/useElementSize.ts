import { useLayoutEffect, useState } from 'react';

/** Live width/height of an element (for SVG/canvas maps that fill their box). */
export const useElementSize = (ref: React.RefObject<HTMLElement | null>) => {
  const [size, setSize] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setSize({ w: entry.contentRect.width, h: entry.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return size;
};
