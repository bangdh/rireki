// Print layout for the worker's Playwright render (media-pipeline skill): A4 pages, white, the 履歴書 without its on-screen
// frame, no shell. The root layout only adds the global CSS and fonts. Chromium paginates with @page and break-inside.
const STYLE = `
@page { size: A4; margin: 12mm; }
html, body { background: #fff !important; color-scheme: light; }
body { margin: 0; min-height: 0; }
.rirekisho { border: 0; max-width: none; padding: 0; }
.rirekisho table, .rirekisho tr, .rirekisho .para, .rirekisho .sec { break-inside: avoid; }
.rirekisho .sec { break-after: avoid; }
`;

export default function PrintLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: STYLE }} />
      {children}
    </>
  );
}
