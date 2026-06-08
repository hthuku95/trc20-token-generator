import { Wallet } from 'lucide-react';
import toast from 'react-hot-toast';
import { connectTronLink } from '../services/tronLink';
import { useDappStore } from '../store/useDappStore';
import { NetworkBadge } from './NetworkBadge';

function shortenAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-6)}`;
}

export function WalletConnectButton() {
  const walletAddress = useDappStore((state) => state.walletAddress);
  const network = useDappStore((state) => state.network);
  const setWallet = useDappStore((state) => state.setWallet);

  async function handleConnect() {
    try {
      const snapshot = await connectTronLink();
      setWallet(snapshot.walletAddress, snapshot.network);
      toast.success('Wallet connected');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Wallet connection failed');
    }
  }

  if (walletAddress) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <NetworkBadge network={network} />
        <span className="rounded-full border border-line bg-white/5 px-3 py-1.5 text-sm text-slate-200">
          {shortenAddress(walletAddress)}
        </span>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={handleConnect}
      className="inline-flex h-11 items-center gap-2 rounded-md bg-mint px-4 text-sm font-semibold text-ink transition hover:bg-mint/90"
      title="Connect TronLink wallet"
    >
      <Wallet className="h-4 w-4" />
      Connect Wallet
    </button>
  );
}
