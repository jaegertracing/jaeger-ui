// Mock d3-zoom to avoid ESM transform issues in Jest
jest.mock('d3-zoom', () => {
  const zoomIdentity = {
    k: 1,
    x: 0,
    y: 0,
    scale(k: number) {
      return { ...this, k };
    },
    translate(x: number, y: number) {
      return { ...this, x, y };
    },
  };
  return { zoomIdentity, ZoomTransform: Object };
});
import { zoomIdentity } from 'd3-zoom';
import { constrainZoom, fitWithinContainer, getScaleExtent, getZoomAttr, getZoomStyle } from '../zoom/utils';

describe('zoom utils', () => {
  it('getScaleExtent returns min fitted scale and max', () => {
    const [min, max] = getScaleExtent(200, 100, 1000, 800);
    expect(min).toBeGreaterThan(0);
    expect(max).toBeGreaterThan(min);
  });

  it('fitWithinContainer centers and scales within bounds', () => {
    const t = fitWithinContainer(200, 100, 1000, 800);
    expect(typeof t.k).toBe('number');
    expect(typeof t.x).toBe('number');
    expect(typeof t.y).toBe('number');
  });

  it('constrainZoom enforces fitted min scale and bounds', () => {
    const tooSmall = zoomIdentity.translate(-10000, -10000).scale(0.0001);
    const t = constrainZoom(tooSmall, 400, 300, 800, 600);
    expect(t.k).toBeGreaterThanOrEqual(getScaleExtent(400, 300, 800, 600)[0]);
    expect(t.x).toBeGreaterThanOrEqual(-400 * t.k + 800 * 0.5);
    expect(t.x).toBeLessThanOrEqual(800 * 0.5);
    expect(t.y).toBeGreaterThanOrEqual(-300 * t.k + 600 * 0.5);
    expect(t.y).toBeLessThanOrEqual(600 * 0.5);
  });

  it('getZoomStyle returns defaults for void and styles for transform', () => {
    expect(getZoomStyle(undefined)).toEqual({
      transform: 'translate(0px, 0px) scale(1)',
      transformOrigin: '0 0',
    });
    const t = zoomIdentity.translate(12.3, 45.6).scale(2);
    const style = getZoomStyle(t);
    expect(style.transform).toBe('translate(12px, 46px) scale(2)');
    expect(style.transformOrigin).toBe('0 0');
  });

  it('getZoomAttr returns undefined for void and attr for transform', () => {
    expect(getZoomAttr(undefined as any)).toBeUndefined();
    const t = zoomIdentity.translate(12.3, 45.6).scale(2);
    expect(getZoomAttr(t)).toBe('translate(12,46) scale(2)');
  });
});
