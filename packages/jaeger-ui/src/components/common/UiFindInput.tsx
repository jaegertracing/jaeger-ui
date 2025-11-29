// Copyright (c) 2019 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Input, InputRef } from 'antd';
import { IoClose } from 'react-icons/io5';
import { History as RouterHistory, Location } from 'history';
import _debounce from 'lodash/debounce';
import _isString from 'lodash/isString';
import { connect } from 'react-redux';

import updateUiFind from '../../utils/update-ui-find';
import { TNil, ReduxState } from '../../types/index';
import parseQuery from '../../utils/parseQuery';
import withRouteProps from '../../utils/withRouteProps';

type TOwnProps = {
  allowClear?: boolean;
  inputProps?: Record<string, any>;
  history: RouterHistory;
  location: Location;
  match: any;
  trackFindFunction?: (str: string | TNil) => void;
};

export type TExtractUiFindFromStateReturn = {
  uiFind: string | undefined;
};

type TProps = TOwnProps & TExtractUiFindFromStateReturn;

const defaultProps: Partial<TProps> = {
  inputProps: {},
};

export const UnconnectedUiFindInput = React.forwardRef<InputRef, TProps>((props, ref) => {
  const {
    allowClear,
    inputProps,
    history,
    location,
    uiFind: prevUiFind,
    trackFindFunction,
  } = {
    ...defaultProps,
    ...props,
  };

  const [ownInputValue, setOwnInputValue] = useState<string | undefined>(undefined);

  const updateUiFindQueryParam = useMemo(
    () =>
      _debounce((uiFind?: string) => {
        if (uiFind === prevUiFind || (!prevUiFind && !uiFind)) return;
        updateUiFind({
          location,
          history,
          trackFindFunction,
          uiFind,
        });
      }, 250),
    [history, location, prevUiFind, trackFindFunction]
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

export function extractUiFindFromState(state: ReduxState): TExtractUiFindFromStateReturn {
  const { uiFind: uiFindFromUrl } = parseQuery(state.router.location.search);
  const uiFind = Array.isArray(uiFindFromUrl) ? uiFindFromUrl.join(' ') : uiFindFromUrl;
  return { uiFind };
}

export default connect(extractUiFindFromState)(withRouteProps(UnconnectedUiFindInput)) as any;
