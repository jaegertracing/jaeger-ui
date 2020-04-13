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

// import HopsSelector from './HopsSelector';
import NameSelector from '../DeepDependencies/Header/NameSelector';
// import LayoutSettings from './LayoutSettings';
// import { trackFilter, trackHeaderSetOperation, trackShowMatches } from '../index.track';
// import UiFindInput from '../../common/UiFindInput';
// import { EDirection, TDdgDistanceToPathElems, EDdgDensity } from '../../../model/ddg/types';

// import './index.css';

type TProps = {
  service?: string;
  services?: string[] | null;
  setService: (service: string) => void;
};
export default class Header extends React.PureComponent<TProps> {
  render() {
    const {
      service,
      services,
      setService,
    } = this.props;

    return (
      <header className="DdgHeader">
        <div className="DdgHeader--paramsHeader">
          <NameSelector
            label="Service"
            placeholder="Select a service…"
            value={service || null}
            setValue={setService}
            required
            options={services || []}
          />
        </div>
      </header>
    );
  }
}
