import { useState } from 'react';
import { Search, ExternalLink, Copy, Droplets } from 'lucide-react';
import toast from 'react-hot-toast';
import { getTronWeb } from '../services/tronLink';
import { getTronScanAddressUrl } from '../utils/network';
import { useDappStore } from '../store/useDappStore';

const SUNSWAP_FACTORY = 'TUTGcsGDRScK1gsDPMELV2QZxeESWb1Gac';
const WTRX = 'TYsbWxNnyTgsZaTFaue9hqpxkU3Fkco94a';
const FEE_TIER = 10000;

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
    try {
      const tw = getTronWeb();
      if (!tw) { toast.error('Connect TronLink first'); return; }

      const factoryAbi: any[] = [
        { inputs: [{ name: 'tokenA', type: 'address' }, { name: 'tokenB', type: 'address' }, { name: 'fee', type: 'uint24' }], name: 'getPool', outputs: [{ name: '', type: 'address' }], stateMutability: 'view', type: 'function' },
      ];
      const factory: any = await tw.contract(factoryAbi, SUNSWAP_FACTORY);
      const tokenHex = tw.address.toHex(addr);
      const wtrxHex = tw.address.toHex(WTRX);
      const token0Hex = tokenHex.toLowerCase() < wtrxHex.toLowerCase() ? tokenHex : wtrxHex;
      const token1Hex = tokenHex.toLowerCase() < wtrxHex.toLowerCase() ? wtrxHex : tokenHex;

      const pool = await factory.getPool(token0Hex, token1Hex, FEE_TIER).call();
      const poolHex = (pool || '').replace('0x', '').toLowerCase();
      if (!poolHex || poolHex === '410000000000000000000000000000000000000000') {
        setNotFound(true);
        setLoading(false);
        return;
      }

      const poolAddr = String(tw.address.fromHex('0x' + poolHex));

      const poolAbi: any[] = [
        { inputs: [], name: 'slot0', outputs: [
          { name: 'sqrtPriceX96', type: 'uint160' },
          { name: 'tick', type: 'int24' },
          { name: 'observationIndex', type: 'uint16' },
          { name: 'observationCardinality', type: 'uint16' },
          { name: 'observationCardinalityNext', type: 'uint16' },
          { name: 'feeProtocol', type: 'uint8' },
          { name: 'unlocked', type: 'bool' },
        ], stateMutability: 'view', type: 'function' },
        { inputs: [], name: 'liquidity', outputs: [{ name: '', type: 'uint128' }], stateMutability: 'view', type: 'function' },
      ];
      const poolContract: any = await tw.contract(poolAbi, poolAddr);
      const slot0 = await poolContract.slot0().call();
      const liquidity = await poolContract.liquidity().call();
      const tick = Number(slot0[1]);
      const price = Math.pow(1.0001, tick);

      setPoolInfo({
        poolAddress: poolAddr,
        sqrtPriceX96: slot0[0].toString(),
        tick,
        price,
        liquidity: liquidity.toString(),
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to read pool');
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

      {notFound && (
        <p className="mt-3 text-sm text-amber">
          No SunSwap V3 pool found for this token on Nile.
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
