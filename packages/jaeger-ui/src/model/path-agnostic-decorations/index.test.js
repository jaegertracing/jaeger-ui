// Copyright (c) 2020 Uber Technologies, Inc.
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

import _set from 'lodash/set';
import queryString from 'query-string';

import extractDecorationFromState from '.';

describe('extractDecorationFromState', () => {
  const decorationID = 'test decoration id';
  const service = 'test service';
  const operation = 'test operation';
  const decorationValue = 42;
  const decorationMax = 108;

  function makeState({ decoration = decorationID, opValue, opMax, withoutOpValue, withoutOpMax }) {
    const state = {};
    const deco = Array.isArray(decoration) ? decoration[0] : decoration;

    _set(state, 'router.location.search', decoration ? queryString.stringify({ decoration }) : '');
    if (opValue !== undefined)
      _set(state, `pathAgnosticDecorations.${deco}.withOp.${service}.${operation}`, opValue);
    if (opMax !== undefined) _set(state, `pathAgnosticDecorations.${deco}.withOpMax`, opMax);
    if (withoutOpValue !== undefined)
      _set(state, `pathAgnosticDecorations.${deco}.withoutOp.${service}`, withoutOpValue);
    if (withoutOpMax !== undefined) _set(state, `pathAgnosticDecorations.${deco}.withoutOpMax`, withoutOpMax);

    return state;
  }

  function extractWrapper(stateArgs, svpOp = { service, operation }) {
    return extractDecorationFromState(makeState(stateArgs), svpOp);
  }

  it('returns an empty object if url lacks a decorationID', () => {
    expect(extractWrapper({ decoration: null })).toEqual({});
  });

  it('prefers operation specific decoration over service decoration', () => {
    const otherValue = 'other value';
    const otherMax = 'other max';
    const res = extractWrapper({
      opValue: decorationValue,
      opMax: decorationMax,
      withoutOpValue: otherValue,
      withoutOpMax: otherMax,
    });
    expect(res).toEqual(
      expect.objectContaining({
        decorationID,
        decorationValue,
      })
    );
    expect(res.decorationProgressbar).toMatchSnapshot();
  });

  it('returns service decoration', () => {
    const res = extractWrapper({
      withoutOpValue: decorationValue,
      withoutOpMax: decorationMax,
    });
    expect(res).toEqual(
      expect.objectContaining({
        decorationID,
        decorationValue,
      })
    );
    expect(res.decorationProgressbar).toMatchSnapshot();
  });

  it('omits CircularProgressbar if value is a string', () => {
    const withoutOpValue = 'without op string value';
    const res = extractWrapper({
      withoutOpValue,
      withoutOpMax: decorationMax,
    });
    expect(res).toEqual({
      decorationID,
      decorationValue: withoutOpValue,
      decorationProgressbar: undefined,
    });
  });

  it('uses first decoration if multiple exist in url', () => {
    const withoutOpValue = 'without op string value';
    const res = extractWrapper({
      decoration: [decorationID, `not-${decorationID}`],
      withoutOpValue,
      withoutOpMax: decorationMax,
    });
    expect(res).toEqual({
      decorationID,
      decorationValue: withoutOpValue,
      decorationProgressbar: undefined,
    });
  });
});
