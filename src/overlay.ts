import type { Size } from "./mercator";

const CANVAS_STYLE =
  "position:absolute;inset:0;width:100%;height:100%;pointer-events:none";
const FADE_STYLE = "transition:opacity 150ms";
const CENTER_MARKER_STYLE =
  "position:absolute;left:50%;top:50%;width:14px;height:14px;margin:-9px 0 0 -9px;border:2px solid #fc5200;border-radius:50%;box-shadow:0 0 0 2px #fff";

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
  const marker = document.createElement("div");
  marker.style.cssText = CENTER_MARKER_STYLE;
  layer.append(fill, particles, marker);
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
