import { useMemo, useState } from 'react';
import { ArrowRight, Coins, RotateCcw } from 'lucide-react';
import type { TokenFormValues } from '../types/tron';
import { hasFormErrors, validateTokenForm } from '../utils/tokenForm';

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
};

export function TokenForm({ disabled, onReview }: TokenFormProps) {
  const [values, setValues] = useState<TokenFormValues>(initialValues);
  const [submitted, setSubmitted] = useState(false);
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
    });
  }

  function resetForm() {
    setValues(initialValues);
    setSubmitted(false);
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
