import { z } from "zod";
import { getTranslations } from "next-intl/server";
import { CustomerChat } from "@/components/chat/customer-chat";
import { chats } from "@/server/chat-http";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Chat · ReplyLocal",
  robots: { index: false, follow: false },
};
export default async function ChatPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;
  const t = await getTranslations("pilot");
  let config;
  try {
    const id = z.uuid().parse(publicId);
    config = await chats.publicConfig(id);
  } catch {
    config = null;
  }
  if (!config)
    return (
      <main className="mx-auto max-w-lg p-8">
        <h1 className="text-xl font-semibold">{t("unavailable")}</h1>
        <p className="mt-3 text-muted-foreground">{t("CHAT_DISABLED")}</p>
      </main>
    );
  return (
    <CustomerChat
      publicId={publicId}
      companyName={String(config.companyName)}
    />
  );
}
