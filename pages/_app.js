import Head from 'next/head';
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { getLang } from '../lib/i18n';
import '../styles/globals.css';

// PWA shell: head meta, service-worker registration, <html lang> sync.
// Real <html>/<body> attributes live here via effects (Pages Router has no
// client hook for <html>; the lang defaults to 'en' in static markup).
export default function App({ Component, pageProps }) {
  const router = useRouter();

  useEffect(() => {
    // Keep <html lang> in sync with ?lang= or stored preference.
    const q = router.query && router.query.lang;
    const lang = ['en', 'lg', 'sw'].includes(q) ? q : getLang();
    try {
      document.documentElement.lang = lang;
      document.documentElement.dataset.lang = lang;
    } catch {
      // Non-browser prerender — static default lang="en" applies.
    }
  }, [router.query]);

  useEffect(() => {
    // Offline support: register the hand-rolled service worker.
    try {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js').catch(() => {});
      }
    } catch {
      // SW unsupported — app still works online.
    }
  }, []);

  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#1B5E20" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
        <meta name="description" content="Verified civic information for every Ugandan. In your language. Anywhere" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/icons/icon-192.png" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </Head>
      <Component {...pageProps} />
    </>
  );
}
