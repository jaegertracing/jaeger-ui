// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

import AttributesTable, { LinkValue, FILTER_THRESHOLD } from './AttributesTable';

vi.mock('../../../common/CopyIcon', () => {
  return mockDefault(function CopyIcon({ copyText, tooltipTitle, buttonText, icon, className }) {
    return (
      <button
        type="button"
        className={className}
        data-testid="copy-icon"
        data-copy-text={copyText}
        data-tooltip-title={tooltipTitle}
        data-button-text={buttonText}
        data-has-icon={!!icon}
      >
        {buttonText || 'Copy'}
      </button>
    );
  });
});

describe('LinkValue', () => {
  const title = 'titleValue';
  const href = 'hrefValue';
  const childrenText = 'childrenTextValue';

  it('renders link with correct href and title attributes', () => {
    render(
      <LinkValue href={href} title={title}>
        {childrenText}
      </LinkValue>
    );

    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', href);
    expect(link).toHaveAttribute('title', title);
    expect(link).toHaveTextContent(childrenText);
  });

  it('renders IoOpenOutline icon with correct CSS class', () => {
    render(
      <LinkValue href={href} title={title}>
        {childrenText}
      </LinkValue>
    );

    const icon = document.querySelector('.KeyValueTable--linkIcon');
    expect(icon).toBeInTheDocument();
  });
});

