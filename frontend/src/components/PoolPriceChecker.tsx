import { useState } from 'react';
import { Search, ExternalLink, Copy, Droplets } from 'lucide-react';
import toast from 'react-hot-toast';
import { getTronWeb } from '../services/tronLink';
import { getTronScanAddressUrl } from '../utils/network';
import { useDappStore } from '../store/useDappStore';

const SUNSWAP_FACTORY = 'TUTGcsGDRScK1gsDPMELV2QZxeESWb1Gac';
const WTRX = 'TYsbWxNnyTgsZaTFaue9hqpxkU3Fkco94a';
const FEE_TIERS = [
  { tier: 10000, label: '1%' },
  { tier: 3000, label: '0.30%' },
  { tier: 500, label: '0.05%' },
  { tier: 100, label: '0.01%' },
];
const NILE_RPC = 'https://nile.trongrid.io/jsonrpc';

const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

function base58ToHex(base58: string): string {
  let num = 0n;
  for (const ch of base58) {
    const idx = BASE58_ALPHABET.indexOf(ch);
    if (idx === -1) throw new Error(`Invalid base58 character: ${ch}`);
    num = num * 58n + BigInt(idx);
  }
  let hex = num.toString(16);
  if (hex.length % 2) hex = '0' + hex;
  // Keep leading zeros (TRON addresses have a leading 1 that encodes to 00 bytes)
  const leadingZeros = base58.match(/^1+/)?.[0]?.length ?? 0;
  hex = '00'.repeat(leadingZeros) + hex;
  // TRON addresses use 0x41 prefix
  return '0x41' + hex.slice(2, 42);
}

function padHex(hex: string, bytes: number): string {
  return '0x' + hex.replace('0x', '').padStart(bytes * 2, '0');
}

async function rpcCall(to: string, data: string): Promise<string> {
  const res = await fetch(NILE_RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'eth_call',
      params: [{ to, data }, 'latest'],
    }),
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error.message || String(json.error));
  return String(json.result);
}

// Extract 20-byte address from a 32-byte ABI word and return TRON hex (0x41...)
function extractAddress(abiWord: string): string {
  const raw = abiWord.replace('0x', '');
  return '0x41' + raw.slice(-40);
}

// Convert 0x41-prefixed TRON hex back to base58 for display
function hexToBase58(hex: string): string {
  const tw = getTronWeb();
  if (tw?.address?.fromHex) return String(tw.address.fromHex(hex.replace('0x', '')));
  return hex; // fallback
}

function decodeInt24(hex: string): number {
  const full = BigInt('0x' + hex);
  const val24 = Number(full & 0xFFFFFFn);
  if (val24 & 0x800000) return val24 - 0x1000000;
  return val24;
}

interface PoolInfo {
  feeLabel: string;
  feeTier: number;
  poolAddress: string;
  tick: number;
  price: number;
  liquidity: string;
}

