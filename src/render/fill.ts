import { type Size, unproject, type View } from "../mercator";
import type { WindField } from "../wind/field";
import { speedColor } from "./palette";

const CELL_SIZE = 6;
const ALPHA = 90;

export function drawFill(
  canvas: HTMLCanvasElement,
  field: WindField,
  view: View,
  size: Size,
): void {
  const columns = Math.ceil(size.width / CELL_SIZE);
  const rows = Math.ceil(size.height / CELL_SIZE);
  const image = new ImageData(columns, rows);
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      const { lat, lng } = unproject(
        column * CELL_SIZE,
        row * CELL_SIZE,
        view,
        size,
      );
      const [r, g, b] = speedColor(field.sample(lat, lng).speed);
      const offset = (row * columns + column) * 4;
      image.data.set([r, g, b, ALPHA], offset);
    }
  }
  const scratch = new OffscreenCanvas(columns, rows);
  scratch.getContext("2d")?.putImageData(image, 0, 0);
  const context = canvas.getContext("2d");
  if (!context) return;
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.imageSmoothingEnabled = true;
  context.drawImage(scratch, 0, 0, canvas.width, canvas.height);
}
