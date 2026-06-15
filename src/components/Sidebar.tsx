import { BarChart3, Car, CircleUserRound, Coffee, Footprints, Home, LayoutDashboard, LineChart, ReceiptText, X } from 'lucide-react';
import { NavLink } from 'react-router-dom';

const TWINT_THANK_YOU_URL = 'https://go.twint.ch/1/e/tw?tw=acq.SF-CFeDKQsSG4gqPKxcsn8YTI9RPFXNHoXvteLRjOMDbzGBzll4KLhW-DGK4jmcK.';

const navItems = [
  { label: 'Overview', icon: LayoutDashboard, to: '/', end: true },
  { label: 'Details', icon: BarChart3, to: '/details', end: true },
  { label: 'Progress', icon: LineChart, to: '/progress', end: true },
  { label: 'Expenses', icon: ReceiptText, to: '/expenses', end: false },
  { label: 'Car', icon: Car, to: '/car', end: true },
  { label: 'Mortgage', icon: Home, to: '/mortgage', end: true },
  { label: 'Contact', icon: CircleUserRound, to: '/contact', end: true },
] satisfies Array<{ label: string; icon: typeof BarChart3; to: string; end: boolean }>;

type SidebarProps = {
  onNavigate?: () => void;
};

type MobileSidebarDrawerProps = SidebarProps & {
  isOpen: boolean;
  onClose: () => void;
};

export function Sidebar({ onNavigate }: SidebarProps) {
  return (
    <aside className="glass-panel glass-panel-square m-0 hidden flex-col border-y-0 border-l-0 px-4 py-5 md:flex">
      <SidebarContent onNavigate={onNavigate} />
    </aside>
  );
}

export function MobileSidebarDrawer({ isOpen, onClose }: MobileSidebarDrawerProps) {
  return (
    <div className={`fixed inset-0 z-40 md:hidden ${isOpen ? '' : 'pointer-events-none'}`}>
      <button
        aria-label="Close navigation"
        className={`absolute inset-0 bg-slate-950/50 transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0'}`}
        type="button"
        onClick={onClose}
      />
      <aside
        className={`glass-panel glass-panel-square mobile-sidebar-panel fixed bottom-0 left-0 top-0 flex h-dvh min-h-screen w-[min(18rem,calc(100vw-3rem))] flex-col border-y-0 border-l-0 px-4 pb-3 pt-5 shadow-2xl transition-transform duration-200 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <button
          aria-label="Close navigation"
          className="absolute right-4 grid h-10 w-10 place-items-center rounded-lg text-slate-700 transition hover:bg-white/45"
          type="button"
          onClick={onClose}
        >
          <X className="h-5 w-5" />
        </button>
        <SidebarContent isMobile onNavigate={onClose} />
      </aside>
    </div>
  );
}

function SidebarContent({ isMobile = false, onNavigate }: SidebarProps & { isMobile?: boolean }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-3 px-2">
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-600 text-white shadow-xl shadow-blue-600/25">
          <BarChart3 className="h-6 w-6" />
        </div>
        <div>
          <p className="text-2xl font-semibold tracking-normal">Growly</p>
          <p className="text-xs text-slate-600">Financial Calculator</p>
        </div>
      </div>
      <nav className="mt-8 space-y-1.5">
        {navItems.map(({ end, label, icon: Icon, to }) => (
          <NavLink
            key={label}
            className={({ isActive }) =>
              `flex h-11 w-full items-center gap-3 rounded-lg px-4 text-sm font-semibold transition ${isActive
                ? 'border border-slate-300/30 bg-blue-600/14 text-blue-700 shadow-inner'
                : 'text-slate-700 hover:bg-white/45'
              }`
            }
            end={end}
            to={to}
            onClick={onNavigate}
          >
            <Icon className="h-5 w-5" />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="glass-panel mt-6 rounded-lg p-3 text-center">
        <div className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-blue-500/10 text-blue-600">
          <Footprints className="h-5 w-5" />
        </div>
        <p className="mt-3 text-sm leading-5 text-slate-900">Small steps today create freedom tomorrow.</p>
        <svg viewBox="0 0 180 58" className="mt-2 h-10 w-full text-violet-500" aria-hidden="true">
          <path d="M2 50 C24 35,30 62,48 45 S78 42,90 33 S124 8,142 24 S165 31,178 14" fill="none" stroke="currentColor" strokeWidth="2" />
        </svg>
      </div>
      <div className="mt-auto">
        <a
          className={`group block px-3 text-center transition focus:outline-none ${isMobile ? 'pb-0 pt-2' : 'py-2'}`}
          href={TWINT_THANK_YOU_URL}
          target="_blank"
          rel="noopener noreferrer"
        >
          <p className="text-sm text-slate-700">Thank you sticker</p>
          <div className="mx-auto mt-2 grid h-16 w-16 place-items-center rounded-3xl bg-linear-to-br from-blue-50 via-cyan-50 to-slate-100 text-blue-700 shadow-inner shadow-white/70 ring-1 ring-blue-200/50 transition group-hover:scale-102">
            <Coffee className="h-9 w-9" />
          </div>
          <p className="mt-1.5 text-xs font-medium tracking-normal text-slate-600">TWINT</p>
        </a>
      </div>
    </div>
  );
}
