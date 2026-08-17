import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { LayoutGrid, Megaphone, Settings, Menu, X } from 'lucide-react';
import { useLive } from '../../hooks/use-sse';
import { useIsDesktop } from '../../hooks/use-media-query';
import { Button } from '../ui/Button';
import { cn } from '../../lib/utils';

/**
 * Leads deliberately have no top-level entry — every lead is reached through
 * the campaign that discovered it.
 */
const NAV = [
  { to: '/', label: 'Overview', icon: LayoutGrid, end: true },
  { to: '/campaigns', label: 'Campaigns', icon: Megaphone, end: false },
  { to: '/settings', label: 'Settings', icon: Settings, end: false },
];

/**
 * `inert` is a valid HTML attribute but React 18's types predate it. Spreading
 * it keeps the call site honest without casting the whole element.
 */
const inertWhen = (condition: boolean) =>
  (condition ? { inert: '' } : {}) as { inert?: '' };

/** The brand mark. The one place a saturated fill is decoration rather than state. */
function BrandMark() {
  return (
    <span
      className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-accent-500 to-accent-700 text-xs font-bold text-white shadow-sm"
      aria-hidden
    >
      B
    </span>
  );
}

/** Shows whether live updates are actually arriving. */
function ConnectionDot() {
  const { status } = useLive();

  const config = {
    live: { className: 'bg-positive-600', label: 'Live updates connected' },
    connecting: { className: 'bg-slate-300', label: 'Connecting to live updates' },
    reconnecting: { className: 'bg-caution-600', label: 'Reconnecting to live updates' },
  }[status];

  return (
    <span className="flex items-center gap-2" title={config.label}>
      <span className="relative flex h-1.5 w-1.5 shrink-0" aria-hidden>
        <span className={cn('h-1.5 w-1.5 rounded-full', config.className)} />
        {/* Only a working connection pulses. A still dot next to the word
            "Live" would be indistinguishable from a frozen page. */}
        {status === 'live' && (
          <span className="absolute inset-0 rounded-full bg-positive-600 animate-halo motion-reduce:hidden" />
        )}
      </span>
      <span className="sr-only">{config.label}</span>
      <span className="text-xs text-slate-400" aria-hidden>
        {status === 'live' ? 'Live' : status === 'reconnecting' ? 'Reconnecting' : 'Connecting'}
      </span>
    </span>
  );
}

export function AppLayout() {
  const [navOpen, setNavOpen] = useState(false);
  const isDesktop = useIsDesktop();
  const { pathname } = useLocation();

  // Close the mobile drawer on navigation, or it covers the page just opened.
  useEffect(() => setNavOpen(false), [pathname]);

  return (
    <div className="flex h-screen overflow-hidden">
      {navOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/30 backdrop-blur-[2px] animate-fade-in lg:hidden"
          onClick={() => setNavOpen(false)}
          aria-hidden
        />
      )}

      <aside
        // Hidden from assistive tech and the tab order when closed on mobile,
        // so keyboard focus cannot land in off-screen navigation. The lg
        // breakpoint pins it open, where it must stay reachable.
        {...inertWhen(!navOpen && !isDesktop)}
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-60 shrink-0 flex-col border-r border-slate-200 bg-white/90 backdrop-blur-md',
          'transition-transform duration-300 ease-out lg:static lg:translate-x-0',
          navOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-16 items-center gap-2.5 border-b border-slate-200 px-4">
          <BrandMark />
          <span className="text-sm font-semibold tracking-tight text-slate-900">B-Matrix</span>
          <Button
            variant="ghost"
            size="sm"
            label="Close navigation"
            icon={<X />}
            onClick={() => setNavOpen(false)}
            className="ml-auto lg:hidden"
          />
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'group relative flex items-center gap-2.5 rounded-md py-2 pl-3 pr-2.5 text-sm font-medium',
                  'transition-colors duration-150 ease-out',
                  isActive
                    ? 'bg-accent-50 text-accent-700'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
                )
              }
            >
              {({ isActive }) => (
                <>
                  {/* The current section carries a rail as well as a fill, so
                      it is still marked if the tint is hard to see. */}
                  <span
                    className={cn(
                      'absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-accent-600',
                      'transition-opacity duration-200 ease-out',
                      isActive ? 'opacity-100' : 'opacity-0',
                    )}
                    aria-hidden
                  />
                  <Icon
                    className={cn(
                      'h-4 w-4 shrink-0 transition-colors duration-150',
                      isActive ? 'text-accent-600' : 'text-slate-400 group-hover:text-slate-600',
                    )}
                    aria-hidden
                  />
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-slate-200 px-4 py-3.5">
          <ConnectionDot />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b border-slate-200 bg-white/90 px-4 backdrop-blur-md lg:hidden">
          <Button
            variant="ghost"
            size="sm"
            label="Open navigation"
            icon={<Menu />}
            onClick={() => setNavOpen(true)}
          />
          <BrandMark />
          <span className="text-sm font-semibold tracking-tight text-slate-900">B-Matrix</span>
          <span className="ml-auto">
            <ConnectionDot />
          </span>
        </header>

        <main className="flex-1 overflow-y-auto">
          {/* Keyed on the path so each page fades in on arrival. Search params
              are not part of the key — filtering a list must not re-animate it. */}
          <div
            key={pathname}
            className="mx-auto max-w-6xl animate-fade-in px-4 py-6 sm:px-6 lg:px-8 lg:py-8"
          >
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
