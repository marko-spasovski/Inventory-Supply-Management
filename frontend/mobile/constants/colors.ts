// Design tokens — mirrors the slate + Tailwind blue-500 palette used by the
// web micro-frontends (shell, *-mf). New code should import from here so the
// palette stays consistent across mobile + web.
//
// To verify alignment with the web MFs, grep their src/ for the same hex
// values (e.g. micro-frontends/auth-mf/src/App.tsx uses `#3b82f6` for the
// primary button and `#1e293b` for headings).
export const colors = {
  // Brand / accent — blue-500 (matches MFs)
  primary:        '#3b82f6',
  primaryDark:    '#2563eb',
  primarySoft:    '#dbeafe',   // light tint for hover / chip backgrounds
  primaryMuted:   '#93c5fd',   // mid-tone for inactive accents
  onPrimary:      '#ffffff',

  // Surfaces (slate)
  background:     '#f1f5f9',   // app bg
  card:           '#ffffff',
  sidebar:        '#1e293b',
  borderSubtle:   '#e2e8f0',
  borderStrong:   '#cbd5e1',
  divider:        '#334155',   // on dark surfaces

  // Text
  textPrimary:    '#1e293b',
  textSecondary:  '#475569',
  textMuted:      '#64748b',
  textPlaceholder:'#94a3b8',
  textOnDark:     '#f8fafc',

  // Semantic — aligned with the web MFs.
  success:        '#10b981',   // emerald-500 (matches MFs' Delivered, NotificationsPanel success)
  successSoft:    '#ecfdf5',
  successText:    '#065f46',
  warning:        '#f59e0b',
  warningSoft:    '#fef3c7',
  warningText:    '#92400e',
  danger:         '#dc2626',   // red-600 (matches MFs' destructive + low-stock)
  dangerSoft:     '#fef2f2',
  dangerBorder:   '#fecaca',
  dangerText:     '#b91c1c',
  info:           '#3b82f6',   // blue-500 (matches NotificationsPanel info severity)

  // Order status (must match orders-mf STATUS_COLOR exactly)
  statusRequested: '#f59e0b',
  statusApproved:  '#3b82f6',
  statusDelivered: '#10b981',
  statusClosed:    '#64748b',

  // Notification severity (matches NotificationsPanel SEVERITY_COLOR)
  severityInfo:    '#3b82f6',
  severityWarning: '#f59e0b',
  severityError:   '#dc2626',
  severitySuccess: '#16a34a',

  // Scanner / dark surfaces (used by the scanner screen only)
  darkBg:         '#0f172a',
  darkSurface:    '#1e293b',
  darkBorder:     '#334155',
} as const;

export type Color = typeof colors[keyof typeof colors];
