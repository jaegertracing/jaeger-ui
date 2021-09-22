// Copyright (c) 2017 Uber Technologies, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import * as React from 'react';
import jsonMarkup from 'json-markup';
import { Dropdown, Icon, Menu } from 'antd';

import CopyIcon from '../../../common/CopyIcon';

import { TNil } from '../../../../types';
import { KeyValuePair, Link } from '../../../../types/trace';

import './KeyValuesTable.css';

const jsonObjectOrArrayStartRegex = /^(\[|\{)/;

function tryParseJson(value: string) {
  // if the value is a string representing actual json object or array, then use json-markup
  // otherwise just return as is
  try {
    return jsonObjectOrArrayStartRegex.test(value) ? JSON.parse(value) : value;
  } catch (_) {
    return value;
  }
}

const stringMarkup = (value: string) => (
  <div className="json-markup">
    <span className="json-markup-string">{value}</span>
  </div>
);

function _jsonMarkup(value: any) {
  const markup = { __html: jsonMarkup(value) };

  return (
    // eslint-disable-next-line react/no-danger
    <div dangerouslySetInnerHTML={markup} />
  );
}

function formatValue(value: any) {
  let content;

  if (typeof value === 'string') {
    const parsed = tryParseJson(value);
    content = typeof parsed === 'string' ? stringMarkup(parsed) : _jsonMarkup(parsed);
  } else {
    content = _jsonMarkup(value);
  }

  return <div className="ub-inline-block">{content}</div>;
}

export const LinkValue = (props: { link: any; children: React.ReactNode }) => {
  return props.link.url ? (
    <a href={props.link.url} title={props.link.text} target="_blank" rel="noopener noreferrer">
      {props.children} <Icon className="KeyValueTable--linkIcon" type="export" />
    </a>
  ) : (
    <a onClick={props.link.action} title={props.link.text} role="button">
      {props.children} <Icon className="KeyValueTable--linkIcon" type="export" />
    </a>
  );
};

LinkValue.defaultProps = {
  title: '',
};

const linkValueList = (links: Link[]) => (
  <Menu>
    {links.map((link: Link, index) => (
      // `index` is necessary in the key because url can repeat
      // eslint-disable-next-line react/no-array-index-key
      <Menu.Item key={`${link.url || link.action}-${index}`}>
        <LinkValue link={link}>{link.text}</LinkValue>
      </Menu.Item>
    ))}
  </Menu>
);

type KeyValuesTableProps = {
  data: KeyValuePair[];
  linksGetter: ((pairs: KeyValuePair[], index: number) => Link[]) | TNil;
};

export default function KeyValuesTable(props: KeyValuesTableProps) {
  const { data, linksGetter } = props;

  return (
    <div className="KeyValueTable u-simple-scrollbars">
      <table className="u-width-100">
        <tbody className="KeyValueTable--body">
          {data.map((row, i) => {
            const jsonTable = formatValue(row.value);
            const links = linksGetter ? linksGetter(data, i) : null;

            let valueMarkup;
            if (links && links.length === 1) {
              valueMarkup = (
                <div>
                  <LinkValue link={links[0]}>{jsonTable}</LinkValue>
                </div>
              );
            } else if (links && links.length > 1) {
              valueMarkup = (
                <div>
                  <Dropdown overlay={linkValueList(links)} placement="bottomRight" trigger={['click']}>
                    <a>
                      {jsonTable} <Icon className="KeyValueTable--linkIcon" type="profile" />
                    </a>
                  </Dropdown>
                </div>
              );
            } else {
              valueMarkup = jsonTable;
            }
            return (
              // `i` is necessary in the key because row.key can repeat
              // eslint-disable-next-line react/no-array-index-key
              <tr className="KeyValueTable--row" key={`${row.key}-${i}`}>
                <td className="KeyValueTable--keyColumn">{row.key}</td>
                <td>{valueMarkup}</td>
                <td className="KeyValueTable--copyColumn">
                  <CopyIcon
                    className="KeyValueTable--copyIcon"
                    copyText={JSON.stringify(row, null, 2)}
                    tooltipTitle="Copy JSON"
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
