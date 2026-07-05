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
import { IAttribute } from '../../../../types/otel';

import './AttributesTable.css';

// .length counts UTF-16 code units, not bytes. Non-ASCII strings may be larger
// in memory than this number suggests, but this threshold is a reasonable proxy
// for "expensive to render synchronously".
const LARGE_VALUE_THRESHOLD_CHARS = 10_000;

// Allow leading whitespace so indented/pretty-printed JSON is also detected
const jsonObjectOrArrayStartRegex = /^\s*[{[]/;

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

function formatValue(key: string, value: any) {
  let content;
  let parsed = value;

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
  } else {
    content = scalarMarkup(parsed);
  }

  return <div className="ub-inline-block">{content}</div>;
}

function formatSize(chars: number) {
  if (chars < 1024) return `${chars} chars`;
  return `${(chars / 1024).toFixed(1)} KB`;
}

/**
 * LargeValueCell renders a collapsed placeholder for large attribute values and
 * expands them lazily on click. Keeping state in a dedicated component (rather
 * than a closure inside .map) is required by the Rules of Hooks.
 */
function LargeValueCell({ attrKey, value }: { attrKey: string; value: string }) {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [isDeferredLoaded, setIsDeferredLoaded] = React.useState(false);

  // useEffect (not a click-handler return) so the timeout is properly cleaned up
  // if the component unmounts or the user collapses before 50 ms elapses.
  React.useEffect(() => {
    if (!isExpanded || isDeferredLoaded) return undefined;
    const t = setTimeout(() => setIsDeferredLoaded(true), 50);
    return () => clearTimeout(t);
  }, [isExpanded, isDeferredLoaded]);

  if (!isExpanded) {
    return (
      <button
        type="button"
        className="KeyValueTable--largeValuePlaceholder"
        onClick={() => setIsExpanded(true)}
      >
        {formatSize(value.length)} — click to expand
      </button>
    );
  }

  if (!isDeferredLoaded) {
    return <span className="KeyValueTable--largeValueLoading">Parsing…</span>;
  }

  return <div className="ub-inline-block">{formatValue(attrKey, value)}</div>;
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

type AttributesTableProps = {
  data: ReadonlyArray<IAttribute>;
  linksGetter: ((pairs: ReadonlyArray<IAttribute>, index: number) => Hyperlink[]) | TNil;
};

// AttributesTable is displayed as a menu at span level.
// Example: https://github.com/jaegertracing/jaeger-ui/assets/94157520/b518cad9-cb37-4775-a3d6-b667a1235f89
export default function AttributesTable(props: AttributesTableProps) {
  const { data, linksGetter } = props;

  return (
    <div className="KeyValueTable u-simple-scrollbars">
      <table className="u-width-100">
        <tbody className="KeyValueTable--body">
          {data.map((row, i) => {
            const isLarge = typeof row.value === 'string' && row.value.length >= LARGE_VALUE_THRESHOLD_CHARS;
            const jsonTable = isLarge ? null : formatValue(row.key, row.value);
            const links = linksGetter ? linksGetter(data, i) : null;

            let valueMarkup;
            if (isLarge) {
              // Render lazily inline — preserves ordering, count, and linksGetter is still
              // available in the same row if needed in the future.
              valueMarkup = <LargeValueCell attrKey={row.key} value={row.value as string} />;
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

            return (
              // `i` is necessary in the key because row.key can repeat
              <tr className="KeyValueTable--row" key={`${row.key}-${i}`}>
                <td className="KeyValueTable--keyColumn">{keyMarkup}</td>
                <td className="KeyValueTable--valueColumn">
                  {!isLarge && (
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
                  )}
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
