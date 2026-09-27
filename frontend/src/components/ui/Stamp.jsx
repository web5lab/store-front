import { Check, CircleDashed, Clock } from 'lucide-react';

const STATUS = {
  Paid: { cls: 'stamp-paid', label: 'Paid', Icon: Check },
  Partial: { cls: 'stamp-partial', label: 'Part paid', Icon: CircleDashed },
  Pending: { cls: 'stamp-pending', label: 'Due', Icon: Clock },
};

/**
 * Payment status as a rubber stamp — the one flourish in the interface.
 * Small and level in tables; large, tilted and landing on the bill slip.
 */
export default function Stamp({ status, size = 'sm', tilt = -6, animate = false }) {
  const s = STATUS[status] || STATUS.Pending;
  if (size === 'lg') {
    return (
      <span className={`stamp stamp-lg ${s.cls} ${animate ? 'animate-stamp' : ''}`} style={{ '--tilt': `${tilt}deg` }} aria-label={`Payment status: ${s.label}`}>
        {s.label}
      </span>
    );
  }
  return (
    <span className={`stamp ${s.cls}`} aria-label={`Payment status: ${s.label}`}>
      <s.Icon className="h-3 w-3" strokeWidth={2.6} aria-hidden />
      {s.label}
    </span>
  );
}
