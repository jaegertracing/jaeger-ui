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

type KeyValuesTableProps = {
  data: { key: string, value: any }[],
};

export default function KeyValuesTable(props: KeyValuesTableProps) {
  const { data } = props;
  return (
    <div className="KeyValueTable u-simple-scrollbars">
      <table className="u-width-100">
        <tbody className="KeyValueTable--body">
          {data.map((row, i) => {
            const jsonTable = (
              // eslint-disable-next-line react/no-danger
              <div dangerouslySetInnerHTML={{ __html: jsonMarkup(parseIfJson(row.value)) }} />
            );
            return (
              // `i` is necessary in the key because row.key can repeat
              // eslint-disable-next-line react/no-array-index-key
              <tr key={`${row.key}-${i}`}>
                <td className="KeyValueTable--keyColumn">{row.key}</td>
                <td>{jsonTable}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
