// Copyright (c) 2019 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Input, InputRef } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import _debounce from 'lodash/debounce';
import _isString from 'lodash/isString';

import updateUiFind from '../../utils/update-ui-find';
import { TNil } from '../../types/index';
import parseQuery from '../../utils/parseQuery';

type TOwnProps = {
  inputProps?: Record<string, any>;
  trackFindFunction?: (str: string | TNil) => void;
  uiFind?: string;
};

type TProps = TOwnProps;

const defaultProps: Partial<TProps> = {
  inputProps: {},
};

export const UnconnectedUiFindInput = React.forwardRef<InputRef, TProps>((props, ref) => {
  const {
    inputProps,
    trackFindFunction,
    uiFind: uiFindProp,
  } = {
    ...defaultProps,
    ...props,
  };

  const navigate = useNavigate();
  const location = useLocation();

  // derive uiFind from the URL when not provided as a prop.
  const prevUiFind = uiFindProp !== undefined ? uiFindProp : parseUiFind(location.search);
  const [ownInputValue, setOwnInputValue] = useState<string | undefined>(undefined);

  const updateUiFindQueryParam = useMemo(
    () =>
      _debounce((uiFind?: string) => {
        if (uiFind === prevUiFind || (!prevUiFind && !uiFind)) return;
        updateUiFind({
          location,
          navigate,
          trackFindFunction,
          uiFind,
        });
      }, 250),
    [navigate, location, prevUiFind, trackFindFunction]
  );

  useEffect(() => {
    return () => {
      updateUiFindQueryParam.cancel();
    };
  }, [updateUiFindQueryParam]);

  const clearUiFind = useCallback(() => {
    // Empty the field here rather than relying on Ant Design's change event, whose order
    // relative to onClear is an implementation detail of rc-input.
    setOwnInputValue('');
    updateUiFindQueryParam();
    updateUiFindQueryParam.flush();
  }, [updateUiFindQueryParam]);

  const handleInputBlur = useCallback(() => {
    updateUiFindQueryParam.flush();
    setOwnInputValue(undefined);
  }, [updateUiFindQueryParam]);

  const handleInputChange = useCallback(
    (evt: React.ChangeEvent<HTMLInputElement>) => {
      const { value } = evt.target;
      updateUiFindQueryParam(value);
      setOwnInputValue(value);
    },
    [updateUiFindQueryParam]
  );

  const inputValue = _isString(ownInputValue) ? ownInputValue : prevUiFind;
  // Always render a suffix element: Ant Design adds spacing to its clear icon when one is
  // present, and these inputs had that spacing from the custom icon this replaced.
  const suffix = <>{inputProps?.suffix}</>;

  return (
    // Ant Design's built-in clear button is the only clear control (issue #4169).
    <Input
      placeholder="Find..."
      {...inputProps}
      onBlur={handleInputBlur}
      onChange={handleInputChange}
      onClear={clearUiFind}
      ref={ref}
      suffix={suffix}
      value={inputValue}
      allowClear
    />
  );
});

UnconnectedUiFindInput.displayName = 'UnconnectedUiFindInput';

export type TExtractUiFindFromStateReturn = {
  uiFind: string | undefined;
};

export function parseUiFind(search: string): string | undefined {
  const { uiFind } = parseQuery(search);
  return Array.isArray(uiFind) ? uiFind.join(' ') : uiFind;
}

// This is used by various components to extract uiFind from the URL.
// The "fromState" part of the name is a legacy leftover from when
// this was reading from Redux state.
export function extractUiFindFromState(_unused: any = null): TExtractUiFindFromStateReturn {
  return { uiFind: parseUiFind(window.location.search) };
}

export default UnconnectedUiFindInput as any;
