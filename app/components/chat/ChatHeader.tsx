'use client';

import PageHeader from '../common/PageHeader';
import { useChatContext } from '../../providers/ChatProvider';

export default function ChatHeader() {
  const { currentConversationId, currentProjectId } = useChatContext();

  return <PageHeader showActions={!!currentConversationId} projectId={currentProjectId || undefined} />;
}

