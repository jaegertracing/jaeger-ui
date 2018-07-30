// @flow

// Copyright (c) 2018 Uber Technologies, Inc.
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
import { Popover, Switch } from 'antd';
import IoGearAIcon from 'react-icons/lib/io/gear-a';

import { getUrl } from './url';

import './TraceDiffSettings.css';

type Props = {
  a: ?string,
  b: ?string,
  metric: ?string,
  pushUrl: string => void,
  scale: ?string,
  scaleOn: ?string,
};

class SettingsPanel extends React.PureComponent<Props> {
  props: Props;

  toggleMetric = (value: boolean) => {
    const metric = value ? 'duration' : 'spanCount';
    this.pushUrl({ metric });
    // const { a, b, cohort, scale, scaleOn, pushUrl } = this.props;
    // const metric = value ? 'duration' : 'spanCount';
    // const url = getUrl({ a, b, cohort, metric, scale, scaleOn })
    // pushUrl(url);
  };

  toggleScale = (value: boolean) => {
    const scale = value ? 'power' : 'linear';
    this.pushUrl({ scale });
  };

  toggleScaleOn = (value: boolean) => {
    const scaleOn = value ? 'relative' : 'real';
    this.pushUrl({ scaleOn });
  };

  pushUrl = update => {
    const { pushUrl, ...rest } = this.props;
    const st = { ...rest, ...update };
    const url = getUrl(st);
    pushUrl(url);
  };

  render() {
    const { metric, scale, scaleOn } = this.props;
    return (
      <ul className="TraceDiffSettings--items">
        <li className="TraceDiffSettings--settingItem">
          Duration
          <Switch
            className="TraceDiffSettings--settingField"
            checked={metric === 'duration'}
            onChange={this.toggleMetric}
          />
        </li>
        <li className="TraceDiffSettings--settingItem">
          Square-root scale
          <Switch
            className="TraceDiffSettings--settingField"
            checked={scale === 'power'}
            onChange={this.toggleScale}
          />
        </li>
        <li className="TraceDiffSettings--settingItem">
          Relative
          <Switch
            className="TraceDiffSettings--settingField"
            checked={scaleOn === 'relative'}
            onChange={this.toggleScaleOn}
          />
        </li>
      </ul>
    );
  }
}

// // TODO(joe): simplify but do not invalidate the URL
// export function mapStateToProps(state: ReduxState, ownProps: { match: Match }) {
//   const { a, b } = ownProps.match.params;
//   const { cohort: origCohort = [], metric, scale, scaleOn } = queryString.parse(state.router.location.search);
//   const fullCohortSet: Set<string> = new Set([].concat(a, b, origCohort).filter(Boolean));
//   const cohort: string[] = Array.from(fullCohortSet);
//   return {
//     state: {
//       a,
//       b,
//       cohort,
//       metric,
//       scale,
//       scaleOn,
//     }
//   };
// }

// // export for tests
// export function mapDispatchToProps(dispatch: Function) {
//   const { fetchMultipleTraces } = bindActionCreators(jaegerApiActions, dispatch);
//   const { forceState } = bindActionCreators(diffActions, dispatch);
//   return { fetchMultipleTraces, forceState };
// }

// const SettingsPanel = connect(mapStateToProps, () => { })(SettingsPanelImpl);

export default function TraceDiffSettings(props: Props) {
  return (
    <Popover
      placement="leftBottom"
      content={<SettingsPanel {...props} />}
      trigger="click"
      overlayStyle={{ whiteSpace: 'nowrap' }}
    >
      <IoGearAIcon className="TraceDiffSettings" />
    </Popover>
  );
}
