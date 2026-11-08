import { notFound } from "next/navigation";
import { z } from "zod";
import { OperatorThread } from "@/components/chat/operator-thread";
export default async function Conversation({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = await params;
  if (!z.uuid().safeParse(conversationId).success) notFound();
  return <OperatorThread id={conversationId} />;
}
