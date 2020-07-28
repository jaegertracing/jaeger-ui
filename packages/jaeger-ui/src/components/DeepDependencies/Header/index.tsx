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
import { Icon, Input, Tooltip } from 'antd';
import MdVisibility from 'react-icons/lib/md/visibility';
import MdVisibilityOff from 'react-icons/lib/md/visibility-off';

import HopsSelector from './HopsSelector';
import NameSelector from '../../common/NameSelector';
import LayoutSettings from './LayoutSettings';
import { trackFilter, trackHeaderSetOperation, trackShowMatches } from '../index.track';
import UiFindInput from '../../common/UiFindInput';
import { EDirection, TDdgDistanceToPathElems, EDdgDensity } from '../../../model/ddg/types';

import './index.css';

type TProps = {
  clearOperation: () => void;
  density: EDdgDensity;
  distanceToPathElems?: TDdgDistanceToPathElems;
  hiddenUiFindMatches?: Set<string>;
  operation?: string;
  operations: string[] | undefined;
  service?: string;
  services?: string[] | null;
  setDensity: (density: EDdgDensity) => void;
  setDistance: (distance: number, direction: EDirection) => void;
  setOperation: (operation: string) => void;
  setService: (service: string) => void;
  showOperations: boolean;
  showParameters?: boolean;
  showVertices: (vertexKeys: string[]) => void;
  toggleShowOperations: (enable: boolean) => void;
  uiFindCount: number | undefined;
  visEncoding?: string;
};
export default class Header extends React.PureComponent<TProps> {
  private _uiFindInput: React.RefObject<Input> = React.createRef();

  static defaultProps = {
    showParameters: true,
  };

  focusUiFindInput = () => {
    if (this._uiFindInput.current) {
      this._uiFindInput.current.focus();
    }
  };

  getUiFindInfo = () => {
    const { hiddenUiFindMatches, uiFindCount } = this.props;

    if (uiFindCount === undefined) return null;

    let hasHidden = false;
    let hiddenInfo: React.ReactNode = null;
    let tipText = uiFindCount ? 'All matches are visible' : 'No matches';
    if (hiddenUiFindMatches && hiddenUiFindMatches.size) {
      const { size } = hiddenUiFindMatches;
      hasHidden = true;
      tipText = `Click to view ${size} hidden match${size !== 1 ? 'es' : ''}`;
      hiddenInfo = (
        <span className="DdgHeader--uiFindInfo--hidden">
          {size}
          <MdVisibilityOff className="DdgHeader--uiFindInfo--icon" />
        </span>
      );
    }

    return (
      <Tooltip overlayClassName="DdgHeader--uiFindInfo--tooltip" placement="topRight" title={tipText}>
        {/* arbitrary span is necessary as Tooltip alters child's styling */}
        <span>
          <button
            className="DdgHeader--uiFindInfo"
            disabled={!hasHidden}
            onClick={this.handleInfoClick}
            type="button"
          >
            {uiFindCount}
            {(uiFindCount !== 0 || hasHidden) && <MdVisibility className="DdgHeader--uiFindInfo--icon" />}
            {hiddenInfo}
          </button>
        </span>
      </Tooltip>
    );
  };

  setOperation = (operation: string) => {
    trackHeaderSetOperation();
    this.props.setOperation(operation);
  };

  handleInfoClick = () => {
    trackShowMatches();
    const { hiddenUiFindMatches, showVertices } = this.props;
    if (hiddenUiFindMatches) showVertices(Array.from(hiddenUiFindMatches));
  };

  render() {
    const {
      clearOperation,
      density,
      distanceToPathElems,
      operation,
      operations,
      service,
      services,
      setDensity,
      setDistance,
      setService,
      showOperations,
      showParameters,
      toggleShowOperations,
      visEncoding,
    } = this.props;

    return (
      <header className="DdgHeader">
        {showParameters && (
          <div className="DdgHeader--paramsHeader">
            <NameSelector
              label="Service"
              placeholder="Select a service…"
              value={service || null}
              setValue={setService}
              required
              options={services || []}
            />
            {service && (
              <NameSelector
                clearValue={clearOperation}
                label="Operation"
                placeholder="Filter by operation…"
                value={operation || null}
                setValue={this.setOperation}
                options={operations || []}
              />
            )}
          </div>
        )}
        <div className="DdgHeader--controlHeader">
          <LayoutSettings
            density={density}
            setDensity={setDensity}
            showOperations={showOperations}
            toggleShowOperations={toggleShowOperations}
          />
          <HopsSelector
            distanceToPathElems={distanceToPathElems}
            handleClick={setDistance}
            visEncoding={visEncoding}
          />
          <div className="DdgHeader--findWrapper">
            <div className="DdgHeader--uiFind" role="button" onClick={this.focusUiFindInput}>
              <Icon className="DdgHeader--uiFindSearchIcon" type="search" />
              <UiFindInput
                allowClear
                forwardedRef={this._uiFindInput}
                inputProps={{ className: 'DdgHeader--uiFindInput' }}
                trackFindFunction={trackFilter}
              />
              {this.getUiFindInfo()}
            </div>
          </div>
        </div>
      </header>
    );
  }
}
