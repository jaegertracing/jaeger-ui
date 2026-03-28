// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { CopilotChat } from '@copilotkit/react-ui';
import { useCopilotChat } from '@copilotkit/react-core';
import { MessageRole, TextMessage } from '@copilotkit/runtime-client-gql';
import { Button } from 'antd';
import * as React from 'react';
import { IoClose } from 'react-icons/io5';

import { getJaegerCopilotRuntimeUrl } from './copilot-runtime';
import { useJaegerAssistant } from './JaegerAssistantContext';

import './JaegerAssistantPanel.css';

/*
  CopilotChat needs a single string that tells the model how to behave in this chat, 
  and that string is passed in as the instructions prop.
*/
const COPILOT_INSTRUCTIONS =
  'You are the Jaeger assistant. Help users understand distributed traces, spans, errors, and performance. ' +
  'When the user is viewing a specific trace, treat questions as about that trace unless they ask otherwise. ' +
  'Use the provided navigation tools when the user wants to search for other traces or open a comparison view.';

/*
  The assistant UI: title bar, close button, and CopilotChat. When we submit a question from the omnibox,
  a small JaegerAssistantChatBootstrap helper sends that first message into the chat via appendMessage. 
  Only renders when a Copilot runtime URL exists.
*/
function JaegerAssistantChatBootstrap(): null {
  const { appendMessage } = useCopilotChat();
  const { pendingMessage, consumePending, isOpen, bootstrapId } = useJaegerAssistant();
  const lastHandledBootstrapId = React.useRef<number>(0);

  React.useEffect(() => {
    if (!isOpen) {
      lastHandledBootstrapId.current = 0;
      return;
    }
    if (!pendingMessage || bootstrapId === 0) {
      return;
    }
    if (lastHandledBootstrapId.current === bootstrapId) {
      return;
    }
    const text = pendingMessage;
    const id = bootstrapId;
    const timer = window.setTimeout(() => {
      lastHandledBootstrapId.current = id;
      void appendMessage(
        new TextMessage({
          role: MessageRole.User,
          content: text,
        })
      )
        .catch(() => {
          lastHandledBootstrapId.current = 0;
        })
        .finally(() => {
          consumePending();
        });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [appendMessage, bootstrapId, consumePending, isOpen, pendingMessage]);

  return null;
}

function JaegerAssistantPanelInner(): React.ReactElement {
  const { isOpen, close } = useJaegerAssistant();

  if (!isOpen) {
    return <></>;
  }

  return (
    <aside className="JaegerAssistantPanel" data-testid="JaegerAssistantPanel">
      <div className="JaegerAssistantPanel-toolbar">
        <span className="JaegerAssistantPanel-title">Jaeger assistant</span>
        <Button
          type="text"
          className="JaegerAssistantPanel-close"
          icon={<IoClose size={22} />}
          onClick={close}
          aria-label="Close"
        />
      </div>
      <div className="JaegerAssistantPanel-chatWrap">
        <CopilotChat
          className="JaegerAssistantPanel-chat copilotKitChat"
          instructions={COPILOT_INSTRUCTIONS}
          labels={{
            title: 'Jaeger assistant',
            initial: '',
            placeholder: 'Message…',
          }}
          suggestions="manual"
        />
        <JaegerAssistantChatBootstrap />
      </div>
    </aside>
  );
}

export default function JaegerAssistantPanel(): React.ReactElement | null {
  if (!getJaegerCopilotRuntimeUrl()) {
    return null;
  }
  return <JaegerAssistantPanelInner />;
}
