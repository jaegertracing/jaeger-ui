// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useMessageFormatStore, getInitialState } from './message-format-store';

describe('useMessageFormatStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useMessageFormatStore.setState({ overrides: {} });
  });

  it('has no overrides by default', () => {
    expect(useMessageFormatStore.getState().overrides).toEqual({});
  });

  it('setFormat records an override for the given attribute name', () => {
    useMessageFormatStore.getState().setFormat('gen_ai.input.messages', 'markdown');
    expect(useMessageFormatStore.getState().overrides).toEqual({ 'gen_ai.input.messages': 'markdown' });
  });

  it('setFormat persists to localStorage under the attribute-scoped key', () => {
    useMessageFormatStore.getState().setFormat('gen_ai.output.messages', 'json');
    expect(localStorage.getItem('jaeger.genaiTab.messageFormat.gen_ai.output.messages')).toBe('"json"');
  });

  it('setFormat keeps overrides for other attribute names untouched', () => {
    useMessageFormatStore.getState().setFormat('gen_ai.input.messages', 'markdown');
    useMessageFormatStore.getState().setFormat('gen_ai.output.messages', 'json');
    expect(useMessageFormatStore.getState().overrides).toEqual({
      'gen_ai.input.messages': 'markdown',
      'gen_ai.output.messages': 'json',
    });
  });

  it('setFormat overwrites a previous override for the same attribute name', () => {
    useMessageFormatStore.getState().setFormat('gen_ai.input.messages', 'markdown');
    useMessageFormatStore.getState().setFormat('gen_ai.input.messages', 'plain');
    expect(useMessageFormatStore.getState().overrides).toEqual({ 'gen_ai.input.messages': 'plain' });
  });
});

// These tests call getInitialState() directly after seeding localStorage so they
// actually exercise the initialization path, not just the in-memory store state.
describe('getInitialState — localStorage-driven initialization', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns no overrides when nothing is stored', () => {
    expect(getInitialState().overrides).toEqual({});
  });

  it('hydrates a stored override for a known attribute key', () => {
    localStorage.setItem('jaeger.genaiTab.messageFormat.gen_ai.input.messages', '"json"');
    expect(getInitialState().overrides).toEqual({ 'gen_ai.input.messages': 'json' });
  });

  it('hydrates stored overrides for all three known attribute keys', () => {
    localStorage.setItem('jaeger.genaiTab.messageFormat.gen_ai.system_instructions', '"plain"');
    localStorage.setItem('jaeger.genaiTab.messageFormat.gen_ai.input.messages', '"markdown"');
    localStorage.setItem('jaeger.genaiTab.messageFormat.gen_ai.output.messages', '"json"');
    expect(getInitialState().overrides).toEqual({
      'gen_ai.system_instructions': 'plain',
      'gen_ai.input.messages': 'markdown',
      'gen_ai.output.messages': 'json',
    });
  });

  it('ignores an invalid stored value', () => {
    localStorage.setItem('jaeger.genaiTab.messageFormat.gen_ai.input.messages', '"not-a-format"');
    expect(getInitialState().overrides).toEqual({});
  });
});

describe('useMessageFormatStore — blocked localStorage (SecurityError)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    useMessageFormatStore.setState({ overrides: {} });
  });

  it('setFormat keeps in-memory state when localStorage.setItem throws', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('SecurityError');
    });
    useMessageFormatStore.getState().setFormat('gen_ai.input.messages', 'markdown');
    // State is updated in memory even though persistence failed
    expect(useMessageFormatStore.getState().overrides).toEqual({ 'gen_ai.input.messages': 'markdown' });
  });

  it('getInitialState returns no overrides when localStorage.getItem throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('SecurityError');
    });
    expect(getInitialState().overrides).toEqual({});
  });
});
