import type { Metadata } from 'next';
import './globals.css';
import { getLocale } from 'next-intl/server';



export const metadata: Metadata = {
  title: 'ReplyLocal',
  description: 'AI-асистент для автоматизації клієнтських комунікацій',
};

export default async function RootLayout({
                                     children,
                                   }: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  return (
      <html lang={locale} data-scroll-behavior="smooth" suppressHydrationWarning>
      <body className="antialiased">
      {children}
      </body>
      </html>
  );
}
