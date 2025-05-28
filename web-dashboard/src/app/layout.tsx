import type { Metadata } from "next";
import { Poetsen_One, Ubuntu } from 'next/font/google';
import "./globals.css";

const poetsenOne = Poetsen_One({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-poetsen-one',
  display: 'swap',
});

const ubuntu = Ubuntu({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-ubuntu',
  display: 'swap',
});

export const metadata: Metadata = {
  title: "Chiwawa",
  description: "",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${poetsenOne.variable} ${ubuntu.variable}`}>
        {children}
      </body>
    </html>
  );
}
