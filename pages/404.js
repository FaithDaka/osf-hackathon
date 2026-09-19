import Link from 'next/link';

// Branded 404 for the static export AND dev unknown-routes.
// Rendering unknown URLs through the Pages runtime also avoids the dev-only
// App Router fallback (which crashes on preact/compat: React.cache missing).
export default function NotFound() {
  return (
    <main className="min-h-screen bg-white p-4">
      <div className="max-w-md mx-auto min-w-0">
        <header className="bg-primary-soft -mx-4 -mt-4 px-4 pt-4 pb-3">
          <div
            className="grid items-center min-h-[48px] min-w-0"
            style={{ gridTemplateColumns: 'minmax(0, 1fr) auto minmax(0, 1fr)' }}
          >
            <div className="flex justify-start min-w-0">
              <Link
                href="/"
                aria-label="Back"
                className="inline-flex items-center min-h-[48px] text-primary font-bold shrink-0 min-w-0 max-w-full"
                style={{ fontSize: '16px' }}
              >
                <span aria-hidden="true" className="shrink-0">←&nbsp;</span>
                <span className="truncate">Back</span>
              </Link>
            </div>
            <h1
              className="min-w-0 max-w-full text-center font-bold text-ink break-words px-2"
              style={{ fontSize: 'clamp(17px, 5.5vw, 20px)', lineHeight: '1.3', overflowWrap: 'anywhere' }}
            >
              404
            </h1>
            <div aria-hidden="true" className="min-w-0" />
          </div>
        </header>
        <div className="text-center pt-12">
        <svg
          width="56"
          height="56"
          viewBox="0 0 512 512"
          role="img"
          aria-label="AlertCitizen logo"
          className="mx-auto"
        >
          <rect width="512" height="512" rx="96" fill="#5B2D8E" />
          <path
            d="M256 72 L408 136 V264 C408 356 336 420 256 448 C176 420 104 356 104 264 V136 Z"
            fill="none"
            stroke="#F5F1FA"
            strokeWidth="28"
            strokeLinejoin="round"
          />
          <path
            d="M186 262 L238 314 L330 210"
            fill="none"
            stroke="#F5F1FA"
            strokeWidth="34"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <h2 className="mt-4 text-2xl font-bold">404</h2>
        <p className="mt-2 text-ac-muted">
          This page does not exist yet.
        </p>
        <Link
          href="/"
          className="btn-ac mt-6 w-full inline-flex bg-primary text-white rounded-lg"
        >
          ← AlertCitizen
        </Link>
        </div>
      </div>
    </main>
  );
}
