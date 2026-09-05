import type { Size } from "./mercator";

const CANVAS_STYLE =
  "position:absolute;inset:0;width:100%;height:100%;pointer-events:none";
const FADE_STYLE = "transition:opacity 150ms";

export interface Overlay {
  fill: HTMLCanvasElement;
  particles: HTMLCanvasElement;
  size(): Size;
  setVisible(visible: boolean): void;
  destroy(): void;
}

export function createOverlay(
  container: HTMLElement,
  onResize: () => void,
): Overlay {
  const layer = document.createElement("div");
  layer.style.cssText = `${CANVAS_STYLE};${FADE_STYLE}`;
  const fill = createCanvas();
  const particles = createCanvas();
  layer.append(fill, particles);
  container.appendChild(layer);

  const size = () => ({
    width: container.clientWidth,
    height: container.clientHeight,
  });
  const syncSize = () => {
    const { width, height } = size();
    for (const canvas of [fill, particles]) {
      canvas.width = width;
      canvas.height = height;
    }
  };
  syncSize();
  const observer = new ResizeObserver(() => {
    syncSize();
    onResize();
  });
  observer.observe(container);

  return {
    fill,
    particles,
    size,
    setVisible: (visible) => {
      layer.style.opacity = visible ? "1" : "0";
    },
    destroy: () => {
      observer.disconnect();
      layer.remove();
    },
  };
}

function createCanvas(): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.style.cssText = CANVAS_STYLE;
  return canvas;
}
