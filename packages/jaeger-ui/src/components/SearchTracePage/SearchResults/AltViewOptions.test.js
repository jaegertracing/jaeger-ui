// Copyright (c) 2019 Uber Technologies, Inc.
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
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from 'antd';

import AltViewOptions from './AltViewOptions';
import * as url from '../../DeepDependencies/url';
import * as getConfig from '../../../utils/config/get-config';

describe('AltViewOptions', () => {
  let getConfigValueSpy;
  let getUrlSpy;
  let getUrlStateSpy;
  let openSpy;

  let rendered;
  beforeEach(() => {
    rendered = render(<AltViewOptions {...props} / data-testid="altviewoptions">));
  });

  afterAll(() => {
    openSpy.mockRestore();
  });

  it('renders correct label', () => {
    expect(getLabel()).toBe('Deep Dependency Graph');

    rendered = render({ traceResultsView: false });
    expect(getLabel()).toBe('Trace Results');
  });

  it('renders button to view full ddg iff ddg is enabled and search results are viewed as ddg', () => {
    expect(getLabel()).toBe('Deep Dependency Graph');
    expect(screen.getAllByTestId(Button)).toHaveLength(1);

    getConfigValueSpy.mockReturnValue(true);
    rendered = render({ traceResultsView: false });
    expect(screen.getAllByTestId(Button)).toHaveLength(2);
    expect(getLabel()).toBe('Trace Results');
    expect(getLabel(1)).toBe('View All Dependencies');

    rendered = render({ traceResultsView: true });
    expect(getLabel()).toBe('Deep Dependency Graph');
    expect(screen.getAllByTestId(Button)).toHaveLength(1);
  });

  it('opens correct ddg url with correct target when view full ddg button is clicked', () => {
    const mockUrl = 'test url';
    const mockUrlState = { service: 'serviceName', showOp: true };
    getConfigValueSpy.mockReturnValue(true);
    getUrlSpy.mockReturnValue(mockUrl);
    getUrlStateSpy.mockReturnValue(mockUrlState);

    rendered = render({ traceResultsView: false });
    const viewDdgBtn = getBtn(1);
    viewDdgBtn.simulate('click', {});
    expect(getUrlSpy).toHaveBeenLastCalledWith(mockUrlState);
    expect(openSpy).toHaveBeenLastCalledWith(mockUrl, '_self');

    viewDdgBtn.simulate('click', { ctrlKey: true });
    expect(openSpy).toHaveBeenLastCalledWith(mockUrl, '_blank');

    viewDdgBtn.simulate('click', { metaKey: true });
    expect(openSpy).toHaveBeenLastCalledWith(mockUrl, '_blank');
  });
});
