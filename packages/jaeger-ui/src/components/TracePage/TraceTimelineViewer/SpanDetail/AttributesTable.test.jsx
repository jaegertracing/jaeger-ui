// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

import AttributesTable, { FILTER_THRESHOLD, LinkValue } from './AttributesTable';
import { makeAttributes } from '../../../../model/attributes';

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
    render(<AttributesTable data={makeAttributes(data)} />);

    const container = document.querySelector('.KeyValueTable.u-simple-scrollbars');
    expect(container).toBeInTheDocument();

    const table = screen.getByRole('table');
    expect(table).toHaveClass('u-width-100');
  });

  it('renders table row for each data element with correct key columns', () => {
    render(<AttributesTable data={makeAttributes(data)} />);

    // A JsonView tree (the 'jsonkey' entry) renders as two rows - a key-only row and
    // a full-width value row below it - instead of sharing one row with the key
    // column, so the total is data.length plus one extra row for that single
    // JSON-tree item.
    const rows = screen.getAllByRole('row');
    expect(rows).toHaveLength(data.length + 1);

    data.forEach(item => {
      const keyCell = screen.getByText(item.key);
      expect(keyCell).toHaveClass('KeyValueTable--keyColumn');
    });
  });

  it('renders a JSON-tree value on its own full-width row, separate from the key row', () => {
    render(<AttributesTable data={makeAttributes(data)} />);

    const keyCell = screen.getByText('jsonkey');
    const keyRow = keyCell.closest('tr');
    expect(keyRow).toHaveClass('KeyValueTable--row-jsonKey');
    expect(keyCell).toHaveAttribute('colSpan', '2');
    // Only the key sits in this row - no value content alongside it.
    expect(keyRow).not.toHaveTextContent('world');

    const valueRow = keyRow.nextElementSibling;
    expect(valueRow).toHaveClass('KeyValueTable--row-jsonValue');
    const valueCell = valueRow.querySelector('.KeyValueTable--valueColumn-full');
    expect(valueCell).toHaveAttribute('colSpan', '2');
    expect(valueCell).toHaveTextContent('world');
  });

  it('keeps a non-JSON-tree value sharing one row with its key, unchanged from before', () => {
    render(<AttributesTable data={makeAttributes(data)} />);

    const keyCell = screen.getByText('span.kind');
    const row = keyCell.closest('tr');
    expect(row).not.toHaveClass('KeyValueTable--row-jsonKey');
    expect(row).toHaveTextContent('client');
  });

  it('renders expected text content for each span value', () => {
    render(<AttributesTable data={makeAttributes(data)} />);

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
        data={makeAttributes(data)}
        linksGetter={(array, i) =>
          array.entries()[i].key === 'span.kind'
            ? [
                {
                  url: `http://example.com/?kind=${encodeURIComponent(array.entries()[i].value)}`,
                  text: `More info about ${array.entries()[i].value}`,
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
        data={makeAttributes(data)}
        linksGetter={(array, i) =>
          array.entries()[i].key === 'span.kind'
            ? [
                {
                  url: `http://example.com/1?kind=${encodeURIComponent(array.entries()[i].value)}`,
                  text: 'Example 1',
                },
                {
                  url: `http://example.com/2?kind=${encodeURIComponent(array.entries()[i].value)}`,
                  text: 'Example 2',
                },
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
    render(<AttributesTable data={makeAttributes(brokenData)} />);

    const valueCell = screen.getByText('{"complete": "test"');
    expect(valueCell).toBeInTheDocument();
  });

  it('renders CopyIcon components with correct copyText properties for each data element', () => {
    render(<AttributesTable data={makeAttributes(data)} />);

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

  describe('large values', () => {
    const LARGE_VALUE = 'x'.repeat(10_001);

    it('renders a placeholder button instead of full content for large string values', () => {
      const largeData = makeAttributes([{ key: 'big_attr', value: LARGE_VALUE }]);
      render(<AttributesTable data={largeData} />);

      // Should show a collapsed placeholder, not the full value
      expect(screen.getByRole('button', { name: /click to expand/i })).toBeInTheDocument();
      // Full value should not be in the DOM
      expect(screen.queryByText(LARGE_VALUE)).not.toBeInTheDocument();
    });

    it('uses the normal JSON, copy, and link layout after expansion', () => {
      const largeJson = JSON.stringify({ hello: 'world', message: LARGE_VALUE });
      const largeData = makeAttributes([{ key: 'big_attr', value: largeJson }]);
      render(
        <AttributesTable
          data={largeData}
          linksGetter={() => [{ url: 'https://example.com', text: 'More info' }]}
        />
      );

      expect(screen.queryByTestId('copy-icon')).not.toBeInTheDocument();
      expect(screen.queryByTitle('More info')).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /click to expand/i }));

      const keyRow = screen.getByText('big_attr').closest('tr');
      expect(keyRow).toHaveClass('KeyValueTable--row-jsonKey');
      expect(keyRow.nextElementSibling).toHaveClass('KeyValueTable--row-jsonValue');
      expect(screen.getByTitle('More info')).toHaveAttribute('href', 'https://example.com');
      expect(screen.getAllByTestId('copy-icon')).toHaveLength(2);
    });

    it('keeps replacement attributes collapsed', () => {
      const initialData = makeAttributes([{ key: 'first', value: LARGE_VALUE }]);
      const { rerender } = render(<AttributesTable data={initialData} />);

      fireEvent.click(screen.getByRole('button', { name: /click to expand/i }));
      expect(screen.queryByRole('button', { name: /click to expand/i })).not.toBeInTheDocument();

      rerender(<AttributesTable data={makeAttributes([{ key: 'second', value: LARGE_VALUE }])} />);
      expect(screen.getByRole('button', { name: /click to expand/i })).toBeInTheDocument();
    });
  });
});

// AttributesTable's rich-JSON rendering is driven entirely by whether a value parses
// as JSON - it has no notion of "span" vs "span event" vs "resource" (all three route
// through this same component: span.attributes -> Tags, resource.attributes ->
// Process, event.attributes -> Logs), and it has no notion of "gen_ai.*" either. Per
// yurishkuro's review on #4335: a test that only exercises a gen_ai.* key would wrongly
// suggest the rich rendering is conditional on the key being gen_ai.* content, when
// it's actually unconditional - any key with a JSON-shaped value gets the same
// treatment, gen_ai or not. The 'abcd'/unrelated-key case below is the control that
// makes that explicit: identical JSON payload, unrelated key, same rendering.
describe('<AttributesTable> - JSON-shaped values render richly regardless of key or level', () => {
  const jsonPayload = [
    {
      role: 'user',
      parts: [{ type: 'text', content: 'Hello, probe message' }],
    },
  ];

  it('renders a gen_ai.* key with a JSON payload as a JSON tree, not raw text', () => {
    const data = [{ key: 'gen_ai.input.messages', value: JSON.stringify(jsonPayload) }];
    render(<AttributesTable data={makeAttributes(data)} />);

    const keyCell = screen.getByText('gen_ai.input.messages');
    const keyRow = keyCell.closest('tr');
    expect(keyRow).toHaveClass('KeyValueTable--row-jsonKey');

    const valueRow = keyRow.nextElementSibling;
    expect(valueRow).toHaveClass('KeyValueTable--row-jsonValue');
    expect(valueRow).toHaveTextContent('user');
    expect(valueRow).toHaveTextContent('Hello, probe message');
  });

  it('renders an unrelated, non-gen_ai key with the same JSON payload identically - the rendering is not gen_ai-specific', () => {
    const data = [{ key: 'abcd', value: JSON.stringify(jsonPayload) }];
    render(<AttributesTable data={makeAttributes(data)} />);

    const keyCell = screen.getByText('abcd');
    const keyRow = keyCell.closest('tr');
    expect(keyRow).toHaveClass('KeyValueTable--row-jsonKey');

    const valueRow = keyRow.nextElementSibling;
    expect(valueRow).toHaveClass('KeyValueTable--row-jsonValue');
    expect(valueRow).toHaveTextContent('user');
    expect(valueRow).toHaveTextContent('Hello, probe message');
  });
});

describe('<AttributesTable> - attribute filter', () => {
  const manyAttrs = Array.from({ length: 12 }, (_, i) => ({
    key: `key.${i}`,
    value: `value-${i}`,
  }));
  const getFilter = () => screen.getByRole('textbox', { name: /filter span attributes/i });
  const queryFilter = () => screen.queryByRole('textbox', { name: /filter span attributes/i });

  let user;

  beforeEach(() => {
    user = userEvent.setup();
  });

  it(`does not render the filter for ${FILTER_THRESHOLD} or fewer attributes`, () => {
    render(<AttributesTable data={makeAttributes(manyAttrs.slice(0, FILTER_THRESHOLD))} />);
    expect(queryFilter()).not.toBeInTheDocument();
  });

  it(`renders the filter for more than ${FILTER_THRESHOLD} attributes`, () => {
    render(<AttributesTable data={makeAttributes(manyAttrs)} />);
    expect(getFilter()).toBeInTheDocument();
    expect(screen.queryByText(/of 12/)).not.toBeInTheDocument();
  });

  it('filters rows by key, case-insensitively, and shows the match count', async () => {
    render(<AttributesTable data={makeAttributes(manyAttrs)} />);
    await user.type(getFilter(), 'KEY.1');

    // key.1, key.10 and key.11 match
    expect(screen.getAllByRole('row')).toHaveLength(3);
    expect(screen.getByText('3 of 12')).toBeInTheDocument();
  });

  it('filters rows by value', async () => {
    render(<AttributesTable data={makeAttributes(manyAttrs)} />);
    await user.type(getFilter(), 'value-0');

    expect(screen.getAllByRole('row')).toHaveLength(1);
    expect(screen.getByText('key.0')).toBeInTheDocument();
  });

  it('matches inside object values instead of "[object Object]"', async () => {
    const data = [...manyAttrs, { key: 'gen_ai.tool.call.arguments', value: { city: 'Paris' } }];
    render(<AttributesTable data={makeAttributes(data)} />);
    await user.type(getFilter(), 'paris');

    expect(screen.getByText('gen_ai.tool.call.arguments')).toBeInTheDocument();
    expect(screen.queryByText('key.0')).not.toBeInTheDocument();
  });

  it('matches large values without expanding them', async () => {
    const data = [...manyAttrs, { key: 'gen_ai.prompt', value: `${'x'.repeat(10_000)}needle` }];
    render(<AttributesTable data={makeAttributes(data)} />);
    await user.type(getFilter(), 'needle');

    expect(screen.getByText('gen_ai.prompt')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /click to expand/i })).toBeInTheDocument();
    expect(screen.getByText('1 of 13')).toBeInTheDocument();
  });

  it('clears the filter with the clear button and with Escape', async () => {
    render(<AttributesTable data={makeAttributes(manyAttrs)} />);
    const input = getFilter();

    await user.type(input, 'key.0');
    expect(screen.getAllByRole('row')).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: /clear filter/i }));
    expect(screen.getAllByRole('row')).toHaveLength(manyAttrs.length);
    expect(input).toHaveValue('');

    await user.type(input, 'key.0');
    expect(screen.getAllByRole('row')).toHaveLength(1);
    await user.keyboard('{Escape}');
    expect(screen.getAllByRole('row')).toHaveLength(manyAttrs.length);
    expect(input).toHaveValue('');
  });

  it('shows an empty state when nothing matches', async () => {
    render(<AttributesTable data={makeAttributes(manyAttrs)} />);
    await user.type(getFilter(), 'zzz');

    expect(screen.getAllByRole('row')).toHaveLength(1);
    expect(screen.getByText(/no attributes match/i)).toHaveTextContent('zzz');
  });

  it('resets the filter when the attributes change to another span', async () => {
    const { rerender } = render(<AttributesTable data={makeAttributes(manyAttrs)} />);
    await user.type(getFilter(), 'key.0');
    expect(screen.getAllByRole('row')).toHaveLength(1);

    const otherSpanAttrs = manyAttrs.map(({ key }) => ({ key, value: 'other' }));
    rerender(<AttributesTable data={makeAttributes(otherSpanAttrs)} />);

    expect(getFilter()).toHaveValue('');
    expect(screen.getAllByRole('row')).toHaveLength(otherSpanAttrs.length);
  });

  it('shows every row when the data drops below the threshold', async () => {
    const { rerender } = render(<AttributesTable data={makeAttributes(manyAttrs)} />);
    fireEvent.change(getFilter(), { target: { value: 'zzz' } });

    rerender(<AttributesTable data={makeAttributes(manyAttrs.slice(0, 3))} />);

    expect(queryFilter()).not.toBeInTheDocument();
    expect(screen.queryByText(/no attributes match/i)).not.toBeInTheDocument();
    expect(screen.getAllByRole('row')).toHaveLength(3);
  });

  it('passes the original index to linksGetter for filtered rows', async () => {
    const data = makeAttributes(manyAttrs);
    const linksGetter = vi.fn().mockReturnValue([]);
    render(<AttributesTable data={data} linksGetter={linksGetter} />);
    await user.type(getFilter(), 'value-5');

    expect(screen.getAllByRole('row')).toHaveLength(1);
    expect(linksGetter).toHaveBeenLastCalledWith(data, 5);
  });
});
