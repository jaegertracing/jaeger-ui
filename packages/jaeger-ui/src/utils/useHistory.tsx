// Copyright (c) 2023 The Jaeger Authors.
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

import React, { ReactNode, createContext, useContext, FC } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { History } from 'history';

const HistoryContext = createContext<History | undefined>(undefined);
interface IHistoryProviderProps {
  children: ReactNode;
  history: History;
}

export const useHistory = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Create a history-like object using react-router-dom v7 hooks
  return {
    push: (path: string) => navigate(path),
    replace: (path: string) => navigate(path, { replace: true }),
    location,
    listen: () => () => {},
    createHref: (location: any) => location.pathname,
  };
};

export const HistoryProvider: FC<IHistoryProviderProps> = ({ children, history }) => {
  return <HistoryContext.Provider value={history}>{children}</HistoryContext.Provider>;
};