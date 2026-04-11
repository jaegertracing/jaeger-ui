// Copyright (c) 2025 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import BreakableText from './BreakableText';

describe('<BreakableText />', () => {
  it('renders text split into spans by default word regex', () => {
    const text = 'Hello world test';
    const { container } = render(<BreakableText text={text} />);

    const spans = container.querySelectorAll('span.BreakableText');
    expect(spans.length).toBe(3);
    expect(spans[0].textContent).toBe('Hello ');
    expect(spans[1].textContent).toBe('world ');
    expect(spans[2].textContent).toBe('test');
  });

  it('renders text with custom className', () => {
    const text = 'custom class';
    const customClass = 'CustomClass';
    const { container } = render(<BreakableText text={text} className={customClass} />);

    const spans = container.querySelectorAll(`span.${customClass}`);
    expect(spans.length).toBe(2);
    expect(spans[0]).toHaveClass(customClass);
  });

  it('handles text with punctuation', () => {
    const text = 'Hello, world! How are you?';
    const { container } = render(<BreakableText text={text} />);

    const spans = container.querySelectorAll('span.BreakableText');
    expect(spans.length).toBe(5);
    expect(spans[0].textContent).toBe('Hello, ');
    expect(spans[1].textContent).toBe('world! ');
    expect(spans[2].textContent).toBe('How ');
    expect(spans[3].textContent).toBe('are ');
    expect(spans[4].textContent).toBe('you?');
  });

  it('handles single word text', () => {
    const text = 'SingleWord';
    const { container } = render(<BreakableText text={text} />);

    const spans = container.querySelectorAll('span.BreakableText');
    expect(spans.length).toBe(1);
    expect(spans[0]).toHaveTextContent('SingleWord');
  });

  it('handles empty string', () => {
    const text = '';
    const { container } = render(<BreakableText text={text} />);

    expect(container.textContent).toBe('');
  });

  it('handles null text', () => {
    const { container } = render(<BreakableText text={null} />);

    expect(container.textContent).toBe('');
  });

  it('handles undefined text', () => {
    const { container } = render(<BreakableText text={undefined} />);

    expect(container.textContent).toBe('');
  });

  it('uses custom word regex when provided', () => {
    const text = 'foo-bar-baz';
    const customRegex = /[^-]+(-|$)/g;
    const { container } = render(<BreakableText text={text} wordRegexp={customRegex} />);

    const spans = container.querySelectorAll('span.BreakableText');
    expect(spans.length).toBe(3);
    expect(spans[0].textContent).toBe('foo-');
    expect(spans[1].textContent).toBe('bar-');
    expect(spans[2].textContent).toBe('baz');
  });

  it('handles text with multiple spaces', () => {
    const text = 'multiple   spaces   here';
    const { container } = render(<BreakableText text={text} />);

    const spans = container.querySelectorAll('span.BreakableText');
    expect(spans.length).toBeGreaterThan(0);

    spans.forEach(span => {
      expect(span).toBeInTheDocument();
    });
  });

  it('handles text with special characters', () => {
    const text = 'test@example.com';
    const { container } = render(<BreakableText text={text} />);

    const spans = container.querySelectorAll('span.BreakableText');
    expect(spans.length).toBeGreaterThan(0);

    const combinedText = Array.from(spans)
      .map(span => span.textContent)
      .join('');
    expect(combinedText).toBe(text);
  });

  it('handles text with numbers', () => {
    const text = 'test123 number456';
    const { container } = render(<BreakableText text={text} />);

    const spans = container.querySelectorAll('span.BreakableText');
    expect(spans.length).toBe(2);
    expect(spans[0].textContent).toBe('test123 ');
    expect(spans[1].textContent).toBe('number456');
  });

  it('renders each span with unique key', () => {
    const text = 'test test test';
    const { container } = render(<BreakableText text={text} />);

    const spans = container.querySelectorAll('span.BreakableText');

    // Verify spans are rendered (keys are internal and not accessible via DOM)
    expect(spans.length).toBe(3);
    spans.forEach(span => {
      expect(span).toBeInTheDocument();
    });
  });

  it('handles text with newlines and tabs', () => {
    const text = 'line1\nline2\tline3';
    const { container } = render(<BreakableText text={text} />);

    const spans = container.querySelectorAll('span.BreakableText');

    // Verify all text is preserved
    const combinedText = Array.from(spans)
      .map(span => span.textContent)
      .join('');
    expect(combinedText).toBe(text);
  });

  it('handles very long text', () => {
    const text = 'word '.repeat(100).trim();
    const { container } = render(<BreakableText text={text} />);

    const spans = container.querySelectorAll('span.BreakableText');
    expect(spans.length).toBe(100);
  });

  it('handles text that does not match the regex', () => {
    const text = '!!!';
    const { container } = render(<BreakableText text={text} />);

    const spans = container.querySelectorAll('span.BreakableText');
    expect(spans.length).toBe(1);
    expect(spans[0]).toHaveTextContent(text);
  });
});
