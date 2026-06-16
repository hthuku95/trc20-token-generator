import TronWeb from 'tronweb';
import { tokenFactoryAbi } from '../contracts/tokenFactoryAbi';
import { oracleAbi } from '../contracts/oracleAbi';
import type { DeploymentResult, DeploymentStatus, TokenFormValues, OracleContract, TronWebLike } from '../types/tron';
import { detectNetwork } from '../utils/network';

const FACTORY_ADDRESS = import.meta.env.VITE_FACTORY_ADDRESS ?? '';
const CONFIRMATION_ATTEMPTS = 20;
const CONFIRMATION_DELAY_MS = 3000;

function wait(milliseconds: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });
}

export function getTronWeb(): TronWebLike | null {
  return window.tronWeb ?? null;
}

export function getFactoryAddress() {
  return FACTORY_ADDRESS;
}

export function getWalletSnapshot() {
  const tronWeb = getTronWeb();
  const walletAddress = tronWeb?.defaultAddress?.base58 ?? '';
  const network = detectNetwork(tronWeb?.fullNode?.host);

  return { walletAddress, network };
}

export async function connectTronLink() {
  if (!window.tronLink || !window.tronWeb) {
    throw new Error('Please install TronLink Wallet.');
  }

  if (window.tronLink.request) {
    try {
      const response = await window.tronLink.request({ method: 'tron_requestAccounts' });

      if (response && typeof response === 'object' && response.code !== 200) {
        throw new Error(response.message ?? 'Wallet connection rejected.');
      }
    } catch (error) {
      if (error instanceof Error && error.message === 'Wallet connection rejected.') {
        throw error;
      }
    }
  }

  const snapshot = getWalletSnapshot();

  if (!snapshot.walletAddress) {
    throw new Error('No wallet address found. Unlock TronLink and switch to Nile Testnet.');
  }

  return snapshot;
}

export async function addTokenToWallet(
  type: 'trc20',
  address: string,
  symbol?: string,
  decimals?: number,
  image?: string,
) {
  const tronWeb = getTronWeb();

  if (!tronWeb || typeof tronWeb.request !== 'function') {
    const tronLink = window.tronLink;
    if (tronLink?.request) {
      await tronLink.request({
        method: 'wallet_watchAsset',
        params: { type, options: { address, symbol, decimals, image } },
      });
      return;
    }
    throw new Error('TronLink not available.');
  }

  await tronWeb.request({
    method: 'wallet_watchAsset',
    params: { type, options: { address, symbol, decimals, image } },
  });
}

export interface VanitySearchProgress {
  checked: number;
  speed: number;
  elapsed: number;
  found: boolean;
  address: string;
  salt: string;
}

export async function findVanitySalt(
  values: TokenFormValues,
  factoryAddress: string,
  walletAddress: string,
  onProgress: (progress: VanitySearchProgress) => void,
  signal?: AbortSignal,
): Promise<{ salt: string; address: string } | null> {
  const tronWeb = getTronWeb();
  if (!tronWeb) throw new Error('TronLink not connected.');

  const factory = await tronWeb.contract([...tokenFactoryAbi], factoryAddress);
  const initCodeHash: string = await factory.getInitCodeHash(
    values.name.trim(), values.symbol.trim().toUpperCase(), values.supply.trim(), values.decimals, values.iconUrl, walletAddress,
  ).call();
  const initCodeHashClean = initCodeHash.replace('0x', '');

  const factoryHex = tronWeb.address.toHex(factoryAddress);
  const factoryRaw = factoryHex.replace('0x41', '').toLowerCase();

  const pattern = values.vanityPattern.trim().toUpperCase();
  if (!pattern) throw new Error('Enter a vanity pattern.');

  const startSalt = BigInt('0x' + crypto.randomUUID().replace(/-/g, '').slice(0, 16)) << BigInt(64);
  const startTime = Date.now();
  let checked = 0;

  for (let i = BigInt(0); ; i++) {
    const salt = startSalt + i;
    const saltHex = salt.toString(16).padStart(64, '0');
    const preimage = '0x41' + factoryRaw + saltHex + initCodeHashClean;
    const fullHash: string = (TronWeb as any).sha3(preimage);
    const rawAddr = fullHash.slice(-40);
    const tronHex = '41' + rawAddr;
    const base58 = tronWeb.address.fromHex('0x' + tronHex);

    checked++;
    if (checked % 1000 === 0) {
      const elapsed = (Date.now() - startTime) / 1000;
      const speed = Math.floor(checked / elapsed);
      onProgress({ checked, speed, elapsed, found: false, address: base58, salt: '0x' + saltHex });

      if (signal?.aborted) return null;
      await new Promise(r => setTimeout(r, 0));
    }

    if (base58.slice(1).startsWith(pattern)) {
      onProgress({ checked, speed: Math.floor(checked / ((Date.now() - startTime) / 1000)), elapsed: (Date.now() - startTime) / 1000, found: true, address: base58, salt: '0x' + saltHex });
      return { salt: '0x' + saltHex, address: base58 };
    }
  }
}

interface DeployTokenOptions {
  onStatusChange?: (status: DeploymentStatus) => void;
  onTransactionHash?: (transactionHash: string) => void;
}

