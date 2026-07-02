// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import type { IAttribute, IOtelSpan } from '../../types/otel';
import { hasGenAIWarning, isGenAISpan } from './index';

function makeSpan(attrs: IAttribute[]): IOtelSpan {
  return { attributes: attrs } as unknown as IOtelSpan;
}

describe('isGenAISpan', () => {
  it('returns true when span has a gen_ai.* attribute', () => {
    const span = makeSpan([{ key: 'gen_ai.system', value: 'openai' }]);
    expect(isGenAISpan(span)).toBe(true);
  });

  it('returns true for any gen_ai.* key prefix', () => {
    const span = makeSpan([{ key: 'gen_ai.operation.name', value: 'chat' }]);
    expect(isGenAISpan(span)).toBe(true);
  });

  it('returns false when span has no gen_ai.* attributes', () => {
    const span = makeSpan([{ key: 'http.method', value: 'GET' }]);
    expect(isGenAISpan(span)).toBe(false);
  });

  it('returns false for an empty attribute list', () => {
    expect(isGenAISpan(makeSpan([]))).toBe(false);
  });

  it('does not match keys that merely contain "gen_ai" in the middle', () => {
    const span = makeSpan([{ key: 'custom.gen_ai.tag', value: 'x' }]);
    expect(isGenAISpan(span)).toBe(false);
  });
});

describe('hasGenAIWarning', () => {
  it('returns true when finish_reasons is a JSON array string containing length', () => {
    const span = makeSpan([{ key: 'gen_ai.response.finish_reasons', value: '["stop", "length"]' }]);
    expect(hasGenAIWarning(span)).toBe(true);
  });

  it('returns true when finish_reasons is a scalar string "length"', () => {
    const span = makeSpan([{ key: 'gen_ai.response.finish_reasons', value: 'length' }]);
    expect(hasGenAIWarning(span)).toBe(true);
  });

  it('returns true when finish_reasons is a JSON scalar string "length"', () => {
    const span = makeSpan([{ key: 'gen_ai.response.finish_reasons', value: '"length"' }]);
    expect(hasGenAIWarning(span)).toBe(true);
  });

  it('returns true when finish_reasons is a JS array containing content_filter', () => {
    const span = makeSpan([
      { key: 'gen_ai.response.finish_reasons', value: ['content_filter'] as unknown as string },
    ]);
    expect(hasGenAIWarning(span)).toBe(true);
  });

  it('returns false when finish_reasons is a JSON array string without warnings', () => {
    const span = makeSpan([{ key: 'gen_ai.response.finish_reasons', value: '["stop"]' }]);
    expect(hasGenAIWarning(span)).toBe(false);
  });
});
