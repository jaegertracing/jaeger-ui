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
import { Layout } from 'antd';
import Helmet from 'react-helmet';
import { connect } from 'react-redux';
import type { Location } from 'react-router-dom';
import { withRouter } from 'react-router-dom';

import TopNav from './TopNav';
import type { Config } from '../../types/config';
import { trackPageView } from '../../utils/tracking';

import './Page.css';

type PageProps = {
  location: Location,
  children: React.Node,
  config: Config,
};

const { Header, Content } = Layout;

// export for tests
export class PageImpl extends React.Component<PageProps> {
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
    const { children, config, location } = this.props;
    const menu = config && config.menu;
    return (
      <div>
        <Helmet title="Jaeger UI" />
        <Layout>
          <Header className="Page--topNav">
            <TopNav activeKey={location.pathname} menuConfig={menu} />
          </Header>
          <Content className="Page--content">{children}</Content>
        </Layout>
      </div>
    );
  }
}

// export for tests
export function mapStateToProps(state: { config: Config, router: { location: Location } }, ownProps: any) {
  const { config } = state;
  const { location } = state.router;
  return { ...ownProps, config, location };
}

export default withRouter(connect(mapStateToProps)(PageImpl));
