// Copyright (c) 2019 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import guardReducer, { guardReducerWithMeta } from './guardReducer';

describe('guardReducer', () => {
  const state = {};
  const mockRv = {};
  const payload = { pKey: 'pValue' };
  const spy = jest.fn().mockReturnValue(mockRv);
  const guarded = guardReducer(spy);

  beforeEach(() => {
    spy.mockClear();
  });

  it('returned function behaves as identify fn if payload is omitted', () => {
    expect(guarded(state, {})).toBe(state);
    expect(spy).not.toHaveBeenCalled();
  });

  it('returned function calls provided fn if payload is present', () => {
    expect(guarded(state, { payload })).toBe(mockRv);
    expect(spy).toHaveBeenCalledWith(state, payload);
  });

  describe('guardReducerWithMeta', () => {
    const meta = { mKey: 'mValue' };
    const guardedWithMeta = guardReducerWithMeta(spy);

    it('returned function behaves as identify fn if payload is omitted', () => {
      expect(guardedWithMeta(state, { meta })).toBe(state);
      expect(spy).not.toHaveBeenCalled();
    });

    it('returned function behaves as identify fn if meta is omitted', () => {
      expect(guardedWithMeta(state, { payload })).toBe(state);
      expect(spy).not.toHaveBeenCalled();
    });

    it('returned function behaves as identify fn if meta and payload are omitted', () => {
      expect(guardedWithMeta(state, {})).toBe(state);
      expect(spy).not.toHaveBeenCalled();
    });

    it('returned function calls provided fn if meta and payload are present', () => {
      const action = { meta, payload };
      expect(guardedWithMeta(state, action)).toBe(mockRv);
      expect(spy).toHaveBeenCalledWith(state, action);
    });
  });
});
