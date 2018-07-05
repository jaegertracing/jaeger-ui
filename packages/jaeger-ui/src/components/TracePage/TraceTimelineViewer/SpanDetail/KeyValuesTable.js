// @flow

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

import React from 'react';
import jsonMarkup from 'json-markup';
import { Dropdown, Icon, Menu } from 'antd';

import './KeyValuesTable.css';

function parseIfJson(value) {
  try {
    const data = JSON.parse(value);
    if (data && typeof data === 'object') {
      return data;
    }
    // eslint-disable-next-line no-empty
  } catch (_) {}
  return value;
}

function markupAsDiv(markup) {
  // eslint-disable-next-line react/no-danger
  return <div dangerouslySetInnerHTML={{ __html: markup }} />;
}

function markupAsSpan(markup) {
  // eslint-disable-next-line react/no-danger
  return (
    <span
      dangerouslySetInnerHTML={{
        __html: markup.replace(/^<div /i, '<span ').replace(/<\/div>$/i, '</span>'),
      }}
    />
  );
}

type KeyValuesTableProps = {
  data: { key: string, value: any }[],
  linksGetter: ?({ key: string, value: any }[], number) => { url: string, text: string }[],
};

export default function KeyValuesTable(props: KeyValuesTableProps) {
  const { data, linksGetter } = props;
  return (
    <div className="KeyValueTable u-simple-scrollbars">
      <table className="u-width-100">
        <tbody className="KeyValueTable--body">
          {data.map((row, i) => {
            const markup = jsonMarkup(parseIfJson(row.value));
            const links = linksGetter ? linksGetter(data, i) : null;
            let valueMarkup;
            if (links && links.length === 1) {
              valueMarkup = (
                <div>
                  <a href={links[0].url} title={links[0].text} target="_blank" rel="noopener noreferrer">
                    {markupAsSpan(markup)} <Icon className="KeyValueTable--linkIcon" type="export" />
                  </a>
                </div>
              );
            } else if (links && links.length > 1) {
              const menuItems = (
                <Menu>
                  {links.map((link, index) => {
                    const { text, url } = link;
                    return (
                      // `index` is necessary in the key because url can repeat
                      // eslint-disable-next-line react/no-array-index-key
                      <Menu.Item key={`${url}-${index}`}>
                        <a href={url} target="_blank" rel="noopener noreferrer">
                          {text}
                        </a>
                      </Menu.Item>
                    );
                  })}
                </Menu>
              );
              valueMarkup = (
                <div>
                  <Dropdown overlay={menuItems} placement="bottomRight" trigger={['click']}>
                    <a>
                      {markupAsSpan(markup)} <Icon className="KeyValueTable--linkIcon" type="profile" />
                    </a>
                  </Dropdown>
                </div>
              );
            } else {
              valueMarkup = markupAsDiv(markup);
            }
            return (
              // `i` is necessary in the key because row.key can repeat
              // eslint-disable-next-line react/no-array-index-key
              <tr key={`${row.key}-${i}`}>
                <td className="KeyValueTable--keyColumn">{row.key}</td>
                <td>{valueMarkup}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
