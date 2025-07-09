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

export const UnconnectedUiFindInput = React.forwardRef<InputRef, TProps>((props, ref) => {
  const { allowClear, history, location, inputProps = {}, trackFindFunction, uiFind } = props;

  const [ownInputValue, setOwnInputValue] = useState<string | undefined>(undefined);

  const updateUiFindQueryParam = useMemo(
    () =>
      _debounce((newUiFind?: string) => {
        if (newUiFind === uiFind || (!uiFind && !newUiFind)) return;

        updateUiFind({
          location,
          history,
          trackFindFunction,
          uiFind: newUiFind,
        });
      }, 250),
    [history, location, trackFindFunction, uiFind]
  );

  useEffect(() => {
    return () => {
      if (typeof updateUiFindQueryParam.cancel === 'function') {
        updateUiFindQueryParam.cancel();
      }
    };
  }, [updateUiFindQueryParam]);

  const clearUiFind = useCallback(() => {
    updateUiFindQueryParam(undefined);
    updateUiFindQueryParam.flush();
  }, [updateUiFindQueryParam]);

  const handleInputBlur = useCallback(() => {
    updateUiFindQueryParam.flush();
    setOwnInputValue(undefined);
  }, [updateUiFindQueryParam]);

  const handleInputChange = useCallback(
    (evt: React.ChangeEvent<HTMLInputElement>) => {
      const { value } = evt.target;
      setOwnInputValue(value);
      updateUiFindQueryParam(value);
    },
    [updateUiFindQueryParam]
  );

  const inputValue = _isString(ownInputValue) ? ownInputValue : uiFind;

  const suffix = (
    <>
      {allowClear && inputValue && inputValue.length > 0 && (
        <IoClose data-testid="clear-icon" onClick={clearUiFind} />
      )}
      {inputProps.suffix}
    </>
  );

  return (
    <Input
      placeholder="Find..."
      {...inputProps}
      ref={ref}
      onBlur={handleInputBlur}
      onChange={handleInputChange}
      suffix={suffix}
      value={inputValue || ''}
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
