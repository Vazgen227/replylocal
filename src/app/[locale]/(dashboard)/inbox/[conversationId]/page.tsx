import { mockConversations } from '@/lib/mocks/inbox';
import { InboxShell } from '@/components/inbox/inbox-shell';

interface Props {
    params: Promise<{
        conversationId: string;
    }>;
}

export default async function ConversationPage({ params }: Props) {
    const { conversationId } = await params;
    return (
        <InboxShell
            conversations={mockConversations}
            initialSelectedId={conversationId}
        />
    );
}
