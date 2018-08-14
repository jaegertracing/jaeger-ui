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
import { trackPageView } from '../../utils/tracking';

import './Page.css';

type Props = {
  pathname: string,
  search: string,
  children: React.Node,
};

const { Header, Content } = Layout;

// export for tests
export class PageImpl extends React.Component<Props> {
  props: Props;

  componentDidMount() {
    const { pathname, search } = this.props;
    trackPageView(pathname, search);
  }

  componentWillReceiveProps(nextProps: Props) {
    const { pathname, search } = this.props;
    const { pathname: nextPathname, search: nextSearch } = nextProps;
    if (pathname !== nextPathname || search !== nextSearch) {
      trackPageView(nextPathname, nextSearch);
    }
  }

  render() {
    return (
      <div>
        <Helmet title="Jaeger UI" />
        <Layout>
          <Header className="Page--topNav">
            <TopNav />
          </Header>
          <Content className="Page--content">{this.props.children}</Content>
        </Layout>
      </div>
    );
  }
}

// export for tests
export function mapStateToProps(state: { router: { location: Location } }) {
  const { pathname, search } = state.router.location;
  return { pathname, search };
}

export default withRouter(connect(mapStateToProps)(PageImpl));
