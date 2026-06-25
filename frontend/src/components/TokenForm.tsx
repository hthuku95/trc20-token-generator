import { useMemo, useRef, useState } from 'react';
import { ArrowRight, Coins, RotateCcw, Search, X } from 'lucide-react';
import toast from 'react-hot-toast';
import type { TokenFormValues } from '../types/tron';
import { hasFormErrors, validateTokenForm } from '../utils/tokenForm';
import { findVanitySalt, getFactoryAddress, getWalletSnapshot } from '../services/tronLink';

interface TokenFormProps {
  disabled: boolean;
  onReview: (values: TokenFormValues) => void;
}

const initialValues: TokenFormValues = {
  name: '',
  symbol: '',
  supply: '1000000',
  decimals: 6,
  iconUrl: '',
  anchorPrice: '',
  vanityPattern: '',
  vanitySalt: '',
  vanityAddress: '',
};

export function TokenForm({ disabled, onReview }: TokenFormProps) {
  const [values, setValues] = useState<TokenFormValues>(initialValues);
  const [submitted, setSubmitted] = useState(false);
  const [vanityEnabled, setVanityEnabled] = useState(false);
  const [searching, setSearching] = useState(false);
  const [progress, setProgress] = useState({ checked: 0, speed: 0, elapsed: 0, found: false, address: '', salt: '' });
  const abortRef = useRef<AbortController | null>(null);
  const errors = useMemo(() => validateTokenForm(values), [values]);

  function updateValue<Key extends keyof TokenFormValues>(key: Key, value: TokenFormValues[Key]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);

    if (hasFormErrors(errors)) {
      return;
    }

    onReview({
      name: values.name.trim(),
      symbol: values.symbol.trim().toUpperCase(),
      supply: values.supply.trim(),
      decimals: values.decimals,
      iconUrl: values.iconUrl.trim(),
      anchorPrice: values.anchorPrice.trim(),
      vanityPattern: values.vanityPattern,
      vanitySalt: values.vanitySalt,
      vanityAddress: values.vanityAddress,
    });
  }

  function resetForm() {
    setValues(initialValues);
    setSubmitted(false);
    setVanityEnabled(false);
    setSearching(false);
    setProgress({ checked: 0, speed: 0, elapsed: 0, found: false, address: '', salt: '' });
  }

  async function handleVanitySearch() {
    const pattern = values.vanityPattern.trim();
    if (!pattern) return;

    for (const ch of pattern) {
      if (!/^[a-zA-Z0-9]$/.test(ch)) {
        toast.error(`Character "${ch}" not allowed. Use letters A-Z, a-z and digits 0-9.`);
        return;
      }
      if (/^[0OIl]$/.test(ch)) {
        toast.error(`Character "${ch}" can never appear in a TRON address (Base58 excludes 0, O, I, l).`);
        return;
      }
    }

    if (pattern.length >= 5) {
      toast('Searching for 5+ characters may take hours. Consider 3-4 characters.', { icon: '⏳' });
    }

    const snapshot = getWalletSnapshot();
    const factoryAddress = getFactoryAddress();

    if (!snapshot.walletAddress) {
      toast.error('Connect TronLink first');
      return;
    }

    if (!factoryAddress) {
      toast.error('Factory address not configured');
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    setSearching(true);
    setProgress({ checked: 0, speed: 0, elapsed: 0, found: false, address: '', salt: '' });
    updateValue('vanitySalt', '');
    updateValue('vanityAddress', '');

    try {
      const result = await findVanitySalt(
        { ...values, vanityPattern: values.vanityPattern },
        factoryAddress,
        snapshot.walletAddress,
        setProgress,
        controller.signal,
      );

      if (result) {
        updateValue('vanitySalt', result.salt);
        updateValue('vanityAddress', result.address);
      }
    } catch (e) {
      if (e instanceof Error && e.message !== 'aborted') {
        toast.error(e.message);
      }
    } finally {
      setSearching(false);
      abortRef.current = null;
    }
  }

  function cancelSearch() {
    abortRef.current?.abort();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-300">Token Name</span>
          <input
            value={values.name}
            onChange={(event) => updateValue('name', event.target.value)}
            placeholder="My Token"
            disabled={disabled}
            className="h-12 w-full rounded-md border border-line bg-ink/60 px-4 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-mint"
          />
          {submitted && errors.name ? <span className="text-sm text-coral">{errors.name}</span> : null}
        </label>

        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-300">Symbol</span>
          <input
            value={values.symbol}
            onChange={(event) => updateValue('symbol', event.target.value.toUpperCase())}
            placeholder="MTK"
            disabled={disabled}
            className="h-12 w-full rounded-md border border-line bg-ink/60 px-4 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-mint"
          />
          {submitted && errors.symbol ? <span className="text-sm text-coral">{errors.symbol}</span> : null}
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-[1fr_180px]">
        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-300">Initial Supply</span>
          <input
            value={values.supply}
            onChange={(event) => updateValue('supply', event.target.value)}
            inputMode="numeric"
            placeholder="1000000"
            disabled={disabled}
            className="h-12 w-full rounded-md border border-line bg-ink/60 px-4 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-mint"
          />
          {submitted && errors.supply ? <span className="text-sm text-coral">{errors.supply}</span> : null}
        </label>

        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-300">Decimals</span>
          <input
            value={values.decimals}
            onChange={(event) => updateValue('decimals', Number(event.target.value))}
            type="number"
            min={0}
            max={18}
            disabled={disabled}
            className="h-12 w-full rounded-md border border-line bg-ink/60 px-4 text-slate-100 outline-none transition focus:border-mint"
          />
          {submitted && errors.decimals ? (
            <span className="text-sm text-coral">{errors.decimals}</span>
          ) : null}
        </label>
      </div>

      <label className="space-y-2">
        <span className="text-sm font-medium text-slate-300">Token Icon URL <span className="text-slate-500">(optional)</span></span>
        <input
          value={values.iconUrl}
          onChange={(event) => updateValue('iconUrl', event.target.value)}
          placeholder="https://i.imgur.com/..."
          disabled={disabled}
          className="h-12 w-full rounded-md border border-line bg-ink/60 px-4 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-mint"
        />
        {submitted && errors.iconUrl ? <span className="text-sm text-coral">{errors.iconUrl}</span> : null}
      </label>

      <label className="space-y-2">
        <span className="text-sm font-medium text-slate-300">Anchor Price <span className="text-slate-500">(optional)</span></span>
        <input
          value={values.anchorPrice}
          onChange={(event) => updateValue('anchorPrice', event.target.value)}
          placeholder="0.01"
          disabled={disabled}
          className="h-12 w-full rounded-md border border-line bg-ink/60 px-4 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-mint"
        />
        {submitted && errors.anchorPrice ? <span className="text-sm text-coral">{errors.anchorPrice}</span> : null}
      </label>

      <div className="border-t border-line pt-4">
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={vanityEnabled}
            onChange={() => setVanityEnabled(!vanityEnabled)}
            disabled={disabled}
            className="h-5 w-5 rounded border-line bg-ink/60 text-mint focus:ring-mint"
          />
          <span className="text-sm font-medium text-slate-300">Vanity Address <span className="text-slate-500">(CREATE2)</span></span>
        </label>

        {vanityEnabled && (
          <div className="mt-4 space-y-4">
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-300">
                Vanity Pattern <span className="text-slate-500">(starts with T)</span>
              </span>
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold text-slate-400">T</span>
                <input
                  value={values.vanityPattern}
                  onChange={(event) => updateValue('vanityPattern', event.target.value)}
                  placeholder="R3D"
                  disabled={disabled || searching}
                  className="h-12 w-full rounded-md border border-line bg-ink/60 px-4 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-mint"
                />
              </div>
              <p className="text-xs text-slate-500">
                3&ndash;4 chars recommended (seconds to minutes). 5+ chars can take hours.
                Avoid characters 0, O, I, l.
              </p>
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-300">
                Salt (optional) <span className="text-slate-500">— paste a previously found salt to skip search</span>
              </span>
              <input
                value={values.vanitySalt}
                onChange={(event) => updateValue('vanitySalt', event.target.value)}
                placeholder="0x1b923986a863eaac63313390b9d42af..."
                disabled={disabled || searching}
                className="h-12 w-full rounded-md border border-line bg-ink/60 px-4 font-mono text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-mint"
              />
              {values.vanitySalt && !/^0x[0-9a-fA-F]{64}$/.test(values.vanitySalt) && (
                <p className="text-xs text-coral">Must be a 64-char hex string starting with 0x</p>
              )}
            </label>

            {values.vanitySalt && (
              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-300">
                  Predicted Address <span className="text-slate-500">— enter the expected address</span>
                </span>
                <input
                  value={values.vanityAddress}
                  onChange={(event) => updateValue('vanityAddress', event.target.value)}
                  placeholder="TR7NznPgGHYLJtQKKCq321SYJxJXLwuj6t"
                  disabled={disabled}
                  className="h-12 w-full rounded-md border border-line bg-ink/60 px-4 font-mono text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-mint"
                />
              </label>
            )}

            <div className="flex gap-2">
              {!searching ? (
                <button
                  type="button"
                  onClick={handleVanitySearch}
                  disabled={!values.vanityPattern || !!values.vanitySalt || disabled}
                  className="inline-flex h-10 items-center gap-2 rounded-md border border-line px-3 text-sm font-semibold text-slate-100 transition hover:border-mint disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Search className="h-4 w-4" />
                  Find Vanity Address
                </button>
              ) : (
                <button
                  type="button"
                  onClick={cancelSearch}
                  className="inline-flex h-10 items-center gap-2 rounded-md border border-coral/50 px-3 text-sm font-semibold text-coral transition hover:border-coral"
                >
                  <X className="h-4 w-4" />
                  Cancel
                </button>
              )}
            </div>

            {searching && (
              <div className="rounded-md border border-line/70 bg-ink/40 p-3 text-sm text-slate-300">
                <p>Checked: {progress.checked.toLocaleString()}</p>
                <p>Speed: {progress.speed.toLocaleString()} hashes/s</p>
                <p>Elapsed: {progress.elapsed.toFixed(1)}s</p>
              </div>
            )}

            {values.vanityAddress && (
              <div className="rounded-md border border-mint/40 bg-mint/10 p-3 text-sm">
                <p className="font-semibold text-white">Vanity Address Found</p>
                <p className="mt-1 break-words text-slate-200">{values.vanityAddress}</p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={disabled}
          className="inline-flex h-11 items-center gap-2 rounded-md bg-mint px-4 text-sm font-semibold text-ink transition hover:bg-mint/90 disabled:cursor-not-allowed disabled:opacity-50"
          title="Review token settings"
        >
          <Coins className="h-4 w-4" />
          Review Token
          <ArrowRight className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={resetForm}
          disabled={disabled}
          className="inline-flex h-11 items-center gap-2 rounded-md border border-line px-4 text-sm font-semibold text-slate-200 transition hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-50"
          title="Reset token form"
        >
          <RotateCcw className="h-4 w-4" />
          Reset
        </button>
      </div>
    </form>
  );
}
