import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AppProviders } from "./providers/AppProviders";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Broad UROP",
  description: "Broad UROP Application",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const theme = localStorage.getItem('theme') || 'system';
                  let effectiveTheme = theme;
                  
                  if (theme === 'system') {
                    effectiveTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                  }
                  
                  document.documentElement.classList.add(effectiveTheme);
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className={`${inter.className} h-full overflow-hidden antialiased`} suppressHydrationWarning>
        <AppProviders>
                      {children}
        </AppProviders>
      </body>
    </html>
  );
}
