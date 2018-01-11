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

import './ErrorMessage.css';

type ErrorMessageProps = {
  className?: string,
  error:
    | string
    | {
        message: string,
        httpStatus?: any,
        httpStatusText?: string,
        httpUrl?: string,
        httpQuery?: string,
        httpBody?: string,
      },
};

function ErrorAttr({ name, value }: { name: string, value: any }) {
  return (
    <tr>
      <td className="ErrorMessage--attr">{name}</td>
      <td className="ErrorMessage--value">{value}</td>
    </tr>
  );
}

export default function ErrorMessage({ className, error }: ErrorMessageProps) {
  if (!error) {
    return null;
  }
  if (typeof error === 'string') {
    return (
      <div className={`ErrorMessage ${className || ''}`}>
        <h3 className="ErrorMessage--msg">{error}</h3>
      </div>
    );
  }
  const { message, httpStatus, httpStatusText, httpUrl, httpQuery, httpBody } = error;
  const bodyExcerpt = httpBody && httpBody.length > 1024 ? `${httpBody.slice(0, 1021).trim()}...` : httpBody;
  return (
    <div className={`ErrorMessage ${className || ''}`}>
      <h2 className="ErrorMessage--msg">{message}</h2>
      <div className="ErrorMessage--details u-simple-scrollbars">
        <table>
          <tbody>
            {httpStatus ? <ErrorAttr name="Status" value={httpStatus} /> : null}
            {httpStatusText ? <ErrorAttr name="Status text" value={httpStatusText} /> : null}
            {httpUrl ? <ErrorAttr name="URL" value={httpUrl} /> : null}
            {httpQuery ? <ErrorAttr name="Query" value={httpQuery} /> : null}
            {bodyExcerpt ? <ErrorAttr name="Response body" value={bodyExcerpt} /> : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

ErrorMessage.defaultProps = {
  className: undefined,
};
