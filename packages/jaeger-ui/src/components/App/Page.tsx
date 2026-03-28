// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { Layout } from 'antd';
import cx from 'classnames';
import { connect } from 'react-redux';
import { useLocation } from 'react-router-dom';

import TopNav from './TopNav';
import JaegerAssistantPanel from './JaegerAssistantPanel';
import { JaegerAssistantProvider, useJaegerAssistant } from './JaegerAssistantContext';
import JaegerCopilotProvider from './JaegerCopilotProvider';
import { ReduxState } from '../../types';
import { EmbeddedState } from '../../types/embedded';
import { trackPageView } from '../../utils/tracking';
import DocumentTitle from '../../utils/documentTitle';

import './Page.css';
import withRouteProps from '../../utils/withRouteProps';

type TProps = {
  children: React.ReactNode;
  embedded: EmbeddedState;
};

const { Header, Content } = Layout;

function useTrackPageView() {
  const { pathname, search } = useLocation();
  React.useEffect(() => {
    trackPageView(pathname, search);
  }, [pathname, search]);
}

/** Embedded mode: no assistant/Copilot providers, no hooks from assistant context. */
const PageLayoutEmbedded: React.FC<TProps> = ({ children, embedded }) => {
  useTrackPageView();

  const contentCls = cx({
    'Page--content': true,
    'Page--content--no-embedded': !embedded,
    'Page--content--workspaceMain': !embedded,
  });

  return (
    <div>
      <DocumentTitle title="Jaeger UI" />
      <Layout>
        <Content className={contentCls}>{children}</Content>
      </Layout>
    </div>
  );
};

/** Full app shell with top nav and assistant (requires JaegerAssistantProvider ancestor). */
const PageLayoutMain: React.FC<TProps> = ({ children, embedded }) => {
  useTrackPageView();
  const { isOpen: assistantOpen } = useJaegerAssistant();

  const contentCls = cx({
    'Page--content': true,
    'Page--content--no-embedded': !embedded,
    'Page--content--workspaceMain': !embedded,
  });

  return (
    <div className="Page--shell" data-jaeger-assistant-open={assistantOpen ? 'true' : undefined}>
      <DocumentTitle title="Jaeger UI" />
      <Layout className="Page--layoutRoot">
        <Header className="Page--topNav">
          <TopNav />
        </Header>
        <div className="Page--workspaceRow">
          <Content className={contentCls}>{children}</Content>
          <JaegerAssistantPanel />
        </div>
      </Layout>
    </div>
  );
};

// export for tests
export const PageImpl: React.FC<TProps> = props =>
  props.embedded ? (
    <PageLayoutEmbedded {...props} />
  ) : (
    <JaegerCopilotProvider>
      <JaegerAssistantProvider>
        <PageLayoutMain {...props} />
      </JaegerAssistantProvider>
    </JaegerCopilotProvider>
  );

// export for tests
export function mapStateToProps(state: ReduxState) {
  const { embedded } = state;
  return { embedded };
}

export default connect(mapStateToProps)(withRouteProps(PageImpl));
