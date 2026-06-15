const tooltipSurfaceClasses =
  'rounded-lg border border-slate-300/30 bg-white/90 text-xs font-medium text-slate-700 shadow-xl shadow-slate-400/20 backdrop-blur-xl';

const tooltipBaseClasses =
  `pointer-events-none absolute z-50 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 ${tooltipSurfaceClasses}`;

const hoverTooltipBaseClasses =
  `pointer-events-none absolute z-50 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 ${tooltipSurfaceClasses}`;

export function tooltipClasses(...classes: string[]) {
  return [tooltipBaseClasses, ...classes].filter(Boolean).join(' ');
}

export function hoverTooltipClasses(...classes: string[]) {
  return [hoverTooltipBaseClasses, ...classes].filter(Boolean).join(' ');
}

export function tooltipContentClasses(...classes: string[]) {
  return [tooltipSurfaceClasses, ...classes].filter(Boolean).join(' ');
}
