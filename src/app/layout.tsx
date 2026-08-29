import type { Metadata, Viewport } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "ThinkTrace AI — see how your class is confused",
    template: "%s · ThinkTrace AI",
  },
  description:
    "ThinkTrace AI connects classroom-level confusion with individual misconception diagnosis, prerequisite repair, targeted practice and teach-back verification.",
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = {
  themeColor: "#4f46e5",
  width: "device-width",
  initialScale: 1,
};

const FONT_STACK =
  'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", "Noto Sans Telugu", "Noto Sans Devanagari", sans-serif, "Apple Color Emoji", "Segoe UI Emoji"';

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body style={{ fontFamily: FONT_STACK }} className="antialiased">
        {children}
      </body>
    </html>
  );
}
