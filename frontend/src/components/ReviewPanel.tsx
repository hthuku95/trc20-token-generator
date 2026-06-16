import { Rocket } from 'lucide-react';
import type { TokenFormValues, TronNetwork } from '../types/tron';
import { getNetworkLabel } from '../utils/network';

interface ReviewPanelProps {
  token: TokenFormValues | null;
  network: TronNetwork;
  factoryAddress: string;
  disabled: boolean;
  onDeploy: () => void;
}

export function ReviewPanel({ token, network, factoryAddress, disabled, onDeploy }: ReviewPanelProps) {
  const ready = Boolean(token && factoryAddress && network === 'nile');

  return (
    <aside className="rounded-lg border border-line bg-panel/86 p-5 shadow-glow">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-white">Review</h2>
        <p className="mt-1 text-sm text-slate-400">Confirm the deployment details before TronLink opens.</p>
      </div>

      <dl className="space-y-4 text-sm">
        <ReviewRow label="Token Name" value={token?.name || 'Not set'} />
        <ReviewRow label="Symbol" value={token?.symbol || 'Not set'} />
        <ReviewRow label="Supply" value={token?.supply || 'Not set'} />
        <ReviewRow label="Decimals" value={token ? String(token.decimals) : 'Not set'} />
        <ReviewRow label="Estimated Cost" value="Shown in TronLink" />
        <ReviewRow label="Network" value={getNetworkLabel(network)} />
        <ReviewRow label="Factory" value={factoryAddress || 'Set VITE_FACTORY_ADDRESS'} />
        {token?.iconUrl ? <ReviewRow label="Token Icon" value={token.iconUrl} /> : null}
        {token?.anchorPrice ? <ReviewRow label="Anchor Price" value={token.anchorPrice} /> : null}
        {token?.vanityAddress ? <ReviewRow label="Vanity Address" value={token.vanityAddress} /> : null}
      </dl>

      <button
        type="button"
        onClick={onDeploy}
        disabled={!ready || disabled}
        className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-mint px-4 text-sm font-semibold text-ink transition hover:bg-mint/90 disabled:cursor-not-allowed disabled:opacity-50"
        title="Deploy token through TronLink"
      >
        <Rocket className="h-4 w-4" />
        Deploy Token
      </button>
    </aside>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-line/70 pb-3 last:border-0 last:pb-0">
      <dt className="text-slate-400">{label}</dt>
      <dd className="max-w-[58%] break-words text-right font-medium text-slate-100">{value}</dd>
    </div>
  );
}