export async function deployTokenVanity(
  values: TokenFormValues,
  options: DeployTokenOptions = {},
): Promise<DeploymentResult> {
  const tronWeb = getTronWeb();
  const snapshot = getWalletSnapshot();

  if (!tronWeb || !snapshot.walletAddress) {
    throw new Error('Connect Wallet.');
  }

  if (snapshot.network !== 'nile') {
    throw new Error('Unsupported network. Switch TronLink to Nile Testnet.');
  }

  if (!FACTORY_ADDRESS) {
    throw new Error('Missing VITE_FACTORY_ADDRESS.');
  }

  if (!values.vanitySalt) {
    throw new Error('No vanity salt found. Search for an address first.');
  }

  const factory = await tronWeb.contract([...tokenFactoryAbi], FACTORY_ADDRESS);
  options.onStatusChange?.('awaiting_signature');

  const transactionHash = await factory
    .createTokenVanity(values.name.trim(), values.symbol.trim().toUpperCase(), values.supply.trim(), values.decimals, values.iconUrl, values.anchorPrice.trim(), values.vanitySalt)
    .send();

  options.onTransactionHash?.(transactionHash);
  options.onStatusChange?.('broadcasting');
  options.onStatusChange?.('confirming');

  const receipt = await waitForTransactionConfirmation(tronWeb, transactionHash);
  const contractAddress = readTokenAddressFromReceipt(receipt);

  return {
    ...values,
    name: values.name.trim(),
    symbol: values.symbol.trim().toUpperCase(),
    contractAddress,
    transactionHash,
    ownerAddress: snapshot.walletAddress,
    network: snapshot.network,
  };
}

export async function deployToken(
  values: TokenFormValues,
  options: DeployTokenOptions = {},
): Promise<DeploymentResult> {
  const tronWeb = getTronWeb();
  const snapshot = getWalletSnapshot();

  if (!tronWeb || !snapshot.walletAddress) {
    throw new Error('Connect Wallet.');
  }

  if (snapshot.network !== 'nile') {
    throw new Error('Unsupported network. Switch TronLink to Nile Testnet.');
  }

  if (!FACTORY_ADDRESS) {
    throw new Error('Missing VITE_FACTORY_ADDRESS.');
  }

  const factory = await tronWeb.contract([...tokenFactoryAbi], FACTORY_ADDRESS);
  options.onStatusChange?.('awaiting_signature');

  const transactionHash = await factory
    .createToken(values.name.trim(), values.symbol.trim().toUpperCase(), values.supply.trim(), values.decimals, values.iconUrl, values.anchorPrice.trim())
    .send();

  options.onTransactionHash?.(transactionHash);
  options.onStatusChange?.('broadcasting');
  options.onStatusChange?.('confirming');

  const receipt = await waitForTransactionConfirmation(tronWeb, transactionHash);
  const contractAddress = readTokenAddressFromReceipt(receipt);

  return {
    ...values,
    name: values.name.trim(),
    symbol: values.symbol.trim().toUpperCase(),
    contractAddress,
    transactionHash,
    ownerAddress: snapshot.walletAddress,
    network: snapshot.network,
  };
}

export async function waitForTransactionConfirmation(tronWeb: TronWebLike, transactionHash: string) {
  for (let attempt = 0; attempt < CONFIRMATION_ATTEMPTS; attempt += 1) {
    const receipt = await tronWeb.trx.getTransactionInfo(transactionHash);

    if (receipt && Object.keys(receipt).length > 0) {
      return receipt;
    }

    await wait(CONFIRMATION_DELAY_MS);
  }

  throw new Error('Deployment confirmation timed out.');
}

function readTokenAddressFromReceipt(receipt: Record<string, unknown>) {
  const contractResult = receipt.contractResult;

  if (Array.isArray(contractResult) && typeof contractResult[0] === 'string') {
    return `41${contractResult[0].slice(-40)}`;
  }

  if (typeof receipt.contract_address === 'string') {
    return receipt.contract_address;
  }

  return 'Check transaction on TronScan';
}

export async function getFactoryContract() {
  const tronWeb = getTronWeb();
  if (!tronWeb) throw new Error('TronLink not connected.');
  return tronWeb.contract([...tokenFactoryAbi], FACTORY_ADDRESS) as unknown as import('../types/tron').TokenFactoryContract;
}

export async function getOracleContract(address: string): Promise<OracleContract> {
  const tronWeb = getTronWeb();
  if (!tronWeb) throw new Error('TronLink not connected.');
  return tronWeb.contract([...oracleAbi], address) as unknown as OracleContract;
}

export async function linkOracleToToken(tokenAddress: string, oracleAddress: string) {
  const tronWeb = getTronWeb();
  if (!tronWeb) throw new Error('TronLink not connected.');
  const factory = await tronWeb.contract([...tokenFactoryAbi], FACTORY_ADDRESS);
  await factory.setTokenPriceOracle(tokenAddress, oracleAddress).send();
}

export async function readOraclePrice(oracleAddress: string): Promise<string> {
  const oracle = await getOracleContract(oracleAddress);
  const value: string = await oracle.tokenValue().call();
  return value;
}

export async function setOraclePrice(oracleAddress: string, price: string) {
  const oracle = await getOracleContract(oracleAddress);
  await oracle.setTokenValue(price).send();
}
