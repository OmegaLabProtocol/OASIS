import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "OASIS — Investor Access",
  robots: { index: false, follow: false },
};

export default function InvestorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
