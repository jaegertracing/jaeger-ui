// Copyright (c) 2017 Uber Technologies, Inc.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.

import React from 'react';
import jsonMarkup from 'json-markup';
import PropTypes from 'prop-types';

import './KeyValuesTable.css';

function parseOrPass(value) {
  try {
    return JSON.parse(value);
  } catch (_) {
    return value;
  }
}

export default function KeyValuesTable(props) {
  const { data } = props;
  return (
    <div className="KeyValueTable">
      <table className="ui very striped compact table">
        <tbody className="KeyValueTable--body">
          {data.map((row, i) =>
            // `i` is necessary in the key because row.key can repeat
            // eslint-disable-next-line react/no-array-index-key
            <tr key={`${row.key}-${i}`}>
              <td className="KeyValueTable--keyColumn">
                {row.key}
              </td>
              <td>
                <div dangerouslySetInnerHTML={{ __html: jsonMarkup(parseOrPass(row.value)) }} />
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

KeyValuesTable.propTypes = {
  data: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string,
      value: PropTypes.any,
    })
  ).isRequired,
};