export function PoolPriceChecker() {
  const network = useDappStore((s) => s.network);
  const [tokenAddress, setTokenAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [poolInfos, setPoolInfos] = useState<PoolInfo[]>([]);
  const [searched, setSearched] = useState(false);
  const [totalSupply, setTotalSupply] = useState<string | null>(null);

  async function handleSearch() {
    const addr = tokenAddress.trim();
    if (!addr) return;
    setLoading(true);
    setPoolInfos([]);
    setSearched(false);

    if (network !== 'nile') {
      toast.error('Switch TronLink to Nile Testnet — SunSwap V3 on Mainnet is not supported yet');
      setLoading(false);
      return;
    }

    try {
      const factoryHex = base58ToHex(SUNSWAP_FACTORY);
      const tokenHex = base58ToHex(addr);
      const wtrxHex = base58ToHex(WTRX);

      // Fetch total supply (selector = 0x18160ddd)
      const supplyRaw = await rpcCall(tokenHex, '0x18160ddd');
      const supply = BigInt(supplyRaw);
      setTotalSupply(supply.toString());

      const token0 = tokenHex.toLowerCase() < wtrxHex.toLowerCase() ? tokenHex : wtrxHex;
      const token1 = tokenHex.toLowerCase() < wtrxHex.toLowerCase() ? wtrxHex : tokenHex;

      const foundPools: PoolInfo[] = [];

      for (const ft of FEE_TIERS) {
        const getPoolData = '0x1698ee82'
          + padHex(token0, 32).replace('0x', '')
          + padHex(token1, 32).replace('0x', '')
          + padHex(ft.tier.toString(16), 32).replace('0x', '');

        const poolRaw = await rpcCall(factoryHex, getPoolData);
        const poolEvmAddr = poolRaw.replace('0x', '').toLowerCase().slice(-40);
        if (!poolEvmAddr || /^0+$/.test(poolEvmAddr)) continue;

        const poolTronHex = '0x41' + poolEvmAddr;
        const poolAddr = hexToBase58(poolTronHex);

        const slot0Raw = await rpcCall(poolTronHex, '0x3850c7bd');
        const slot0Hex = slot0Raw.replace('0x', '');
        const tick = decodeInt24(slot0Hex.slice(64, 128));

        const liqRaw = await rpcCall(poolTronHex, '0x1a686502');
        const liquidity = BigInt(liqRaw).toString();

        foundPools.push({
          feeLabel: ft.label,
          feeTier: ft.tier,
          poolAddress: poolAddr,
          tick,
          price: Math.pow(1.0001, tick),
          liquidity,
        });
      }

      setPoolInfos(foundPools);
      setSearched(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to read pool';
      toast.error(msg.includes('smart contract') ? 'Contract not found on this network. Make sure TronLink is on Nile Testnet.' : msg);
    }
    setLoading(false);
  }

  return (
    <section className="rounded-lg border border-line bg-panel/86 p-5 shadow-glow">
      <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-white">
        <Droplets className="h-5 w-5 text-sky" />
        Pool Price Checker
      </h2>
      <p className="mb-3 text-sm text-slate-400">
        Enter any TRC-20 token address to check its SunSwap V3 pool price.
      </p>
      <div className="flex gap-2">
        <input
          value={tokenAddress}
          onChange={(e) => setTokenAddress(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="TRC-20 token address"
          className="h-10 flex-1 rounded-md border border-line bg-ink/60 px-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-mint"
        />
        <button
          type="button"
          onClick={handleSearch}
          disabled={loading || !tokenAddress.trim()}
          className="inline-flex h-10 items-center gap-2 rounded-md bg-mint px-4 text-sm font-semibold text-ink transition hover:bg-mint/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Search className="h-4 w-4" />
          {loading ? 'Searching...' : 'Check'}
        </button>
      </div>

      {network !== 'nile' && (
        <p className="mt-3 text-sm text-amber">
          Switch TronLink to Nile Testnet to check pool prices. SunSwap V3 on Mainnet is not supported yet.
        </p>
      )}
      {searched && poolInfos.length === 0 && (
        <p className="mt-3 text-sm text-amber">
          No SunSwap V3 pool found for this token on Nile.
        </p>
      )}

      {poolInfos.map((p) => (
        <div key={p.feeTier} className="mt-4 space-y-3 rounded-md border border-line/70 bg-ink/40 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">Pool ({p.feeLabel})</span>
            <div className="flex gap-2">
              <span className="text-xs text-slate-600">{p.poolAddress.slice(0, 8)}...{p.poolAddress.slice(-4)}</span>
              <button
                type="button"
                onClick={() => { navigator.clipboard.writeText(p.poolAddress); toast.success('Pool address copied'); }}
                className="text-slate-400 hover:text-white"
              >
                <Copy className="h-3 w-3" />
              </button>
              <a
                href={getTronScanAddressUrl(network, p.poolAddress)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-400 hover:text-white"
              >
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
          <p className="break-all text-sm text-slate-200">{p.poolAddress}</p>

          <div className="flex items-center gap-2 text-sm">
            <span className="text-slate-400">Current Price:</span>
            <span className="font-semibold text-white">{p.price.toFixed(4)} WTRX per token</span>
          </div>

          <div className="grid grid-cols-3 gap-3 text-xs">
            <div className="rounded-md bg-ink/40 p-2">
              <span className="text-slate-500">Fee</span>
              <p className="font-mono text-slate-200">{p.feeLabel}</p>
            </div>
            <div className="rounded-md bg-ink/40 p-2">
              <span className="text-slate-500">Tick</span>
              <p className="font-mono text-slate-200">{p.tick}</p>
            </div>
            <div className="rounded-md bg-ink/40 p-2">
              <span className="text-slate-500">Liquidity</span>
              <p className="font-mono text-slate-200">{p.liquidity}</p>
            </div>
          </div>
        </div>
      ))}

      {poolInfos.length > 0 && totalSupply && (
        <div className="mt-4 rounded-md border border-line/70 bg-ink/40 p-4">
          <h4 className="mb-3 text-xs font-semibold uppercase text-slate-500">Token Info</h4>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">Total Supply</span>
            <span className="font-semibold text-white">{(Number(totalSupply) / 1e6).toLocaleString()} tokens</span>
          </div>
          <div className="flex items-center justify-between text-sm mt-2">
            <span className="text-slate-400">Pool Price</span>
            <span className="font-semibold text-white">{poolInfos[0].price.toFixed(4)} WTRX per token</span>
          </div>
          <div className="flex items-center justify-between text-sm mt-2 border-t border-line/40 pt-2">
            <span className="text-slate-400">Market Cap</span>
            <span className="font-semibold text-white">
              ${(Number(totalSupply) / 1e6 * poolInfos[0].price * 0.33).toLocaleString(undefined, {maximumFractionDigits: 0})} USD
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {poolInfos[0].price.toFixed(4)} WTRX ≈ ${(poolInfos[0].price * 0.33).toFixed(2)} at $0.33/WTRX
          </p>
        </div>
      )}
    </section>
  );
}
