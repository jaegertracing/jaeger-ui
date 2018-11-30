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

import * as embedded from './index';

describe('isEmbed', () => {
  it('query request a embed component', () => {
    const query = 'embed=v0&hideGraph&mapCollapsed';
    expect(embedded.isEmbed(query)).toBeTruthy();
  });

  it('query request a embed component with an icorrect version', () => {
    const query = 'embed=v1&hideGraph&mapCollapsed';
    expect(embedded.isEmbed(query)).toBeFalsy();
  });

  it('query not request a embed component', () => {
    const query = 'hideGraph&mapCollapsed';
    expect(embedded.isEmbed(query)).toBeFalsy();
  });
});
