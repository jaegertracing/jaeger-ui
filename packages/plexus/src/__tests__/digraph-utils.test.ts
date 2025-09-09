import { assignMergeCss, getProps, getValueScaler, isSamePropSetter } from '../Digraph/utils';

describe('Digraph utils', () => {
  describe('assignMergeCss', () => {
    it('merges className and style and other props', () => {
      const a = { className: 'a', style: { color: 'red' }, id: 'x' };
      const b = { className: 'b', style: { fontSize: 12 }, title: 't' } as any;
      const c = assignMergeCss(a, b);
      expect(c.className).toBe('a b');
      expect(c.style).toEqual({ color: 'red', fontSize: 12 });
      expect(c.id).toBe('x');
      expect(c.title).toBe('t');
    });

    it('handles missing className or style', () => {
      const a = { id: 'x' } as any;
      const b = { className: 'b' } as any;
      const c = assignMergeCss(a, b);
      expect(c.className).toBe('b');
      expect(c.id).toBe('x');
    });
  });

  describe('getProps', () => {
    it('returns empty object for falsy spec', () => {
      expect(getProps(undefined as any)).toEqual({});
    });

    it('accepts object or function or array and merges', () => {
      const fn = (n: number) => ({ className: `n-${n}`, style: { opacity: n } });
      const obj = { className: 'static', style: { display: 'block' }, role: 'img' } as any;
      const res = getProps([fn, obj] as any, 2);
      expect(res.className).toBe('n-2 static');
      expect(res.style).toEqual({ opacity: 2, display: 'block' });
      expect(res.role).toBe('img');
    });
  });

  describe('getValueScaler', () => {
    it('returns bounds at extremes and interpolates in between', () => {
      const scale = getValueScaler({
        factorMin: 0,
        factorMax: 10,
        valueMin: 0,
        valueMax: 100,
        expAdjuster: 1,
      });
      expect(scale(-5)).toBe(0);
      expect(scale(0)).toBe(0);
      expect(scale(10)).toBe(100);
      const mid = scale(5);
      expect(mid).toBeGreaterThan(0);
      expect(mid).toBeLessThan(100);
      expect(Math.round(mid)).toBe(50);
    });
  });

  describe('isSamePropSetter', () => {
    it('compares arrays shallowly and primitives by reference', () => {
      const a1 = [1, 2, 3] as any;
      const a2 = [1, 2, 3] as any;
      expect(isSamePropSetter(a1 as any, a1 as any)).toBe(true);
      // implementation does shallow equality by index; identical primitive values return true
      expect(isSamePropSetter(a1 as any, a2 as any)).toBe(true);
      const fn = () => ({});
      expect(isSamePropSetter(fn as any, fn as any)).toBe(true);
    });
  });
});
