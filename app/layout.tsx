import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nofrills Dental Treatment Plan",
  description: "Dental treatment plan and quotation generator",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}