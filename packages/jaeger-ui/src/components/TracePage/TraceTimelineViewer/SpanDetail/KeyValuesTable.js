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

import * as React from 'react';
import jsonMarkup from 'json-markup';
import { Dropdown, Icon, Menu, Tooltip } from 'antd';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import type { KeyValuePair, Link } from '../../../../types/trace';

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

export const LinkValue = (props: { href: string, title?: string, children: React.Node }) => (
  <a href={props.href} title={props.title} target="_blank" rel="noopener noreferrer">
    {props.children} <Icon className="KeyValueTable--linkIcon" type="export" />
  </a>
);

const linkValueList = (links: Link[]) => (
  <Menu>
    {links.map(({ text, url }, index) => (
      // `index` is necessary in the key because url can repeat
      // eslint-disable-next-line react/no-array-index-key
      <Menu.Item key={`${url}-${index}`}>
        <LinkValue href={url}>{text}</LinkValue>
      </Menu.Item>
    ))}
  </Menu>
);

type KeyValuesTableProps = {
  data: KeyValuePair[],
  linksGetter: ?(KeyValuePair[], number) => Link[],
};

type KeyValuesTableState = {
  copiedRows: Set<KeyValuePair>,
};

export default class KeyValuesTable extends React.PureComponent<KeyValuesTableProps, KeyValuesTableState> {
  props: KeyValuesTableProps;

  constructor(props: KeyValuesTableProps) {
    super(props);

    this.state = {
      copiedRows: new Set(),
    };
  }

  handleCopyIconClick = (row: KeyValuePair) => {
    const newCopiedRows = new Set(this.state.copiedRows);
    newCopiedRows.add(row);
    this.setState({
      copiedRows: newCopiedRows,
    });
  };

  handleTooltipVisibilityChange = (row: KeyValuePair, visible: boolean) => {
    if (!visible && this.state.copiedRows.has(row)) {
      const newCopiedRows = new Set(this.state.copiedRows);
      newCopiedRows.delete(row);
      this.setState({
        copiedRows: newCopiedRows,
      });
    }
  };

  render() {
    const { data, linksGetter } = this.props;
    return (
      <div className="KeyValueTable u-simple-scrollbars">
        <table className="u-width-100">
          <tbody className="KeyValueTable--body">
            {data.map((row, i) => {
              const tooltipTitle = this.state.copiedRows.has(row) ? 'Copied' : 'Copy JSON';
              const markup = {
                __html: jsonMarkup(parseIfJson(row.value)),
              };
              // eslint-disable-next-line react/no-danger
              const jsonTable = <div className="ub-inline-block" dangerouslySetInnerHTML={markup} />;
              const links = linksGetter ? linksGetter(data, i) : null;
              let valueMarkup;
              if (links && links.length === 1) {
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
                <tr key={`${row.key}-${i}`}>
                  <td className="KeyValueTable--keyColumn">{row.key}</td>
                  <td>{valueMarkup}</td>
                  <td className="KeyValueTable--copyColumn">
                    <Tooltip
                      arrowPointAtCenter
                      mouseLeaveDelay={0.5}
                      onVisibleChange={visible => this.handleTooltipVisibilityChange(row, visible)}
                      placement={'left'}
                      title={tooltipTitle}
                    >
                      <CopyToClipboard text={JSON.stringify(row, null, 2)}>
                        <Icon
                          className="KeyValueTable--copyIcon"
                          onClick={() => this.handleCopyIconClick(row)}
                          type="copy"
                        />
                      </CopyToClipboard>
                    </Tooltip>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }
}
