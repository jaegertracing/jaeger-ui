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

import React from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { History, Location } from 'history';
import { useHistory } from './useHistory';

export type IWithRouteProps = {
  location: Location;
  pathname: string;
  search: string;
  params: object;
  history: History;
};

export default function withRouteProps(WrappedComponent: React.ElementType) {
  return function WithRouteProps(props: IWithRouteProps | object) {
    const location = useLocation();
    const params = useParams();
    const { pathname, search } = location;
    const history = useHistory();

    return (
      <WrappedComponent
        {...props}
        location={location}
        pathname={pathname}
        search={search}
        params={params}
        history={history}
      />
    );
  };
}
