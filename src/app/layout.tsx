import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Katungo Studio",
  description: "Client marketing systems, run on the Story-to-Scale Method.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-GB" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
