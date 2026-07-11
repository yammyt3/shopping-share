import type { Metadata, Viewport } from "next";
import { Geist, Zen_Kaku_Gothic_New } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const zenKaku = Zen_Kaku_Gothic_New({
  variable: "--font-zen-kaku",
  subsets: ["latin"],
  weight: ["500", "700", "900"],
});

export const metadata: Metadata = {
  title: "お買い物メモ｜家族で共有できる買い物リスト",
  description: "いつもの商品を選択して、家族でシンプルに共有できる買い物リスト。",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#285B45",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={`${geistSans.variable} ${zenKaku.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
