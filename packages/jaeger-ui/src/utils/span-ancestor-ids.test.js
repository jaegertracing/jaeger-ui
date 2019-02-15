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

import spanAncestorIdsSpy from './span-ancestor-ids';

describe('spanAncestorIdsSpy', () => {
  const ownSpanID = 'ownSpanID';
  const firstParentSpanID = 'firstParentSpanID';
  const firstParentFirstGrandparentSpanID = 'firstParentFirstGrandparentSpanID';
  const firstParentSecondGrandparentSpanID = 'firstParentSecondGrandparentSpanID';
  const secondParentSpanID = 'secondParentSpanID';
  const secondParentFirstGrandparentSpanID = 'secondParentFirstGrandparentSpanID';
  const secondParentSecondGrandparentSpanID = 'secondParentSecondGrandparentSpanID';
  const secondParentGreatGrandParentId = 'secondParentGreatGrandParentId';
  const rootSpanID = 'rootSpanID';
  const span = {
    references: [
      {
        span: {
          spanID: firstParentSpanID,
          references: [
            {
              span: {
                spanID: firstParentFirstGrandparentSpanID,
                references: [
                  {
                    span: {
                      spanID: rootSpanID,
                    },
                  },
                ],
              },
            },
            {
              span: {
                spanID: firstParentSecondGrandparentSpanID,
                references: [
                  {
                    span: {
                      spanID: rootSpanID,
                    },
                  },
                ],
              },
            },
          ],
        },
      },
      {
        span: {
          spanID: secondParentSpanID,
          references: [
            {
              span: {
                spanID: secondParentFirstGrandparentSpanID,
                references: [
                  {
                    span: {
                      spanID: secondParentGreatGrandParentId,
                      references: [
                        {
                          span: {
                            spanID: rootSpanID,
                          },
                        },
                      ],
                    },
                  },
                ],
              },
            },
            {
              span: {
                spanID: secondParentSecondGrandparentSpanID,
                references: [
                  {
                    span: {
                      spanID: secondParentGreatGrandParentId,
                      references: [
                        {
                          span: {
                            spanID: rootSpanID,
                          },
                        },
                      ],
                    },
                  },
                ],
              },
            },
          ],
        },
      },
    ],
    spanID: ownSpanID,
  };

  it('should return an empty array if given falsy span', () => {
    expect(spanAncestorIdsSpy(null)).toEqual([]);
  });

  it('should return an empty array if span has no references', () => {
    const spanWithoutReferences = {
      spanID: 'parentlessSpanID',
      references: [],
    };

    expect(spanAncestorIdsSpy(spanWithoutReferences)).toEqual([]);
  });

  it('should return all unique spanIDs from all references up to the root span', () => {
    expect(spanAncestorIdsSpy(span)).toEqual([
      firstParentSpanID,
      secondParentSpanID,
      firstParentFirstGrandparentSpanID,
      firstParentSecondGrandparentSpanID,
      secondParentFirstGrandparentSpanID,
      secondParentSecondGrandparentSpanID,
      rootSpanID,
      secondParentGreatGrandParentId,
    ]);
  });

  it('should handles references without a span', () => {
    const emptyReferencesSpanID = 'emptyReferencesSpanID';
    const spanWithEmptyReferences = {
      spanID: emptyReferencesSpanID,
      references: [{}, null, 'incorrectlyDefinedReferenceSpanID'],
    };
    const spanWithSomeEmptyReferences = {
      ...span,
      references: [{ span: spanWithEmptyReferences }],
    };
    expect(spanAncestorIdsSpy(spanWithSomeEmptyReferences)).toEqual([emptyReferencesSpanID]);
  });
});
