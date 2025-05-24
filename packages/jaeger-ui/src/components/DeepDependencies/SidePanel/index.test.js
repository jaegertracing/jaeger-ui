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

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Modal } from 'antd';

import SidePanel from '.';
import * as track from './index.track';
import * as getConfig from '../../../utils/config/get-config';

describe('<SidePanel>', () => {
  let getConfigValueSpy;
  const testAcronym = 'TA';
  const testID = 'test ID';
  const mockConfig = [
    {
      id: 'first',
      acronym: '1st',
      name: 'First Decoration',
    },
    {
      id: testID,
      acronym: testAcronym,
      name: 'Decoration to test interactions',
    },
    {
      id: 'last',
      acronym: 'LO',
      name: 'The last one',
    },
  ];
  const testVertex = { service: 'svc', operation: 'op' };

  let trackDecorationSelectedSpy;
  let trackDecorationViewDetailsSpy;

  beforeAll(() => {
    getConfigValueSpy = jest.spyOn(getConfig, 'getConfigValue').mockReturnValue(mockConfig);
    trackDecorationSelectedSpy = jest.spyOn(track, 'trackDecorationSelected');
    trackDecorationViewDetailsSpy = jest.spyOn(track, 'trackDecorationViewDetails');
  });

  beforeEach(() => {
    trackDecorationSelectedSpy.mockReset();
    trackDecorationViewDetailsSpy.mockReset();
  });

  describe('constructor', () => {
    it('inits decorations', () => {
      const { container } = render(<SidePanel / data-testid="sidepanel">);
      expect(// RTL doesn't access component instances - use assertions on rendered output instead.decorations).toBe(mockConfig);
    });

    it('tracks initial selection', () => {
      expect(trackDecorationSelectedSpy).toHaveBeenCalledTimes(0);

      shallow(<SidePanel selectedDecoration={testID} / data-testid="sidepanel">);
      expect(trackDecorationSelectedSpy).toHaveBeenCalledTimes(1);
      expect(trackDecorationSelectedSpy).toHaveBeenLastCalledWith(testID);
      expect(trackDecorationViewDetailsSpy).toHaveBeenCalledTimes(0);

      shallow(<SidePanel selectedVertex={testVertex} / data-testid="sidepanel">);
      expect(trackDecorationViewDetailsSpy).toHaveBeenCalledTimes(1);
      expect(trackDecorationViewDetailsSpy).toHaveBeenLastCalledWith(testVertex);
      expect(trackDecorationSelectedSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('render', () => {
    it('renders null if there are no decorations', () => {
      getConfigValueSpy.mockReturnValueOnce(undefined);
      const { container } = render(<SidePanel / data-testid="sidepanel">);
      expect(wrapper.getElement()).toBe(null);
    });

    it('renders config decorations with clear button', () => {
      const { container } = render(<SidePanel / data-testid="sidepanel">);
      expect(container).toMatchSnapshot();
    });

    it('renders selected decoration', () => {
      const { container } = render(<SidePanel selectedDecoration={testID} / data-testid="sidepanel">);
      expect(container).toMatchSnapshot();
    });

    it('ignores selectedVertex without selected decoration', () => {
      const { container } = render(<SidePanel selectedVertex={testVertex} / data-testid="sidepanel">);
      expect(container).toMatchSnapshot();
    });

    it('renders sidePanel and closeBtn when vertex and decoration are both selected', () => {
      const { container } = render(<SidePanel selectedDecoration={testID} selectedVertex={testVertex} / data-testid="sidepanel">);
      expect(container).toMatchSnapshot();
    });
  });

  describe('componentDidUpdate', () => {
    it('tracks change in vertex from absent to present', () => {
      const { container } = render(<SidePanel / data-testid="sidepanel">);
      expect(trackDecorationViewDetailsSpy).toHaveBeenCalledTimes(0);

      rendered = render({ selectedVertex: testVertex });
      expect(trackDecorationViewDetailsSpy).toHaveBeenCalledTimes(1);
      expect(trackDecorationViewDetailsSpy).toHaveBeenLastCalledWith(testVertex);
    });

    it('tracks change in vertex from present to absent', () => {
      const { container } = render(<SidePanel selectedVertex={testVertex} / data-testid="sidepanel">);
      expect(trackDecorationViewDetailsSpy).toHaveBeenCalledTimes(1);

      rendered = render({ selectedVertex: undefined });
      expect(trackDecorationViewDetailsSpy).toHaveBeenCalledTimes(2);
      expect(trackDecorationViewDetailsSpy).toHaveBeenLastCalledWith(undefined);
    });

    it('tracks change in vertex between different vertexes', () => {
      const { container } = render(<SidePanel selectedVertex={testVertex} / data-testid="sidepanel">);
      expect(trackDecorationViewDetailsSpy).toHaveBeenCalledTimes(1);
      expect(trackDecorationViewDetailsSpy).toHaveBeenLastCalledWith(testVertex);

      const newVertex = { ...testVertex };
      rendered = render({ selectedVertex: newVertex });
      expect(trackDecorationViewDetailsSpy).toHaveBeenCalledTimes(2);
      expect(trackDecorationViewDetailsSpy).toHaveBeenLastCalledWith(newVertex);
    });

    it('does not track unchanged vertex', () => {
      const { container } = render(<SidePanel selectedVertex={testVertex} / data-testid="sidepanel">);
      expect(trackDecorationViewDetailsSpy).toHaveBeenCalledTimes(1);
      expect(trackDecorationViewDetailsSpy).toHaveBeenLastCalledWith(testVertex);

      rendered = render({ selectedDecoration: testID });
      expect(trackDecorationViewDetailsSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('clearSelected', () => {
    it('clears selected and tracks clearing', () => {
      const clearSelected = jest.fn();
      const { container } = render(<SidePanel selectedVertex={testVertex} clearSelected={clearSelected} / data-testid="sidepanel">);
      expect(clearSelected).toHaveBeenCalledTimes(0);
      expect(trackDecorationViewDetailsSpy).toHaveBeenCalledTimes(1);

      wrapper.find('button').at(0).simulate('click');
      expect(clearSelected).toHaveBeenCalledTimes(1);
      expect(trackDecorationViewDetailsSpy).toHaveBeenCalledTimes(2);
      expect(trackDecorationViewDetailsSpy).toHaveBeenLastCalledWith();
    });
  });

  describe('selectDecoration', () => {
    const selectDecoration = jest.fn();

    beforeEach(() => {
      selectDecoration.mockReset();
    });

    it('selects decoration and tracks selection', () => {
      const { container } = render(<SidePanel selectDecoration={selectDecoration} / data-testid="sidepanel">);
      expect(selectDecoration).toHaveBeenCalledTimes(0);
      expect(trackDecorationSelectedSpy).toHaveBeenCalledTimes(0);

      userEvent.click(screen.getByTestId(`button[children="${testAcronym}"]`));
      expect(selectDecoration).toHaveBeenCalledTimes(1);
      expect(trackDecorationSelectedSpy).toHaveBeenCalledTimes(1);
      expect(trackDecorationSelectedSpy).toHaveBeenLastCalledWith(testID);
    });

    it('clears decoration and tracks clear', () => {
      const { container } = render(<SidePanel selectDecoration={selectDecoration} selectedDecoration={testID} / data-testid="sidepanel">);
      expect(selectDecoration).toHaveBeenCalledTimes(0);
      expect(trackDecorationSelectedSpy).toHaveBeenCalledTimes(1);

      wrapper.find('.Ddg--SidePanel--DecorationBtns > button').last().simulate('click');
      expect(selectDecoration).toHaveBeenCalledTimes(1);
      expect(trackDecorationSelectedSpy).toHaveBeenCalledTimes(2);
      expect(trackDecorationSelectedSpy).toHaveBeenLastCalledWith(undefined);
    });
  });

  describe('info button ', () => {
    let modalInfoSpy;

    beforeAll(() => {
      modalInfoSpy = jest.spyOn(Modal, 'info');
    });

    it('opens info modal', () => {
      const { container } = render(<SidePanel / data-testid="sidepanel">);
      expect(modalInfoSpy).toHaveBeenCalledTimes(0);

      wrapper.find('button').last().simulate('click');
      expect(modalInfoSpy).toHaveBeenCalledTimes(1);
      expect(modalInfoSpy.mock.calls[0][0]).toMatchSnapshot();
    });
  });
});
