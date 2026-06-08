import type { TokenFormValues } from '../types/tron';

export function validateTokenForm(values: TokenFormValues) {
  const errors: Partial<Record<keyof TokenFormValues, string>> = {};
  const trimmedName = values.name.trim();
  const trimmedSymbol = values.symbol.trim();
  const trimmedSupply = values.supply.trim();

  if (trimmedName.length < 3 || trimmedName.length > 50) {
    errors.name = 'Use 3 to 50 characters.';
  }

  if (trimmedSymbol.length < 2 || trimmedSymbol.length > 10) {
    errors.symbol = 'Use 2 to 10 characters.';
  }

  if (!/^[1-9]\d*$/.test(trimmedSupply)) {
    errors.supply = 'Enter a positive whole number.';
  }

  if (!Number.isInteger(values.decimals) || values.decimals < 0 || values.decimals > 18) {
if (values.iconUrl && !/^https?:\/\/.+/.test(values.iconUrl)) {    errors.iconUrl = 'Enter a valid URL (http/https) or leave empty.';  }
    errors.decimals = 'Choose a value from 0 to 18.';
  }

  return errors;
}

export function hasFormErrors(errors: Partial<Record<keyof TokenFormValues, string>>) {
  return Object.keys(errors).length > 0;
}
