import type { Metadata } from "next";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/ThemeProvider";
import "./globals.css";
import Script from "next/script";

export const metadata: Metadata = {
  title: "GDM Send — Secure file transfer",
  description:
    "Send files up to 5 GB securely to Gaviso agency. No account required.",
};

const themeInitScript = `
(function() {
  try {
    var key = 'gdm-send-theme';
    var stored = localStorage.getItem(key);
    var mode = stored && ['light','dark','system'].indexOf(stored) !== -1 ? stored : 'system';
    var resolved = mode === 'system'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : mode;
    document.documentElement.dataset.theme = resolved;
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <Script id="theme-init" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <ThemeProvider>
          {children}
          <Toaster position="top-right" richColors theme="system" />
        </ThemeProvider>
      </body>
    </html>
  );
}
