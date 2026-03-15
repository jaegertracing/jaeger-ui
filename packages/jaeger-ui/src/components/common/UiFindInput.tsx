// Copyright (c) 2019 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Input, InputRef } from 'antd';
import { IoClose } from 'react-icons/io5';
import { useNavigate, useLocation } from 'react-router-dom-v5-compat';
import _debounce from 'lodash/debounce';
import _isString from 'lodash/isString';

import updateUiFind from '../../utils/update-ui-find';
import { TNil, ReduxState } from '../../types/index';
import parseQuery from '../../utils/parseQuery';

type TOwnProps = {
  allowClear?: boolean;
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
    allowClear,
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
  const suffix = (
    <>
      {allowClear && inputValue && inputValue.length > 0 && (
        <IoClose data-testid="clear-icon" onClick={clearUiFind} />
      )}
      {inputProps?.suffix}
    </>
  );

  return (
    <Input
      placeholder="Find..."
      {...inputProps}
      onBlur={handleInputBlur}
      onChange={handleInputChange}
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

export function extractUiFindFromState(_state: ReduxState): TExtractUiFindFromStateReturn {
  return { uiFind: parseUiFind(window.location.search) };
}

export default UnconnectedUiFindInput as any;
