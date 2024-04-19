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
import cx from 'classnames';
import Helmet from 'react-helmet';
import { connect } from 'react-redux';
import TopNav from './TopNav';
import { trackPageView } from '../../utils/tracking';
import './Page.css';
import withRouteProps from '../../utils/withRouteProps';

const { Header, Content } = Layout;

const Page = ({ children, embedded, pathname, search }) => {
  React.useEffect(() => {
    trackPageView(pathname, search);
  }, [pathname, search]);

  const contentCls = cx({ 'Page--content': true, 'Page--content--no-embedded': !embedded });

  return (
    <div>
      <Helmet title="Jaeger UI" />
      <Layout>
        {!embedded && (
          <Header className="Page--topNav">
            <TopNav />
          </Header>
        )}
        <Content className={contentCls}>{children}</Content>
      </Layout>
    </div>
  );
};

const mapStateToProps = (state) => {
  const { embedded } = state;
  const { pathname, search } = state.router.location;
  return { embedded, pathname, search };
};

export default connect(mapStateToProps)(withRouteProps(Page)););
