// Copyright (c) 2023 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React, { ReactNode, createContext, useContext, FC } from 'react';
import { History } from 'history';

const HistoryContext = createContext<History | undefined>(undefined);
interface IHistoryProviderProps {
  children: ReactNode;
  history: History;
}

export const useHistory = (): History | undefined => {
  return useContext(HistoryContext);
};

export const HistoryProvider: FC<IHistoryProviderProps> = ({ children, history }) => {
  return <HistoryContext.Provider value={history}>{children}</HistoryContext.Provider>;
};
