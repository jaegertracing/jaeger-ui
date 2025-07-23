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

import React, { useRef, useCallback, useMemo } from 'react';
import { InputRef, Tooltip } from 'antd';
import { IoSearch, IoEye, IoEyeOff } from 'react-icons/io5';

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

const Header: React.FC<TProps> = ({
  clearOperation,
  density,
  distanceToPathElems,
  hiddenUiFindMatches,
  operation,
  operations,
  service,
  services,
  setDensity,
  setDistance,
  setOperation,
  setService,
  showOperations,
  showParameters = true, // Default prop handled here
  showVertices,
  toggleShowOperations,
  uiFindCount,
  visEncoding,
}) => {
  const uiFindInput = useRef<InputRef>(null);

  const focusUiFindInput = useCallback(() => {
    uiFindInput.current?.focus();
  }, []);

  const handleSetOperation = useCallback(
    (op: string) => {
      trackHeaderSetOperation();
      setOperation(op);
    },
    [setOperation]
  );

  const handleInfoClick = useCallback(() => {
    trackShowMatches();
    if (hiddenUiFindMatches) {
      showVertices(Array.from(hiddenUiFindMatches));
    }
  }, [hiddenUiFindMatches, showVertices]);

  const uiFindInfo = useMemo(() => {
    if (uiFindCount === undefined) {
      return null;
    }

    const hasHidden = !!hiddenUiFindMatches?.size;
    const hiddenCount = hiddenUiFindMatches?.size || 0;

    let tipText = uiFindCount ? 'All matches are visible' : 'No matches';
    if (hasHidden) {
      tipText = `Click to view ${hiddenCount} hidden match${hiddenCount !== 1 ? 'es' : ''}`;
    }

    return (
      <Tooltip classNames={{ root: 'DdgHeader--uiFindInfo--tooltip' }} placement="topRight" title={tipText}>
        {/* arbitrary span is necessary as Tooltip alters child's styling */}
        <span>
          <button
            className="DdgHeader--uiFindInfo"
            disabled={!hasHidden}
            onClick={handleInfoClick}
            type="button"
          >
            {uiFindCount}
            {(uiFindCount !== 0 || hasHidden) && <IoEye className="DdgHeader--uiFindInfo--icon" />}
            {hasHidden && (
              <span className="DdgHeader--uiFindInfo--hidden">
                {hiddenCount}
                <IoEyeOff className="DdgHeader--uiFindInfo--icon" />
              </span>
            )}
          </button>
        </span>
      </Tooltip>
    );
  }, [uiFindCount, hiddenUiFindMatches, handleInfoClick]);

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
              setValue={handleSetOperation}
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
          <div className="DdgHeader--uiFind" role="button" onClick={focusUiFindInput}>
            <IoSearch className="DdgHeader--uiFindSearchIcon" />
            <UiFindInput
              allowClear
              forwardedRef={uiFindInput}
              inputProps={{ className: 'DdgHeader--uiFindInput' }}
              trackFindFunction={trackFilter}
            />
            {uiFindInfo}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
