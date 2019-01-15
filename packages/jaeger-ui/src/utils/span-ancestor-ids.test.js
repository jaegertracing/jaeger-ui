// Copyright (c) 2018 Uber Technologies, Inc.
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

/*
  props.;
  */
import spanAncestorIdsSpy from './span-ancestor-ids';

describe('spanAncestorIdsSpy', () => {
  it('should return an empty array if given falsy span', () => {
    expect(spanAncestorIdsSpy(null)).toEqual([]);
  });

  it('should return an empty array if span has no CHILD_OF references', () => {
    const span = {
      spanID: 'parentlessSpanID',
      references: [
        {
          refType: 'NOT_CHILD_OF',
          span: {
            spanID: 'notAParentSpanID',
            references: [],
          },
        },
      ],
    };

    expect(spanAncestorIdsSpy(span)).toEqual([]);
  });

  it('should return all spanIDs following CHILD_OF reference of parents', () => {
    const ownSpanID = 'ownSpanID';
    const parentSpanID = 'parentSpanID';
    const rootSpanID = 'rootSpanID';
    const span = {
      references: [
        {
          refType: 'CHILD_OF',
          span: {
            spanID: parentSpanID,
            references: [
              {
                refType: 'CHILD_OF',
                span: {
                  spanID: rootSpanID,
                },
              },
            ],
          },
        },
      ],
      spanID: ownSpanID,
    };

    expect(spanAncestorIdsSpy(span)).toEqual([parentSpanID, rootSpanID]);
  });
});
