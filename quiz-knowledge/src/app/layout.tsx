import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Link from 'next/link';
import './globals.css';
import { env } from '@/lib/config/env';
import { Toaster } from '@/components/ui/sonner';

const inter = Inter({ subsets: ['latin'] });

// Ensure env vars are validated at startup
void env.DATABASE_URL;

export const metadata: Metadata = {
  title: 'Quiz Knowledge',
  description: 'Internal AI knowledge assessment platform',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.className} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <main className="max-w-5xl mx-auto px-4 py-6 flex-1 w-full">
          <header className="mb-8 flex items-center justify-between">
            <Link href="/" className="font-semibold text-lg">
              Quiz Knowledge
            </Link>
            {/* Nav links land here in Phase 7 */}
          </header>
          {children}
        </main>
        <Toaster richColors />
      </body>
    </html>
  );
}
