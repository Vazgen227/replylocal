import { mockConversations } from '@/lib/mocks/inbox';
import { InboxShell } from '@/components/inbox/inbox-shell';

export default function InboxPage() {
    return <InboxShell conversations={mockConversations} />;
}
