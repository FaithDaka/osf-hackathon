import Link from 'next/link';

// Bottom navigation matching the reference design:
// dark bar, icon above a short label, active tab in bright blue with a
// small top indicator. No underlines.
//
// Why inline SVGs instead of react-icons?
// react-icons ships thousands of icons; even with tree-shaking the extra
// dependency bloats this small PWA (and risks Preact-compat issues — see
// next.config.js). These 5 outline icons are ~2KB total, zero deps.

function HomeIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V21h14V9.5" />
      <path d="M9 21v-6h6v6" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.7 21a2 2 0 0 1-3.4 0" />
    </svg>
  );
}

function ReportIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M9 8h6M9 12h6M9 16h4" />
    </svg>
  );
}

function QuizIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9a2.5 2.5 0 0 1 4.9.8c0 1.7-2.4 2.1-2.4 3.7" />
      <circle cx="12" cy="17" r="0.5" fill="currentColor" />
    </svg>
  );
}

function RepsIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 21h18" />
      <path d="M5 21V7l7-4 7 4v14" />
      <path d="M9 21v-4h6v4" />
      <path d="M9 10h.01M15 10h.01M9 13h.01M15 13h.01" />
    </svg>
  );
}

// Visible labels stay short in every language (≤6 chars) so they never
// overflow a 5-tab bar; the full localized name goes in aria-label.
export default function BottomNav({ active, lang = 'en', strings }) {
  const S = strings || {};
  const tabs = [
    { path: '/home', label: 'Home', full: 'Home', Icon: HomeIcon },
    { path: '/announcements', label: 'Alerts', full: S.announcements || 'Alerts', Icon: BellIcon },
    { path: '/lc-initiatives', label: 'Reps', full: S.representatives || 'Your Representatives', Icon: RepsIcon },
    { path: '/quiz', label: 'Knowledge Quiz', full: S.quiz || 'Civic Quiz', Icon: QuizIcon },
  ];

  return (
    <nav
      role="navigation"
      aria-label="Main"
      className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-300"
    // style={{ backgroundColor: '#17191d', borderTop: '1px solid #26292f' }}
    >
      <div
        className="mx-auto flex max-w-md"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        {tabs.map(({ path, label, full, Icon }) => {
          const isActive = active === path;
          return (
            <>
              <Link
                key={path}
                href={`${path}?lang=${lang}`}
                aria-label={full}
                aria-current={isActive ? 'page' : undefined}
                className="relative flex flex-1 flex-col items-center justify-center"
                style={{
                  minHeight: '64px',
                  minWidth: '48px',
                  paddingTop: '10px',
                  paddingBottom: '10px',
                  color: isActive ? '#5b2d8e' : '#8b9096',
                  textDecoration: 'none',
                }}
              >
                
                <span aria-hidden="true" style={{ lineHeight: 0 }}>
                  <Icon />
                </span>
                <span
                  style={{
                    marginTop: '4px',
                    fontSize: '11px',
                    lineHeight: '1.2',
                    fontWeight: isActive ? 700 : 400,
                    textDecoration: 'none',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {label}
                </span>
                {isActive && (
                  <span
                    aria-hidden="true"
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: '40px',
                      height: '3px',
                      borderRadius: '0 0 3px 3px',
                      backgroundColor: '#5b2d8e',
                    }}
                  />
                )}
              </Link>
            </>
          );
        })}
      </div>
    </nav>
  );
}