describe('<AttributesTable>', () => {
  const jsonValue = {
    hello: 'world',
    '<xss>': 'safe',
    link: 'https://example.com',
    xss_link: 'https://example.com with "quotes"',
    boolean: true,
    number: 42,
    null: null,
    array: ['apple', 'banana', 'cherry'],
    object: { pear: 'grape', melon: 'kiwi' },
  };
  const data = [
    { key: 'span.kind', value: 'client', expected: ['client'] },
    { key: 'omg', value: 'mos-def', expected: ['mos-def'] },
    { key: 'numericString', value: '12345678901234567890', expected: ['12345678901234567890'] },
    { key: 'numeric', value: 123456789, expected: ['123456789'] },
    { key: 'boolean', value: true, expected: ['true'] },
    {
      key: 'http.request.header.accept',
      value: ['application/json'],
      expected: ['application/json'],
    },
    {
      key: 'http.response.header.set_cookie',
      value: JSON.stringify(['name=mos-def', 'code=12345']),
      expected: ['name=mos-def', 'code=12345'],
    },
    {
      key: 'jsonkey',
      value: JSON.stringify(jsonValue),
      expected: [
        'world',
        'safe',
        'https://example.com',
        'https://example.com with "quotes"',
        'true',
        '42',
        'null',
        'apple',
        'banana',
        'cherry',
        'grape',
        'pear',
        'kiwi',
        'melon',
        '<xss>',
      ],
    },
  ];

  it('renders KeyValueTable container with correct structure', () => {
    render(<AttributesTable data={data} />);

    const container = document.querySelector('.KeyValueTable.u-simple-scrollbars');
    expect(container).toBeInTheDocument();

    const table = screen.getByRole('table');
    expect(table).toHaveClass('u-width-100');
  });

  it('renders table row for each data element with correct key columns', () => {
    render(<AttributesTable data={data} />);

    const rows = screen.getAllByRole('row');
    expect(rows).toHaveLength(data.length);

    data.forEach(item => {
      const keyCell = screen.getByText(item.key);
      expect(keyCell).toHaveClass('KeyValueTable--keyColumn');
    });
  });

  it('renders expected text content for each span value', () => {
    render(<AttributesTable data={data} />);

    const valueElements = document.querySelectorAll('.ub-inline-block');
    expect(valueElements).toHaveLength(data.length);

    valueElements.forEach((valueDiv, i) => {
      const expectedItems = data[i].expected;
      expectedItems.forEach(expectedText => {
        expect(valueDiv).toHaveTextContent(expectedText);
      });
    });
  });

  it('renders single link with correct href and title when linksGetter returns one link', () => {
    render(
      <AttributesTable
        data={data}
        linksGetter={(array, i) =>
          array[i].key === 'span.kind'
            ? [
                {
                  url: `http://example.com/?kind=${encodeURIComponent(array[i].value)}`,
                  text: `More info about ${array[i].value}`,
                },
              ]
            : []
        }
      />
    );

    const linkValue = screen.getByRole('link');
    expect(linkValue).toHaveAttribute('href', 'http://example.com/?kind=client');
    expect(linkValue).toHaveAttribute('title', 'More info about client');

    const row = linkValue.closest('tr');
    const keyCell = row.querySelector('.KeyValueTable--keyColumn');
    expect(keyCell).toHaveTextContent('span.kind');
  });

  it('renders dropdown with multiple links when linksGetter returns multiple links', () => {
    const { container } = render(
      <AttributesTable
        data={data}
        linksGetter={(array, i) =>
          array[i].key === 'span.kind'
            ? [
                { url: `http://example.com/1?kind=${encodeURIComponent(array[i].value)}`, text: 'Example 1' },
                { url: `http://example.com/2?kind=${encodeURIComponent(array[i].value)}`, text: 'Example 2' },
              ]
            : []
        }
      />
    );

    const dropdownTrigger = container.querySelector('a');
    expect(dropdownTrigger).toBeInTheDocument();

    const row = dropdownTrigger.closest('tr');
    const keyCell = row.querySelector('.KeyValueTable--keyColumn');
    expect(keyCell).toHaveTextContent('span.kind');

    const listIcon = container.querySelector('.KeyValueTable--linkIcon');
    expect(listIcon).toBeInTheDocument();
  });

  it('handles invalid JSON strings gracefully and returns raw value', () => {
    const brokenData = [{ key: 'brokenJSON', value: '{"complete": "test"' }];
    render(<AttributesTable data={brokenData} />);

    const valueCell = screen.getByText('{"complete": "test"');
    expect(valueCell).toBeInTheDocument();
  });

  describe('attribute filter', () => {
    const manyAttrs = Array.from({ length: 12 }, (_, i) => ({
      key: `key.${i}`,
      value: `value-${i}`,
    }));

    let user;

    beforeEach(() => {
      user = userEvent.setup();
    });

    afterEach(() => {
      cleanup();
    });

    it(`does not render filter input when data has ${FILTER_THRESHOLD} or fewer attributes`, () => {
      const fewAttrs = manyAttrs.slice(0, FILTER_THRESHOLD);
      render(<AttributesTable data={fewAttrs} />);
      expect(screen.queryByRole('textbox', { name: /filter span attributes/i })).not.toBeInTheDocument();
    });

    it(`renders filter input when data has more than ${FILTER_THRESHOLD} attributes`, () => {
      render(<AttributesTable data={manyAttrs} />);
      expect(screen.getByRole('textbox', { name: /filter span attributes/i })).toBeInTheDocument();
    });

    it('filters rows by key when query matches', async () => {
      render(<AttributesTable data={manyAttrs} />);
      const input = screen.getByRole('textbox', { name: /filter span attributes/i });

      await user.type(input, 'key.1');

      // key.1, key.10, key.11 match
      const rows = screen.getAllByRole('row');
      expect(rows.length).toBe(3);
    });

    it('filters rows by value when query matches', async () => {
      render(<AttributesTable data={manyAttrs} />);
      const input = screen.getByRole('textbox', { name: /filter span attributes/i });

      await user.type(input, 'value-0');

      const rows = screen.getAllByRole('row');
      expect(rows.length).toBe(1);
      expect(screen.getByText('key.0')).toBeInTheDocument();
    });

    it('shows N of M count label when filter is active', async () => {
      render(<AttributesTable data={manyAttrs} />);
      const input = screen.getByRole('textbox', { name: /filter span attributes/i });

      await user.type(input, 'key.1');

      expect(screen.getByText('3 of 12')).toBeInTheDocument();
    });

    it('hides count label when filter is empty', () => {
      render(<AttributesTable data={manyAttrs} />);
      expect(screen.queryByText(/of 12/)).not.toBeInTheDocument();
    });

    it('shows all rows when filter is cleared via the × button', async () => {
      render(<AttributesTable data={manyAttrs} />);
      const input = screen.getByRole('textbox', { name: /filter span attributes/i });

      await user.type(input, 'key.0');
      expect(screen.getAllByRole('row')).toHaveLength(1);

      await user.click(screen.getByRole('button', { name: /clear filter/i }));

      expect(screen.getAllByRole('row')).toHaveLength(manyAttrs.length);
      expect(input).toHaveValue('');
    });

    it('shows all rows when filter is cleared via the Escape key', async () => {
      render(<AttributesTable data={manyAttrs} />);
      const input = screen.getByRole('textbox', { name: /filter span attributes/i });

      await user.type(input, 'key.0');
      expect(screen.getAllByRole('row')).toHaveLength(1);

      await user.keyboard('{Escape}');

      expect(screen.getAllByRole('row')).toHaveLength(manyAttrs.length);
      expect(input).toHaveValue('');
    });

    it('renders an empty-state message when no attributes match the query', async () => {
      render(<AttributesTable data={manyAttrs} />);
      const input = screen.getByRole('textbox', { name: /filter span attributes/i });

      await user.type(input, 'zzz');

      expect(screen.queryAllByRole('row')).toHaveLength(1);
      expect(screen.getByText(/no attributes match/i)).toBeInTheDocument();
      expect(screen.getByText(/zzz/)).toBeInTheDocument();
    });

    it('passes the original data index to linksGetter when rows are filtered', async () => {
      const linksGetter = vi.fn().mockReturnValue([]);
      render(<AttributesTable data={manyAttrs} linksGetter={linksGetter} />);
      const input = screen.getByRole('textbox', { name: /filter span attributes/i });

      await user.type(input, 'value-5');

      // After typing 'value-5', exactly one row is visible
      expect(screen.getAllByRole('row')).toHaveLength(1);
      // The final render's linksGetter call must pass originalIndex 5, not the filtered position
      const lastCall = linksGetter.mock.calls.at(-1);
      expect(lastCall[1]).toBe(5);
    });

    it('is case-insensitive', async () => {
      render(<AttributesTable data={manyAttrs} />);
      const input = screen.getByRole('textbox', { name: /filter span attributes/i });

      await user.type(input, 'KEY.0');

      const rows = screen.getAllByRole('row');
      expect(rows.length).toBe(1);
    });

    it('shows all rows when data shrinks below threshold while a query is active', async () => {
      const { rerender } = render(<AttributesTable data={manyAttrs} />);
      const input = screen.getByRole('textbox', { name: /filter span attributes/i });

      await user.type(input, 'key.0');
      expect(screen.getAllByRole('row')).toHaveLength(1);

      // shrink data below threshold — filter input disappears, stale query must not hide rows
      const fewAttrs = manyAttrs.slice(0, Math.floor(FILTER_THRESHOLD / 2));
      rerender(<AttributesTable data={fewAttrs} />);

      expect(screen.queryByRole('textbox', { name: /filter span attributes/i })).not.toBeInTheDocument();
      expect(screen.getAllByRole('row')).toHaveLength(fewAttrs.length);
    });
  });

  it('renders CopyIcon components with correct copyText properties for each data element', () => {
    render(<AttributesTable data={data} />);

    const copyIcons = screen.getAllByTestId('copy-icon');
    expect(copyIcons).toHaveLength(2 * data.length);

    copyIcons.forEach((copyIcon, i) => {
      const datum = data[Math.floor(i / 2)];
      if (i % 2 === 0) {
        expect(copyIcon).toHaveAttribute('data-copy-text', String(datum.value));
        expect(copyIcon).toHaveAttribute('data-tooltip-title', 'Copy value');
      } else {
        expect(copyIcon).toHaveAttribute('data-copy-text', JSON.stringify(datum, null, 2));
        expect(copyIcon).toHaveAttribute('data-tooltip-title', 'Copy JSON');
      }
    });
  });
});
