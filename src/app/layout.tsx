import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Elite Kuaför - Salon Yönetim",
  description: "Kuaför salon yönetim ve performans takip sistemi",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;450;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
