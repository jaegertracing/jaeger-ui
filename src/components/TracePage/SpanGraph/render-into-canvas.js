const CV_WIDTH = 10000;
const MIN_WIDTH = 50;

export default function renderIntoCanvas(canvas, items, totalValueWidth, getColor) {
  // eslint-disable-next-line  no-param-reassign
  canvas.width = CV_WIDTH;
  canvas.height = items.length;
  const ctx = canvas.getContext('2d');
  for (let i = 0; i < items.length; i++) {
    const { valueWidth: valueWidth, valueOffset, serviceName } = items[i];
    const x = (valueOffset / totalValueWidth * CV_WIDTH) | 0;
    let width = (valueWidth / totalValueWidth * CV_WIDTH) | 0;
    if (width < MIN_WIDTH) {
      width = MIN_WIDTH;
    }
    ctx.fillStyle = getColor(serviceName);
    ctx.fillRect(x, i, width, 1);
  }
}

// items: PropTypes.arrayOf(
//   PropTypes.shape({
//     valueWidth: PropTypes.number.isRequired,
//     valueOffset: PropTypes.number.isRequired,
//     serviceName: PropTypes.string.isRequired,
//   })
// ).isRequired,
// numTicks: PropTypes.number.isRequired,
// valueWidth
