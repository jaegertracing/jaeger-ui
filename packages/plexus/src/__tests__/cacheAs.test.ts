import cacheScope, { makeCacheScope } from '../cacheAs';

describe('cacheAs', () => {
  it('caches values by key within a scope', () => {
    const cache = makeCacheScope();
    const objA = { a: 1 };
    const objB = { a: 1 };

    const first = cache('key-1', objA);
    const second = cache('key-1', objB);

    expect(first).toBe(objA);
    expect(second).toBe(objA);
  });

  it('separates values across different scopes', () => {
    const scopeA = makeCacheScope();
    const scopeB = makeCacheScope();
    const valueA = { v: 'A' };
    const valueB = { v: 'B' };

    const fromA1 = scopeA('k', valueA);
    const fromB1 = scopeB('k', valueB);
    const fromA2 = scopeA('k', {});
    const fromB2 = scopeB('k', {});

    expect(fromA1).toBe(valueA);
    expect(fromB1).toBe(valueB);
    expect(fromA2).toBe(valueA);
    expect(fromB2).toBe(valueB);
  });

  it('default scope exposes makeScope and caches independently', () => {
    const scope = (cacheScope as any).makeScope();
    const val = { n: 1 };
    const first = scope('x', val);
    const second = scope('x', {});
    expect(first).toBe(val);
    expect(second).toBe(val);
  });
});
