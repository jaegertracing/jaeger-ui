// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { Dropdown, Tooltip } from 'antd';
import { IoOpenOutline, IoList, IoCopyOutline, IoInformationCircleOutline } from 'react-icons/io5';
import { JsonView, allExpanded, collapseAllNested } from 'react-json-view-lite';

import jsonViewStyles from '../../../../utils/jsonViewStyles';

import CopyIcon from '../../../common/CopyIcon';

import { TNil } from '../../../../types';
import { Hyperlink } from '../../../../types/hyperlink';
import { IAttribute, IAttributes } from '../../../../types/otel';

import './AttributesTable.css';

// This sits well above the 200-character collapsed-summary limit, preserving
// normal attributes while deferring JSON.parse and JsonView for large GenAI
// payloads until the user asks to see them.
const LARGE_VALUE_THRESHOLD_CHARS = 10_000;

const jsonObjectOrArrayStartRegex = /^(\[|\{)/;

function tryParseJson(value: string) {
  // if the value is a string representing actual json object or array, then use json-markup
  // otherwise just return as is
  try {
    return jsonObjectOrArrayStartRegex.test(value) ? JSON.parse(value) : value;
  } catch {
    return value;
  }
}

function shouldDisplayAsStringList(key: string) {
  return key.startsWith('http.request.header.') || key.startsWith('http.response.header.');
}

const stringListMarkup = (value: any[]) => (
  <div className="json-markup">
    {value.map((item, i) => (
      <React.Fragment key={i}>
        {i > 0 && ', '}
        <span className="json-markup-string">{item}</span>
      </React.Fragment>
    ))}
  </div>
);

const scalarMarkup = (value: string | number | boolean) => {
  let className;
  switch (typeof value) {
    case 'boolean': {
      className = 'json-markup-bool';
      break;
    }
    case 'number': {
      className = 'json-markup-number';
      break;
    }
    default: {
      className = 'json-markup-string';
    }
  }
  return (
    <div className="json-markup">
      <span className={className}>{value.toString()}</span>
    </div>
  );
};

// isJsonTree distinguishes a parsed object/array (rendered as an interactive JsonView
// tree, which needs real width to be readable) from every other value shape (a scalar
// or a short string list, both fine sharing a row with the key). Callers use it to give
// JSON content its own full-width row instead of squeezing a tree into the narrow
// key:value column layout.
function formatValue(key: string, value: any): { node: React.ReactNode; isJsonTree: boolean } {
  let content;
  let parsed = value;
  let isJsonTree = false;

  if (typeof value === 'string') {
    parsed = tryParseJson(value);
  }

  if (Array.isArray(parsed) && shouldDisplayAsStringList(key)) {
    content = stringListMarkup(parsed);
  } else if (typeof parsed === 'object') {
    const shouldJsonTreeExpand = Object.keys(parsed).length <= 10;
    content = (
      <JsonView
        data={parsed}
        shouldExpandNode={shouldJsonTreeExpand ? allExpanded : collapseAllNested}
        style={jsonViewStyles}
      />
    );
    isJsonTree = true;
  } else {
    content = scalarMarkup(parsed);
  }

  return { node: <div className="ub-inline-block">{content}</div>, isJsonTree };
}

export const LinkValue = (props: { href: string; title?: string; children: React.ReactNode }) => (
  <a href={props.href} title={props.title || ''} target="_blank" rel="noopener noreferrer">
    {props.children} <IoOpenOutline className="KeyValueTable--linkIcon" />
  </a>
);

const linkValueList = (links: Hyperlink[]) => {
  return links.map(({ text, url }, index) => ({
    label: <LinkValue href={url}>{text}</LinkValue>,
    key: `${url}-${index}`,
  }));
};

// The filter only appears once a table is long enough to be hard to scan.
export const FILTER_THRESHOLD = 10;

// Objects and arrays stringify to "[object Object]" via String(), so they go
// through JSON.stringify to keep their content searchable. Uint8Array stays on
// String() because JSON.stringify turns a typed array into an index map.
function toSearchText(row: IAttribute): string {
  const { value } = row;
  let valueText;
  if (value !== null && typeof value === 'object' && !(value instanceof Uint8Array)) {
    try {
      valueText = JSON.stringify(value);
    } catch {
      valueText = String(value);
    }
  } else {
    valueText = String(value);
  }
  return `${row.key}\n${valueText}`.toLowerCase();
}

type AttributesTableProps = {
  data: IAttributes;
  linksGetter: ((pairs: IAttributes, index: number) => Hyperlink[]) | TNil;
};

// AttributesTable is displayed as a menu at span level.
// Example: https://github.com/jaegertracing/jaeger-ui/assets/94157520/b518cad9-cb37-4775-a3d6-b667a1235f89
export default function AttributesTable(props: AttributesTableProps) {
  const { data, linksGetter } = props;
  // Attribute entries are stable for a given IAttributes collection. Keeping
  // them in the set means a replacement entry starts collapsed automatically.
  const [expandedRows, setExpandedRows] = React.useState<Set<object>>(() => new Set());
  // The expansion renders as a transition so the click stays responsive while
  // JSON.parse and JsonView run. The rows being expanded are tracked outside
  // the transition so their buttons can show that the click was received.
  const [pendingRows, setPendingRows] = React.useState<Set<object>>(() => new Set());
  const [isPending, startTransition] = React.useTransition();

  const expandRow = React.useCallback(
    (row: object) => {
      setPendingRows(currentRows => new Set(currentRows).add(row));
      startTransition(() => {
        setExpandedRows(currentRows => new Set(currentRows).add(row));
      });
    },
    [startTransition]
  );

  const [query, setQuery] = React.useState('');
  // A different collection means a different span, so the old filter no longer applies.
  const [queryData, setQueryData] = React.useState(data);
  if (queryData !== data) {
    setQueryData(data);
    setQuery('');
  }
  // Filtering runs against the deferred query so typing stays responsive on
  // spans with many or very large attributes.
  const deferredQuery = React.useDeferredValue(query);
  const showFilter = data.size > FILTER_THRESHOLD;
  const normalizedQuery = showFilter ? deferredQuery.trim().toLowerCase() : '';

  // Search text is built lazily, at most once per row, instead of re-stringifying
  // every value on each keystroke. Keyed on the stable entry objects, like expandedRows.
  const [searchTextCache] = React.useState(() => new WeakMap<IAttribute, string>());
  const visibleRows = React.useMemo(() => {
    const rows = data.entries().map((row, index) => ({ row, index }));
    if (!normalizedQuery) return rows;
    return rows.filter(({ row }) => {
      let text = searchTextCache.get(row);
      if (text === undefined) {
        text = toSearchText(row);
        searchTextCache.set(row, text);
      }
      return text.includes(normalizedQuery);
    });
  }, [data, normalizedQuery, searchTextCache]);

  return (
    <div className="KeyValueTable u-simple-scrollbars">
      {showFilter && (
        <div className="KeyValueTable--filterRow">
          <input
            className="KeyValueTable--filter"
            type="text"
            placeholder="Filter attributes…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Escape' && setQuery('')}
            aria-label="Filter span attributes"
          />
          {normalizedQuery && (
            <>
              <span className="KeyValueTable--filterCount" aria-live="polite">
                {visibleRows.length} of {data.size}
              </span>
              <button
                type="button"
                className="KeyValueTable--clearButton"
                aria-label="Clear filter"
                onClick={() => setQuery('')}
              >
                ×
              </button>
            </>
          )}
        </div>
      )}
      <table className="u-width-100">
        <tbody className="KeyValueTable--body">
          {normalizedQuery && visibleRows.length === 0 && (
            <tr className="KeyValueTable--row">
              <td className="KeyValueTable--emptyState" colSpan={2}>
                No attributes match &ldquo;{deferredQuery.trim()}&rdquo;
              </td>
            </tr>
          )}
          {visibleRows.map(({ row, index: i }) => {
            const isLarge = typeof row.value === 'string' && row.value.length >= LARGE_VALUE_THRESHOLD_CHARS;
            const shouldDeferValue = isLarge && !expandedRows.has(row);
            const { node: jsonTable, isJsonTree } = shouldDeferValue
              ? { node: null, isJsonTree: false }
              : formatValue(row.key, row.value);
            const links = shouldDeferValue || !linksGetter ? null : linksGetter(data, i);

            let valueMarkup;
            if (shouldDeferValue) {
              const isExpanding = isPending && pendingRows.has(row);
              valueMarkup = (
                <button
                  type="button"
                  className="KeyValueTable--largeValuePlaceholder"
                  disabled={isExpanding}
                  onClick={() => expandRow(row)}
                >
                  {(row.value as string).length.toLocaleString()} chars —{' '}
                  {isExpanding ? 'expanding…' : 'click to expand'}
                </button>
              );
            } else if (links?.length === 1) {
              valueMarkup = (
                <div>
                  <LinkValue href={links[0].url} title={links[0].text}>
                    {jsonTable}
                  </LinkValue>
                </div>
              );
            } else if (links && links.length > 1) {
              valueMarkup = (
                <div>
                  <Dropdown
                    menu={{ items: linkValueList(links) }}
                    placement="bottomRight"
                    trigger={['click']}
                  >
                    <a>
                      {jsonTable} <IoList className="KeyValueTable--linkIcon" />
                    </a>
                  </Dropdown>
                </div>
              );
            } else {
              valueMarkup = jsonTable;
            }
            const isOtel = row.key.startsWith('otel.');
            const keyMarkup = isOtel ? (
              <span style={{ color: '#666', fontStyle: 'italic' }} className="is-otel-key">
                {row.key}
                <Tooltip title="Synthetic Attribute: This tag was generated to map OpenTelemetry semantics to the Jaeger data model. It may not be searchable in the storage directly.">
                  <IoInformationCircleOutline
                    style={{ marginLeft: '5px', verticalAlign: 'text-bottom', cursor: 'help' }}
                  />
                </Tooltip>
              </span>
            ) : (
              row.key
            );
            const copyButtons = !shouldDeferValue && (
              <div className="KeyValueTable--copyContainer">
                <CopyIcon
                  className="KeyValueTable--copyIcon"
                  copyText={String(row.value)}
                  tooltipTitle="Copy value"
                  buttonText="Copy"
                />
                <CopyIcon
                  className="KeyValueTable--copyIcon"
                  icon={<IoCopyOutline />}
                  copyText={JSON.stringify(row, null, 2)}
                  tooltipTitle="Copy JSON"
                  buttonText="JSON"
                />
              </div>
            );

            // `i` is necessary in the key because row.key can repeat
            const rowKey = `${row.key}-${i}`;

            // A JsonView tree needs real width to be readable - squeezed into the
            // key:value column split, deep/wide objects force horizontal scrolling
            // inside a narrow cell. Give it the key on its own row and the tree a
            // full-width row below, instead of sharing one row with the key column.
            if (isJsonTree) {
              return (
                <React.Fragment key={rowKey}>
                  <tr className="KeyValueTable--row KeyValueTable--row-jsonKey">
                    <td className="KeyValueTable--keyColumn" colSpan={2}>
                      {keyMarkup}
                    </td>
                  </tr>
                  <tr className="KeyValueTable--row KeyValueTable--row-jsonValue">
                    <td className="KeyValueTable--valueColumn KeyValueTable--valueColumn-full" colSpan={2}>
                      {copyButtons}
                      {valueMarkup}
                    </td>
                  </tr>
                </React.Fragment>
              );
            }

            return (
              <tr className="KeyValueTable--row" key={rowKey}>
                <td className="KeyValueTable--keyColumn">{keyMarkup}</td>
                <td className="KeyValueTable--valueColumn">
                  {copyButtons}
                  {valueMarkup}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
