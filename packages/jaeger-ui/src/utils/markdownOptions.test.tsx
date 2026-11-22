// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { render } from '@testing-library/react';
import Markdown from 'markdown-to-jsx/react';
import { expect, it, describe } from 'vitest';

import { sharedMarkdownOptions } from './markdownOptions';

describe('sharedMarkdownOptions', () => {
  it('does not enable optimizeForStreaming, which deletes unpaired emphasis markers', () => {
    // The streaming pre-pass removes `_` and `*` that it takes for unclosed
    // emphasis, and the removal stays after the text is complete. That costs
    // SQL wildcards, snake_case and Python *args, not only an unfinished bold.
    expect(sharedMarkdownOptions.optimizeForStreaming).toBe(false);
  });

  describe('wrapper element', () => {
    it('always wraps output, even a single plain-text sentence with no formatting', () => {
      // Without forceWrapper, markdown-to-jsx returns the single parsed node
      // directly for simple single-node input, silently dropping the caller's
      // className (and with it, all styling) for the common case of a short
      // plain-text reply.
      const { container } = render(
        <Markdown className="caller-class" options={sharedMarkdownOptions}>
          Here is what I found:
        </Markdown>
      );
      expect(container.querySelector('.caller-class')).toBeInTheDocument();
      expect(container.querySelector('.caller-class')).toHaveTextContent('Here is what I found:');
    });
  });

  describe('link rendering', () => {
    it('allows safe http/https/mailto links and adds target/rel attributes', () => {
      const { container } = render(
        <Markdown options={sharedMarkdownOptions}>
          [http link](http://example.com) [https link](https://example.com) [mailto
          link](mailto:test@example.com)
        </Markdown>
      );

      const links = container.querySelectorAll('a');
      expect(links.length).toBe(3);

      links.forEach(link => {
        expect(link.getAttribute('target')).toBe('_blank');
        expect(link.getAttribute('rel')).toBe('noopener noreferrer');
      });

      expect(links[0].getAttribute('href')).toBe('http://example.com');
      expect(links[1].getAttribute('href')).toBe('https://example.com');
      expect(links[2].getAttribute('href')).toBe('mailto:test@example.com');
    });

    it('blocks unsafe links (like javascript:) and renders them as spans', () => {
      const { container } = render(
        <Markdown options={sharedMarkdownOptions}>
          [unsafe link](javascript:alert('XSS')) [data
          link](data:text/html,&#60;script&#62;alert('XSS')&#60;/script&#62;)
        </Markdown>
      );

      // Should not render any anchor tags
      const links = container.querySelectorAll('a');
      expect(links.length).toBe(0);

      // Should render the text in spans instead
      // Should render the text without links
      expect(container.textContent).toContain('unsafe link');
      expect(container.textContent).toContain('data link');
    });

    it('blocks a link with no href at all', () => {
      const { container } = render(<Markdown options={sharedMarkdownOptions}>[empty link]()</Markdown>);
      expect(container.querySelectorAll('a').length).toBe(0);
      expect(container.textContent).toContain('empty link');
    });

    it('allows an uppercase scheme, matching browsers treating schemes case-insensitively', () => {
      const { container } = render(
        <Markdown options={sharedMarkdownOptions}>[shout link](HTTPS://example.com)</Markdown>
      );
      const link = container.querySelector('a');
      expect(link).not.toBeNull();
      expect(link).toHaveAttribute('href', 'HTTPS://example.com');
    });

    it('allows a href with leading/trailing whitespace, trimmed before rendering', () => {
      const { container } = render(
        <Markdown options={sharedMarkdownOptions}>{'[padded link](  https://example.com  )'}</Markdown>
      );
      const link = container.querySelector('a');
      expect(link).not.toBeNull();
      expect(link).toHaveAttribute('href', 'https://example.com');
    });
  });

  describe('literal emphasis markers', () => {
    // Under optimizeForStreaming, markdown-to-jsx 9.10.2 deleted a lone `_`
    // or `*` from finished text and 9.10.4 deletes two unpaired openers from
    // the last paragraph. These tests fail if the option is turned back on
    // before upstream leaves finished text alone.
    function renderMarkdown(markdown: string) {
      return render(<Markdown options={sharedMarkdownOptions}>{markdown}</Markdown>);
    }

    it('keeps an unpaired asterisk in SQL and arithmetic instead of deleting it', () => {
      const sql = renderMarkdown('SELECT * FROM customer WHERE customer_id=392');
      expect(sql.container.textContent).toContain('SELECT * FROM customer WHERE customer_id=392');

      const product = renderMarkdown('5 * 3');
      expect(product.container.textContent).toContain('5 * 3');

      const intraword = renderMarkdown('x*y');
      expect(intraword.container.textContent).toContain('x*y');
    });

    it('still renders paired emphasis', () => {
      const { container } = renderMarkdown('**bold** and _italic_ and snake_case');
      expect(container.querySelector('strong')).toHaveTextContent('bold');
      expect(container.querySelector('em')).toHaveTextContent('italic');
      expect(container.textContent).toContain('snake_case');
    });

    it('keeps a bare URL underscore in both the href and the link text', () => {
      const { container } = renderMarkdown('https://example.com/customer_id');
      const link = container.querySelector('a');
      expect(link).not.toBeNull();
      expect(link).toHaveAttribute('href', 'https://example.com/customer_id');
      expect(link?.textContent).toBe('https://example.com/customer_id');
      // textContent decodes entities, so only the markup shows a leaked &#95;.
      expect(container.innerHTML).toContain('customer_id');
      expect(container.innerHTML).not.toContain('&#95;');
    });

    it('keeps two unpaired openers in the last paragraph', () => {
      const underscores = renderMarkdown('Use _trace and _span');
      expect(underscores.container.querySelector('em')).toBeNull();
      expect(underscores.container.textContent).toBe('Use _trace and _span');

      const asterisks = renderMarkdown('*args and *kwargs');
      expect(asterisks.container.querySelector('em')).toBeNull();
      expect(asterisks.container.textContent).toBe('*args and *kwargs');
    });

    it('keeps two snake_case identifiers on one line without emphasizing either', () => {
      const { container } = renderMarkdown('user_id and order_id');
      expect(container.querySelector('em')).toBeNull();
      expect(container.textContent).toContain('user_id');
      expect(container.textContent).toContain('order_id');
    });
  });

  describe('image rendering', () => {
    it('blocks images and renders a placeholder span', () => {
      const { container } = render(
        <Markdown options={sharedMarkdownOptions}>
          ![logo](http://example.com/logo.png) ![some title](http://example.com/image.png "title here")
        </Markdown>
      );

      // Should not render any img tags
      const images = container.querySelectorAll('img');
      expect(images.length).toBe(0);

      // Should render placeholder spans
      const placeholders = container.querySelectorAll('.JaegerAssistantPanel-image-placeholder');
      expect(placeholders.length).toBe(2);

      expect(placeholders[0].textContent).toBe('[Image: logo]');
      expect(placeholders[1].textContent).toBe('[Image: some title]');
    });

    it('falls back to "unsupported" when neither alt nor title is present', () => {
      const { container } = render(
        <Markdown options={sharedMarkdownOptions}>![](http://example.com/logo.png)</Markdown>
      );
      const placeholder = container.querySelector('.JaegerAssistantPanel-image-placeholder');
      expect(placeholder).toHaveTextContent('[Image: unsupported]');
    });
  });
});
