// @flow

// Copyright (c) 2017 Uber Technologies, Inc.
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
import Helmet from 'react-helmet';
import { connect } from 'react-redux';
import type { Location } from 'react-router-dom';

import TopNav from './TopNav';
import type { Config } from '../../types/config';
import { trackPageView } from '../../utils/metrics';

import './Page.css';

type PageProps = {
  location: Location,
  children: React.Node,
  config: { data: Config },
};

class Page extends React.Component<PageProps> {
  props: PageProps;

  componentDidMount() {
    const { pathname, search } = this.props.location;
    trackPageView(pathname, search);
  }

  componentWillReceiveProps(nextProps: PageProps) {
    const { pathname, search } = this.props.location;
    const { pathname: nextPathname, search: nextSearch } = nextProps.location;
    if (pathname !== nextPathname || search !== nextSearch) {
      trackPageView(nextPathname, nextSearch);
    }
  }

  render() {
    const { children, config } = this.props;
    const menu = config && config.data && config.data.menu;
    return (
      <section className="jaeger-ui-page" id="jaeger-ui">
        <Helmet title="Jaeger UI" />
        <TopNav menuConfig={menu} />
        <div className="jaeger-ui--content">
          {children}
        </div>
      </section>
    );
  }
}

function mapStateToProps(state, ownProps) {
  const { config } = state;
  const { location } = state.routing;
  return { ...ownProps, config, location };
}

export default connect(mapStateToProps)(Page);
