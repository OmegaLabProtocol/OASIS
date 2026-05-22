import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { WatchlistProvider } from "@/components/providers/watchlist-provider";
import {
  APP_NAME,
  APP_FULL_NAME,
  TAGLINE,
} from "@/lib/constants";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: `${APP_NAME} — ${TAGLINE}`,
  description: `${APP_FULL_NAME}. Institutional digital asset intelligence powered by the Omega Risk Index (ORI).`,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${geistMono.variable} font-sans antialiased`}
      >
        <ThemeProvider>
          <WatchlistProvider>{children}</WatchlistProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
