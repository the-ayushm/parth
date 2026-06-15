import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Providers from './providers';


const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Chotu',
  description: 'WhatsApp Business API Management',
  icons: {
    icon: '/images/logo/logo.jpeg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={inter.className}>
        <Providers>
          {children}
        </Providers>
        <ToastContainer
          position="top-right"
          autoClose={3000}
          theme="light"
        />
      </body>
    </html>
  );
}
