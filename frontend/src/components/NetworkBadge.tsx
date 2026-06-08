import { AlertTriangle, CheckCircle2, CircleHelp } from 'lucide-react';
import type { TronNetwork } from '../types/tron';
import { getNetworkLabel } from '../utils/network';

interface NetworkBadgeProps {
  network: TronNetwork;
}

export function NetworkBadge({ network }: NetworkBadgeProps) {
  const supported = network === 'mainnet' || network === 'nile';
  const unknown = network === 'unknown';
  const Icon = supported ? CheckCircle2 : unknown ? CircleHelp : AlertTriangle;

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm ${
        supported
          ? 'border-mint/40 bg-mint/10 text-mint'
          : 'border-amber/50 bg-amber/10 text-amber'
      }`}
    >
      <Icon className="h-4 w-4" />
      {getNetworkLabel(network)}
    </span>
  );
}
