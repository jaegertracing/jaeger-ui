// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import AttributesTable, { LinkValue } from './AttributesTable';

jest.mock('../../../common/CopyIcon', () => {
  return function CopyIcon({ copyText, tooltipTitle, buttonText, icon, className }) {
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
  };
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
