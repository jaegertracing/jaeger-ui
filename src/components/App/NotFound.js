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

import React, { PropTypes } from 'react';
import { Link } from 'react-router';

export default function NotFound({ error }) {
  return (
    <section className="ui container">
      <div className="ui center aligned basic segment">
        <div className="ui center aligned basic segment">
          <h1>{'404'}</h1>
          <p>
            {"Looks like you tried to access something that doesn't exist."}
          </p>
        </div>
        {error &&
          <div className="ui red message">
            <p>{error.toString()}</p>
          </div>}
        <div className="ui center aligned basic segment">
          <Link to="/">{'Back home'}</Link>
        </div>
      </div>
    </section>
  );
}

NotFound.propTypes = {
  error: PropTypes.object,
};
