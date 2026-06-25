import { useState, useEffect } from 'react';
import { Copy, ExternalLink, PlusCircle, Wallet, DollarSign, Link, RefreshCw, Droplets } from 'lucide-react';
import type { ReactElement } from 'react';
import toast from 'react-hot-toast';
import { addTokenToWallet, deployOracleContract, getFactoryAddress, getTronWeb, linkOracleToToken, readOraclePrice, setOraclePrice } from '../services/tronLink';
import { getFactoryContract } from '../services/tronLink';
import type { DeploymentResult } from '../types/tron';
import { getTronScanAddressUrl, getTronScanTxUrl } from '../utils/network';

const SUNSWAP_V3_FACTORY = 'TUTGcsGDRScK1gsDPMELV2QZxeESWb1Gac';
const WTRX = 'TYsbWxNnyTgsZaTFaue9hqpxkU3Fkco94a';
const FEE_TIER = 10000;

interface SuccessCardProps {
  result: DeploymentResult | null;
  onCreateAnother: () => void;
}

export function SuccessCard({ result, onCreateAnother }: SuccessCardProps) {
  const [oracleLocalAddress, setOracleLocalAddress] = useState('');
  const [linking, setLinking] = useState(false);
  const [deployingOracle, setDeployingOracle] = useState(false);
  const [currentPrice, setCurrentPrice] = useState<string | null>(null);
  const [priceInput, setPriceInput] = useState('');
  const [settingPrice, setSettingPrice] = useState(false);
  const [existingOracle, setExistingOracle] = useState('');
  const [poolAddress, setPoolAddress] = useState('');

  useEffect(() => {
    if (!result) return;
    (async () => {
      try {
        const tw = getTronWeb();
        if (!tw) return;
        const factoryAbi: any[] = [
          { inputs: [{ name: 'tokenA', type: 'address' }, { name: 'tokenB', type: 'address' }, { name: 'fee', type: 'uint24' }], name: 'getPool', outputs: [{ name: '', type: 'address' }], stateMutability: 'view', type: 'function' },
        ];
        const sunswapFactory: any = await tw.contract(factoryAbi, SUNSWAP_V3_FACTORY);
        const pool = await sunswapFactory.getPool(result.contractAddress, WTRX, FEE_TIER).call();
        const poolHex = (pool || '').replace('0x', '').toLowerCase();
        if (poolHex && poolHex !== '410000000000000000000000000000000000000000') {
          setPoolAddress(String(tw.address.fromHex('0x' + poolHex)));
        }
      } catch {}
    })();
  }, [result]);

  useEffect(() => {
    if (!result) return;
    (async () => {
      try {
        const factory = await getFactoryContract();
        const addr: string = await factory.tokenPriceOracles(result.contractAddress).call();
        if (addr && addr !== 'T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuWwb') {
          setExistingOracle(addr);
          const price = await readOraclePrice(addr);
          setCurrentPrice(price);
        }
      } catch {}
    })();
  }, [result]);

  if (!result) {
    return null;
  }

  async function handleLinkOracle() {
    if (!oracleLocalAddress.trim()) return;
    setLinking(true);
    try {
      await linkOracleToToken(result!.contractAddress, oracleLocalAddress.trim());
      setExistingOracle(oracleLocalAddress.trim());
      toast.success('Oracle linked to token');
    } catch {
      toast.error('Failed to link oracle');
    }
    setLinking(false);
  }

  async function handleDeployOracle() {
    setDeployingOracle(true);
    try {
      const address = await deployOracleContract();
      setOracleLocalAddress(address);
      toast.success('Oracle contract deployed');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to deploy oracle');
    }
    setDeployingOracle(false);
  }

  async function handleSetPrice() {
    if (!priceInput.trim() || !existingOracle) return;
    setSettingPrice(true);
    try {
      await setOraclePrice(existingOracle, priceInput.trim());
      setCurrentPrice(priceInput.trim());
      toast.success('Price updated');
    } catch {
      toast.error('Failed to set price');
    }
    setSettingPrice(false);
  }

  async function handleRefreshPrice() {
    if (!existingOracle) return;
    try {
      const price = await readOraclePrice(existingOracle);
      setCurrentPrice(price);
    } catch {
      toast.error('Failed to read price');
    }
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
        {result.anchorPrice ? <ResultRow label="Anchor Price" value={result.anchorPrice} /> : null}
        {poolAddress ? <ResultRow label="SunSwap V3 Pool" value={poolAddress} /> : null}
        <ResultRow label="Owner Address" value={result.ownerAddress} />
      </dl>

      <div className="mt-6 rounded-md border border-line/70 bg-ink/40 p-4">
        <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-200">
          <Droplets className="h-4 w-4" />
          SunSwap V3 Pool <span className="text-xs font-normal text-slate-500">(Nile)</span>
        </h3>
        {poolAddress ? (
          <>
            <p className="mb-2 text-xs text-slate-400">
              1% fee pool paired with WTRX at ~3.03 WTRX/token.
            </p>
            <div className="flex flex-wrap gap-2">
              <ActionButton onClick={() => copy(poolAddress, 'Pool address')} label="Copy Pool Address" icon={<Copy />} />
              <a
                href={getTronScanAddressUrl(result.network, poolAddress)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-9 items-center gap-1.5 rounded-md bg-slate-800 px-3 text-xs font-medium text-slate-300 transition hover:bg-slate-700"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                View on Tronscan
              </a>
            </div>
          </>
        ) : (
          <p className="text-xs text-slate-400">
            No pool created yet. To create one, run <code className="rounded bg-ink/60 px-1 font-mono text-mint">source .env &amp;&amp; node scripts/sunswap-v3-setup.js</code> after deployment with <code className="rounded bg-ink/60 px-1 font-mono">TOKEN_ADDRESS</code> set to this token.
          </p>
        )}
      </div>

      {!existingOracle && (
        <div className="mt-6 rounded-md border border-line/70 bg-ink/40 p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-200">
            <DollarSign className="h-4 w-4" />
            Price Oracle <span className="text-xs font-normal text-slate-500">(optional)</span>
          </h3>
          <p className="mb-3 text-xs text-slate-400">
            Deploy a TokenPriceOracle contract, then paste its address below to link it to your token.
          </p>
          <button
            type="button"
            onClick={handleDeployOracle}
            disabled={deployingOracle}
            className="mb-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-mint px-3 text-sm font-semibold text-ink transition hover:bg-mint/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {deployingOracle ? 'Deploying...' : 'Deploy Oracle Contract'}
          </button>
          <div className="mb-3 flex items-center gap-2">
            <span className="h-px flex-1 bg-line/50" />
            <span className="text-xs text-slate-500">or paste existing</span>
            <span className="h-px flex-1 bg-line/50" />
          </div>
          <div className="flex gap-2">
            <input
              value={oracleLocalAddress}
              onChange={(e) => setOracleLocalAddress(e.target.value)}
              placeholder="Oracle contract address"
              className="h-10 flex-1 rounded-md border border-line bg-ink/60 px-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-mint"
            />
            <button
              type="button"
              onClick={handleLinkOracle}
              disabled={linking || !oracleLocalAddress.trim()}
              className="inline-flex h-10 items-center gap-2 rounded-md border border-line px-3 text-sm font-semibold text-slate-100 transition hover:border-mint disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Link className="h-4 w-4" />
              {linking ? 'Linking...' : 'Link'}
            </button>
          </div>
        </div>
      )}

      {existingOracle && (
        <div className="mt-6 rounded-md border border-mint/30 bg-mint/5 p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-200">
            <DollarSign className="h-4 w-4" />
            Price Oracle
          </h3>
          <div className="mb-3 text-xs text-slate-400 break-all">
            Oracle: {existingOracle}
          </div>
          {currentPrice !== null && (
            <div className="mb-3 flex items-center gap-2 text-sm">
              <span className="text-slate-400">Current Price:</span>
              <span className="font-semibold text-white">
                {BigInt(currentPrice) > BigInt(10**15)
                  ? (Number(currentPrice) / 10**18).toFixed(6)
                  : currentPrice}
              </span>
              <button
                type="button"
                onClick={handleRefreshPrice}
                className="text-slate-400 hover:text-white"
              >
                <RefreshCw className="h-3 w-3" />
              </button>
            </div>
          )}
          <div className="flex gap-2">
            <input
              value={priceInput}
              onChange={(e) => setPriceInput(e.target.value)}
              placeholder="Price in USD (e.g. 0.01)"
              className="h-10 flex-1 rounded-md border border-line bg-ink/60 px-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-mint"
            />
            <button
              type="button"
              onClick={handleSetPrice}
              disabled={settingPrice || !priceInput.trim()}
              className="inline-flex h-10 items-center gap-2 rounded-md bg-mint px-3 text-sm font-semibold text-ink transition hover:bg-mint/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {settingPrice ? 'Setting...' : 'Set Price'}
            </button>
          </div>

          <div className="mt-4 rounded-md border border-line/50 bg-ink/40 p-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Auto price updates</span>
              <span className="flex items-center gap-1.5 text-green-400">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-400" />
                Active via GitHub Actions (every 15 min)
              </span>
            </div>
            <p className="mt-1.5 text-xs text-slate-500">
              Price fetched from CoinGecko and pushed to the oracle automatically.
              Oracle wallet funded with 100 TRX. No action needed.
            </p>
          </div>
        </div>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        <ActionButton onClick={() => copy(result.contractAddress, 'Address')} label="Copy Address" icon={<Copy />} />
        <ActionButton onClick={() => copy(result.transactionHash, 'Transaction hash')} label="Copy TX Hash" icon={<Copy />} />
        <ActionButton
          onClick={async () => {
            try {
              await addTokenToWallet('trc20', result.contractAddress, result.symbol, result.decimals, result.iconUrl);
              toast.success('Token added to TronLink');
            } catch {
              toast.error('Could not add to TronLink. Copy the address and add it manually.');
            }
          }}
          label="Add to TronLink"
          icon={<Wallet />}
        />
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

async function copy(value: string, label: string) {
  await navigator.clipboard.writeText(value);
  toast.success(`${label} copied`);
}
