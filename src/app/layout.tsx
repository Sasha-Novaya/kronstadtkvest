import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Аудиоквесты по Кронштадту",
  description:
    "Аудиоквесты по Кронштадту с капитаном Федотом Селёдкиным и чайкой Клушей",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#e6ebf0" },
    { media: "(prefers-color-scheme: dark)", color: "#0c1a30" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
