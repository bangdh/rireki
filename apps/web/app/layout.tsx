import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import { IconSprite } from "@/components/IconSprite";
import { Toasts } from "@/components/Toast";
import "./globals.css";

export const metadata: Metadata = { title: { default: "Rireki", template: "%s · Rireki" } };
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };

// Same Google Fonts request as the mockups (Be Vietnam Pro, Noto Sans JP, Noto Sans Myanmar, Noto Serif JP).
const FONTS =
  "https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700&family=Noto+Sans+JP:wght@400;500;700&family=Noto+Sans+Myanmar:wght@400;600&family=Noto+Serif+JP:wght@500;700&display=swap";
// Applies the saved theme before first paint; same localStorage key as assets/app.js so the mockup habit carries over.
const THEME_INIT =
  'try{var t=localStorage.getItem("rireki.theme");if(t==="dark"||t==="light")document.documentElement.setAttribute("data-theme",t)}catch(e){}';

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();
  return (
    // data-lang drives html[data-lang="my"] line-height in globals.css; suppressHydrationWarning covers data-theme set by THEME_INIT.
    <html lang={locale} data-lang={locale} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        {/* the mockups' stylesheet link; next/font would need network access at build time */}
        <link rel="stylesheet" href={FONTS} />
      </head>
      <body>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
        <IconSprite />
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
        <Toasts />
      </body>
    </html>
  );
}
