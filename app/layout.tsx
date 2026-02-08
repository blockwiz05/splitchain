import type { Metadata } from "next";
import { Comfortaa } from "next/font/google";
import "./globals.css";
import { Providers } from "@/lib/config/providers";

const comfortaa = Comfortaa({
  subsets: ["latin"],
  variable: "--font-comfortaa",
});

export const metadata: Metadata = {
  title: "SplitChain - Multi-Chain Expense Splitting",
  description: "Split expenses seamlessly across multiple blockchains with instant off-chain sync and cross-chain settlements",
  keywords: ["DeFi", "expense splitting", "cross-chain", "Yellow Network", "LI.FI", "ENS"],
  authors: [{ name: "SplitChain Team" }],
  openGraph: {
    title: "SplitChain - Multi-Chain Expense Splitting",
    description: "Split expenses seamlessly across multiple blockchains",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${comfortaa.variable} font-sans antialiased min-h-screen`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
