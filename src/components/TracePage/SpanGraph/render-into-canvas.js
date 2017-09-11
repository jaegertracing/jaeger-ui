const CV_WIDTH = 4000;
const MIN_WIDTH = 50;

export default function renderIntoCanvas(canvas, items, totalValueWidth, getFillColor) {
  // eslint-disable-next-line  no-param-reassign
  canvas.width = CV_WIDTH;
  // eslint-disable-next-line  no-param-reassign
  canvas.height = items.length;
  const ctx = canvas.getContext('2d');
  for (let i = 0; i < items.length; i++) {
    const { valueWidth, valueOffset, serviceName } = items[i];
    // eslint-disable-next-line no-bitwise
    const x = (valueOffset / totalValueWidth * CV_WIDTH) | 0;
    // eslint-disable-next-line no-bitwise
    let width = (valueWidth / totalValueWidth * CV_WIDTH) | 0;
    if (width < MIN_WIDTH) {
      width = MIN_WIDTH;
    }
    ctx.fillStyle = getFillColor(serviceName);
    ctx.fillRect(x, i, width, 1);
  }
}
