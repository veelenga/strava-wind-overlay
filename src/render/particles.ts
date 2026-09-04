import { type Size, unproject, type View } from "../mercator";
import type { WindField } from "../wind/field";
import { speedColor, toCss } from "./palette";

const PIXELS_PER_PARTICLE = 900;
const MAX_PARTICLES = 4000;
const MAX_AGE_FRAMES = 100;
const TRAIL_KEEP = 0.955;
const LINE_WIDTH = 1.6;
const SPEED_FACTOR = 0.035;
const REFERENCE_ZOOM = 10;
const MIN_ZOOM_SCALE = 0.4;
const MAX_ZOOM_SCALE = 3;

interface Particle {
  x: number;
  y: number;
  age: number;
}

export interface ParticleLayer {
  start(field: WindField, view: View, size: Size): void;
  stop(): void;
}

export function createParticleLayer(canvas: HTMLCanvasElement): ParticleLayer {
  let frame = 0;

  const stop = () => {
    cancelAnimationFrame(frame);
    frame = 0;
    canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
  };

  const start = (field: WindField, view: View, size: Size) => {
    stop();
    const context = canvas.getContext("2d");
    if (!context) return;
    const count = Math.min(
      MAX_PARTICLES,
      Math.round((size.width * size.height) / PIXELS_PER_PARTICLE),
    );
    const particles = Array.from({ length: count }, () => respawn(size));
    const zoomScale = clamp(
      2 ** (view.zoom - REFERENCE_ZOOM),
      MIN_ZOOM_SCALE,
      MAX_ZOOM_SCALE,
    );
    const step = SPEED_FACTOR * zoomScale;

    const tick = () => {
      fadeTrails(context, size);
      context.lineWidth = LINE_WIDTH;
      for (const particle of particles) {
        const { lat, lng } = unproject(particle.x, particle.y, view, size);
        const wind = field.sample(lat, lng);
        const nextX = particle.x + wind.u * step;
        const nextY = particle.y - wind.v * step;
        context.strokeStyle = toCss(speedColor(wind.speed));
        context.beginPath();
        context.moveTo(particle.x, particle.y);
        context.lineTo(nextX, nextY);
        context.stroke();
        particle.x = nextX;
        particle.y = nextY;
        particle.age++;
        if (particle.age > MAX_AGE_FRAMES || isOutside(particle, size))
          Object.assign(particle, respawn(size));
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
  };

  return { start, stop };
}

function fadeTrails(context: CanvasRenderingContext2D, size: Size): void {
  context.globalCompositeOperation = "destination-in";
  context.fillStyle = `rgba(0,0,0,${TRAIL_KEEP})`;
  context.fillRect(0, 0, size.width, size.height);
  context.globalCompositeOperation = "source-over";
}

const respawn = (size: Size): Particle => ({
  x: Math.random() * size.width,
  y: Math.random() * size.height,
  age: Math.floor(Math.random() * MAX_AGE_FRAMES),
});

const isOutside = (p: Particle, size: Size) =>
  p.x < 0 || p.y < 0 || p.x > size.width || p.y > size.height;
const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));
