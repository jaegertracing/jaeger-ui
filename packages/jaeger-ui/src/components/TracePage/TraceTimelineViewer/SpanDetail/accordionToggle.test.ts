// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import accordionToggle from './accordionToggle';

function selectText(text: string): void {
  const node = document.createTextNode(text);
  document.body.appendChild(node);
  const range = document.createRange();
  range.selectNodeContents(node);
  const selection = window.getSelection() as Selection;
  selection.removeAllRanges();
  selection.addRange(range);
}

describe('accordionToggle', () => {
  afterEach(() => {
    window.getSelection()?.removeAllRanges();
    document.body.textContent = '';
  });

  it('toggles on an ordinary click', () => {
    const onToggle = vi.fn();
    accordionToggle(onToggle)?.();
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('leaves the section alone when the click ended a text selection', () => {
    const onToggle = vi.fn();
    selectText('gen_ai.conversation.id');
    accordionToggle(onToggle)?.();
    expect(onToggle).not.toHaveBeenCalled();
  });

  it('toggles when the selection is only a caret, which every plain click leaves behind', () => {
    const onToggle = vi.fn();
    selectText('   ');
    accordionToggle(onToggle)?.();
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('has no handler to give a header that does not toggle', () => {
    expect(accordionToggle(null)).toBeNull();
  });
});
