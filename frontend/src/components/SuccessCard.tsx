import { Copy, ExternalLink, PlusCircle } from 'lucide-react';
import type { ReactElement } from 'react';
import toast from 'react-hot-toast';
import type { DeploymentResult } from '../types/tron';
import { getTronScanAddressUrl, getTronScanTxUrl } from '../utils/network';

interface SuccessCardProps {
  result: DeploymentResult | null;
  onCreateAnother: () => void;
}

export function SuccessCard({ result, onCreateAnother }: SuccessCardProps) {
  if (!result) {
    return null;
  }

  async function copy(value: string, label: string) {
    await navigator.clipboard.writeText(value);
    toast.success(`${label} copied`);
  }

  return (
    <section className="rounded-lg border border-mint/40 bg-mint/10 p-5">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-white">Token Deployed</h2>
        <p className="mt-1 text-sm text-slate-300">{result.name} is now available on TRON.</p>
      </div>

      {result.iconUrl ? (
        <div className="mb-4 flex justify-center">
          <img src={result.iconUrl} alt={result.name} className="h-20 w-20 rounded-full border border-line object-cover" />
        </div>
      ) : null}
      <dl className="grid gap-4 text-sm md:grid-cols-2">
        <ResultRow label="Token Name" value={result.name} />
        <ResultRow label="Symbol" value={result.symbol} />
        <ResultRow label="Contract Address" value={result.contractAddress} />
        <ResultRow label="Transaction Hash" value={result.transactionHash} />
        <ResultRow label="Owner Address" value={result.ownerAddress} />
      </dl>

      <div className="mt-6 flex flex-wrap gap-3">
        <ActionButton onClick={() => copy(result.contractAddress, 'Address')} label="Copy Address" icon={<Copy />} />
        <ActionButton onClick={() => copy(result.transactionHash, 'Transaction hash')} label="Copy TX Hash" icon={<Copy />} />
        <a
          href={getTronScanTxUrl(result.network, result.transactionHash)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-10 items-center gap-2 rounded-md border border-line px-3 text-sm font-semibold text-slate-100 transition hover:border-mint"
        >
          <ExternalLink className="h-4 w-4" />
          View TX
        </a>
        <a
          href={getTronScanAddressUrl(result.network, result.contractAddress)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-10 items-center gap-2 rounded-md border border-line px-3 text-sm font-semibold text-slate-100 transition hover:border-mint"
        >
          <ExternalLink className="h-4 w-4" />
          View Contract
        </a>
        <ActionButton onClick={onCreateAnother} label="Create Another" icon={<PlusCircle />} />
      </div>
    </section>
  );
}

function ResultRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-md border border-line/70 bg-ink/40 p-3">
      <dt className="text-xs uppercase text-slate-500">{label}</dt>
      <dd className="mt-1 break-words text-slate-100">{value}</dd>
    </div>
  );
}

function ActionButton({
  onClick,
  label,
  icon,
}: {
  onClick: () => void;
  label: string;
  icon: ReactElement;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-10 items-center gap-2 rounded-md border border-line px-3 text-sm font-semibold text-slate-100 transition hover:border-mint"
    >
      {icon}
      {label}
    </button>
  );
}
