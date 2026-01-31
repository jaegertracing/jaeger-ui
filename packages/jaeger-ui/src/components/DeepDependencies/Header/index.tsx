// Copyright (c) 2019 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import React, { useRef, useCallback, useMemo } from 'react';
import { InputRef, Select, Tooltip } from 'antd';
import { IoSearch, IoEye, IoEyeOff } from 'react-icons/io5';

import HopsSelector from './HopsSelector';
import SearchableSelect from '../../common/SearchableSelect';
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
          <label className="DdgHeader--label">
            <span className="DdgHeader--labelText">Service:</span>
            <SearchableSelect
              className="DdgHeader--select"
              value={service || null}
              onChange={setService}
              placeholder="Select a service…"
              popupMatchSelectWidth={false}
              fuzzy
              status={!service ? 'error' : undefined}
            >
              {(services || []).map(opt => (
                <Select.Option key={opt} value={opt}>
                  {opt}
                </Select.Option>
              ))}
            </SearchableSelect>
          </label>
          {service && (
            <label className="DdgHeader--label">
              <span className="DdgHeader--labelText">Operation:</span>
              <SearchableSelect
                className="DdgHeader--select"
                value={operation || null}
                onChange={handleSetOperation}
                allowClear
                onClear={clearOperation}
                placeholder="Filter by operation…"
                popupMatchSelectWidth={false}
                fuzzy
              >
                {(operations || []).map(opt => (
                  <Select.Option key={opt} value={opt}>
                    {opt}
                  </Select.Option>
                ))}
              </SearchableSelect>
            </label>
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
