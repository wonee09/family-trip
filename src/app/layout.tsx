import type { Metadata, Viewport } from "next";
import AppShell from "@/components/AppShell";
import "./globals.css";

export const metadata: Metadata = {
  title: "우리가족 여행도우미",
  description: "대만 가족여행 도우미",
  appleWebApp: { capable: true, title: "여행도우미", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="h-full bg-gray-100 text-gray-900">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
