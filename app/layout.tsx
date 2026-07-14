import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "New Voices Dialer",
  description: "Browser-based Twilio dialer — make and receive calls",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
