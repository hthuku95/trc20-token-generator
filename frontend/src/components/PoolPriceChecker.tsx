import { useState } from 'react';
import { Search, ExternalLink, Copy, Droplets } from 'lucide-react';
import toast from 'react-hot-toast';
import { getTronWeb } from '../services/tronLink';
import { getTronScanAddressUrl } from '../utils/network';
import { useDappStore } from '../store/useDappStore';

const SUNSWAP_FACTORY = 'TUTGcsGDRScK1gsDPMELV2QZxeESWb1Gac';
const WTRX = 'TYsbWxNnyTgsZaTFaue9hqpxkU3Fkco94a';
const FEE_TIER = 10000;
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

function decodeAddress(hex: string): string {
  const raw = hex.replace('0x', '');
  const tw = getTronWeb();
  if (tw?.address?.fromHex) {
    try {
      return String(tw.address.fromHex('0x' + raw.slice(0, 42)));
    } catch {}
  }
  // Fallback: just hex
  return '0x' + raw.slice(0, 40);
}

function decodeInt24(hex: string): number {
  const full = BigInt('0x' + hex);
  const val24 = Number(full & 0xFFFFFFn);
  if (val24 & 0x800000) return val24 - 0x1000000;
  return val24;
}

interface PoolInfo {
  poolAddress: string;
  sqrtPriceX96: string;
  tick: number;
  price: number;
  liquidity: string;
}

export function PoolPriceChecker() {
  const network = useDappStore((s) => s.network);
  const [tokenAddress, setTokenAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [poolInfo, setPoolInfo] = useState<PoolInfo | null>(null);
  const [notFound, setNotFound] = useState(false);

  async function handleSearch() {
    const addr = tokenAddress.trim();
    if (!addr) return;
    setLoading(true);
    setPoolInfo(null);
    setNotFound(false);

    if (network !== 'nile') {
      toast.error('Switch TronLink to Nile Testnet — SunSwap V3 on Mainnet is not supported yet');
      setLoading(false);
      return;
    }

    try {
      const factoryHex = base58ToHex(SUNSWAP_FACTORY);
      const tokenHex = base58ToHex(addr);
      const wtrxHex = base58ToHex(WTRX);

      const token0 = tokenHex.toLowerCase() < wtrxHex.toLowerCase() ? tokenHex : wtrxHex;
      const token1 = tokenHex.toLowerCase() < wtrxHex.toLowerCase() ? wtrxHex : tokenHex;

      // getPool(address,address,uint24) selector = 0x1698ee82
      const getPoolData = '0x1698ee82'
        + padHex(token0, 32).replace('0x', '')
        + padHex(token1, 32).replace('0x', '')
        + padHex(FEE_TIER.toString(16), 32).replace('0x', '');

      const poolRaw = await rpcCall(factoryHex, getPoolData);
      const poolHex = poolRaw.replace('0x', '').toLowerCase();
      if (!poolHex || poolHex === '0000000000000000000000000000000000000000' || poolHex.startsWith('4100000000000000000000000000000000000000')) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      const poolAddr = decodeAddress(poolHex);

      // slot0() selector = 0x3850c7bd
      const slot0Raw = await rpcCall('0x' + poolHex, '0x3850c7bd');
      const slot0Hex = slot0Raw.replace('0x', '');
      const tick = decodeInt24(slot0Hex.slice(64, 128));

      // liquidity() selector = 0x1a686502
      const liqRaw = await rpcCall('0x' + poolHex, '0x1a686502');
      const liquidity = BigInt(liqRaw).toString();

      const price = Math.pow(1.0001, tick);

      setPoolInfo({
        poolAddress: poolAddr,
        sqrtPriceX96: '0x' + slot0Hex.slice(0, 64),
        tick,
        price,
        liquidity,
      });
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
      {notFound && (
        <p className="mt-3 text-sm text-amber">
          No SunSwap V3 pool found for this token on {network === 'mainnet' ? 'Mainnet' : 'Nile'}.
        </p>
      )}

      {poolInfo && (
        <div className="mt-4 space-y-3 rounded-md border border-line/70 bg-ink/40 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">Pool Address</span>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => { navigator.clipboard.writeText(poolInfo.poolAddress); toast.success('Pool address copied'); }}
                className="text-slate-400 hover:text-white"
              >
                <Copy className="h-3 w-3" />
              </button>
              <a
                href={getTronScanAddressUrl(network, poolInfo.poolAddress)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-400 hover:text-white"
              >
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
          <p className="break-all text-sm text-slate-200">{poolInfo.poolAddress}</p>

          <div className="flex items-center gap-2 text-sm">
            <span className="text-slate-400">Current Price:</span>
            <span className="font-semibold text-white">{poolInfo.price.toFixed(4)} WTRX per token</span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-md bg-ink/40 p-2">
              <span className="text-slate-500">Tick</span>
              <p className="font-mono text-slate-200">{poolInfo.tick}</p>
            </div>
            <div className="rounded-md bg-ink/40 p-2">
              <span className="text-slate-500">Liquidity</span>
              <p className="font-mono text-slate-200">{poolInfo.liquidity}</p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
