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
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Modal } from 'antd';

import SidePanel from '.';
import * as track from './index.track';
import * as getConfig from '../../../utils/config/get-config';
import DetailsPanel from './DetailsPanel';

jest.mock('antd', () => ({
  Modal: {
    info: jest.fn(),
  },
  Table: () => <div data-testid="mock-table">Table Mock</div>,
}));

jest.mock('./DetailsPanel', () => jest.fn(() => <div data-testid="details-panel" />));

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
    trackDecorationSelectedSpy.mockClear();
    trackDecorationViewDetailsSpy.mockClear();
    Modal.info.mockClear();
  });

  describe('constructor', () => {
    it('inits decorations', () => {
      render(<SidePanel />);
      expect(screen.getByText('1st')).toBeInTheDocument();
      expect(screen.getByText(testAcronym)).toBeInTheDocument();
      expect(screen.getByText('LO')).toBeInTheDocument();
    });

    it('tracks initial selection', () => {
      const { rerender } = render(<SidePanel selectedDecoration={testID} />);
      expect(trackDecorationSelectedSpy).toHaveBeenCalledTimes(1);
      expect(trackDecorationSelectedSpy).toHaveBeenLastCalledWith(testID);
      expect(trackDecorationViewDetailsSpy).toHaveBeenCalledTimes(1);
      expect(trackDecorationViewDetailsSpy).toHaveBeenLastCalledWith(undefined);

      trackDecorationSelectedSpy.mockClear();
      trackDecorationViewDetailsSpy.mockClear();

      rerender(<SidePanel selectedVertex={testVertex} />);
      expect(trackDecorationViewDetailsSpy).toHaveBeenCalledTimes(1);
      expect(trackDecorationViewDetailsSpy).toHaveBeenLastCalledWith(testVertex);
      expect(trackDecorationSelectedSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('render', () => {
    it('renders null if there are no decorations', () => {
      getConfigValueSpy.mockReturnValueOnce(undefined);
      const { container } = render(<SidePanel />);
      expect(container.firstChild).toBeNull();
    });

    it('renders config decorations with clear button', () => {
      const { container } = render(<SidePanel />);
      expect(container.querySelector('.Ddg--SidePanel')).toBeInTheDocument();

      expect(screen.getByText('1st')).toBeInTheDocument();
      expect(screen.getByText(testAcronym)).toBeInTheDocument();
      expect(screen.getByText('LO')).toBeInTheDocument();

      expect(screen.getByText('Clear')).toBeInTheDocument();
    });

    it('renders selected decoration', () => {
      const { container } = render(<SidePanel selectedDecoration={testID} />);

      const selectedButton = screen.getByText(testAcronym);
      expect(selectedButton).toHaveClass('is-selected');

      const detailsPanel = container.querySelector('.Ddg--SidePanel--Details');
      expect(detailsPanel.children.length).toBe(0);
    });

    it('ignores selectedVertex without selected decoration', () => {
      const { container } = render(<SidePanel selectedVertex={testVertex} />);

      const closeButton = container.querySelector('.Ddg--SidePanel--closeBtn');
      expect(closeButton).toHaveClass('is-hidden');

      const detailsPanel = container.querySelector('.Ddg--SidePanel--Details');
      expect(detailsPanel.children.length).toBe(0);
    });

    it('renders sidePanel and closeBtn when vertex and decoration are both selected', () => {
      const { container } = render(<SidePanel selectedDecoration={testID} selectedVertex={testVertex} />);

      const closeButton = container.querySelector('.Ddg--SidePanel--closeBtn');
      expect(closeButton).not.toHaveClass('is-hidden');

      expect(screen.getByTestId('details-panel')).toBeInTheDocument();
      const [detailsPanelProps] = DetailsPanel.mock.calls[0];
      expect(detailsPanelProps).toEqual(
        expect.objectContaining({
          decorationSchema: expect.objectContaining({ id: testID }),
          operation: testVertex.operation,
          service: testVertex.service,
        })
      );
    });
  });

  describe('componentDidUpdate', () => {
    it('tracks change in vertex from absent to present', () => {
      const { rerender } = render(<SidePanel />);
      expect(trackDecorationViewDetailsSpy).toHaveBeenCalledTimes(1);

      rerender(<SidePanel selectedVertex={testVertex} />);
      expect(trackDecorationViewDetailsSpy).toHaveBeenCalledTimes(2);
      expect(trackDecorationViewDetailsSpy).toHaveBeenLastCalledWith(testVertex);
    });

    it('tracks change in vertex from present to absent', () => {
      const { rerender } = render(<SidePanel selectedVertex={testVertex} />);
      expect(trackDecorationViewDetailsSpy).toHaveBeenCalledTimes(1);

      rerender(<SidePanel selectedVertex={undefined} />);
      expect(trackDecorationViewDetailsSpy).toHaveBeenCalledTimes(2);
      expect(trackDecorationViewDetailsSpy).toHaveBeenLastCalledWith(undefined);
    });

    it('tracks change in vertex between different vertexes', () => {
      const { rerender } = render(<SidePanel selectedVertex={testVertex} />);
      expect(trackDecorationViewDetailsSpy).toHaveBeenCalledTimes(1);
      expect(trackDecorationViewDetailsSpy).toHaveBeenLastCalledWith(testVertex);

      const newVertex = { ...testVertex, operation: 'newOp' };
      rerender(<SidePanel selectedVertex={newVertex} />);
      expect(trackDecorationViewDetailsSpy).toHaveBeenCalledTimes(2);
      expect(trackDecorationViewDetailsSpy).toHaveBeenLastCalledWith(newVertex);
    });

    it('does not track unchanged vertex', () => {
      const { rerender } = render(<SidePanel selectedVertex={testVertex} />);
      expect(trackDecorationViewDetailsSpy).toHaveBeenCalledTimes(1);
      expect(trackDecorationViewDetailsSpy).toHaveBeenLastCalledWith(testVertex);

      rerender(<SidePanel selectedVertex={testVertex} selectedDecoration={testID} />);
      expect(trackDecorationViewDetailsSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('clearSelected', () => {
    it('clears selected and tracks clearing', () => {
      const clearSelected = jest.fn();
      const { container } = render(
        <SidePanel selectedVertex={testVertex} selectedDecoration={testID} clearSelected={clearSelected} />
      );

      expect(clearSelected).toHaveBeenCalledTimes(0);
      expect(trackDecorationViewDetailsSpy).toHaveBeenCalledTimes(1);

      const closeButton = container.querySelector('.Ddg--SidePanel--closeBtn');
      fireEvent.click(closeButton);

      expect(clearSelected).toHaveBeenCalledTimes(1);
      expect(trackDecorationViewDetailsSpy).toHaveBeenCalledTimes(2);
      expect(trackDecorationViewDetailsSpy).toHaveBeenLastCalledWith();
    });
  });

  describe('selectDecoration', () => {
    const selectDecoration = jest.fn();

    beforeEach(() => {
      selectDecoration.mockClear();
    });

    it('selects decoration and tracks selection', () => {
      const { rerender } = render(<SidePanel selectDecoration={selectDecoration} />);
      expect(selectDecoration).toHaveBeenCalledTimes(0);
      expect(trackDecorationSelectedSpy).toHaveBeenCalledTimes(1);

      const decorationBtn = screen.getByText(testAcronym);
      fireEvent.click(decorationBtn);

      expect(selectDecoration).toHaveBeenCalledTimes(1);
      expect(selectDecoration).toHaveBeenCalledWith(testID);

      rerender(<SidePanel selectDecoration={selectDecoration} selectedDecoration={testID} />);
      expect(trackDecorationSelectedSpy).toHaveBeenCalledTimes(2);
      expect(trackDecorationSelectedSpy).toHaveBeenLastCalledWith(testID);
    });

    it('clears decoration and tracks clear', () => {
      const { rerender } = render(
        <SidePanel selectDecoration={selectDecoration} selectedDecoration={testID} />
      );
      expect(selectDecoration).toHaveBeenCalledTimes(0);
      expect(trackDecorationSelectedSpy).toHaveBeenCalledTimes(1);

      const clearBtn = screen.getByText('Clear');
      fireEvent.click(clearBtn);

      expect(selectDecoration).toHaveBeenCalledTimes(1);
      expect(selectDecoration).toHaveBeenCalledWith(undefined);

      rerender(<SidePanel selectDecoration={selectDecoration} selectedDecoration={undefined} />);
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
      const { container } = render(<SidePanel />);
      expect(modalInfoSpy).toHaveBeenCalledTimes(0);

      const infoBtn = container.querySelector('.Ddg--SidePanel--infoBtn');
      fireEvent.click(infoBtn);

      expect(modalInfoSpy).toHaveBeenCalledTimes(1);
      const modalProps = modalInfoSpy.mock.calls[0][0];
      expect(modalProps).toHaveProperty('title', 'Decoration Options');
      expect(modalProps).toHaveProperty('maskClosable', true);
      expect(modalProps).toHaveProperty('width', '60vw');
      expect(modalProps).toHaveProperty('content');
    });
  });
});
