import Link from 'next/link';

// Shared page header — soft background, Back link on the left, title
// centered to the page (not to the remaining row space), optional
// description + children (e.g. DistrictCarousel, filters) underneath.
// Used by every content page except home so headers match everywhere.
//
// Centering: equal-width (1fr) side columns with the title in an auto
// middle column, so the title stays on the page centerline even though
// the Back label width varies by language. The right column is an empty
// spacer that balances the Back link. Responsive down to 280px: title
// wraps (min-w-0 + break-words) with a clamped font size, Back keeps a
// 48px touch target but truncates instead of pushing the title off.
export default function PageHeader({
  backHref,
  backLabel,
  title,
  description,
  children,
}) {
  return (
    <header className="bg-primary-soft -mx-4 -mt-4 px-4 pt-4 pb-3">
      <div
        className="grid items-center min-h-[48px] min-w-0"
        style={{ gridTemplateColumns: 'minmax(0, 1fr) auto minmax(0, 1fr)' }}
      >
        <div className="flex justify-start min-w-0">
          <Link
            href={backHref}
            aria-label={backLabel}
            className="inline-flex items-center min-h-[48px] text-primary font-bold shrink-0 min-w-0 max-w-full"
            style={{ fontSize: '16px' }}
          >
            <span aria-hidden="true" className="shrink-0">←&nbsp;</span>
            <span className="truncate">{backLabel}</span>
          </Link>
        </div>
        <h1
          className="min-w-0 max-w-full text-center font-bold text-ink break-words px-2"
          style={{ fontSize: 'clamp(17px, 5.5vw, 20px)', lineHeight: '1.3', overflowWrap: 'anywhere' }}
        >
          {title}
        </h1>
        <div aria-hidden="true" className="min-w-0" />
      </div>
      {description ? (
        <p className="mt-1 text-ac-muted" style={{ fontSize: '16px' }}>
          {description}
        </p>
      ) : null}
      {children ? <div className="mt-2 min-w-0">{children}</div> : null}
    </header>
  );
}
