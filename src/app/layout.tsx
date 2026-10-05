import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Katungo Engine",
  description: "Leads, content, inbox, chatbots and monthly reports in one place.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB">
      <body>{children}</body>
    </html>
  );
}
