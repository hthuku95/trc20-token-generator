import { tokenFactoryAbi } from '../contracts/tokenFactoryAbi';
import type { DeploymentResult, DeploymentStatus, TokenFormValues, TronWebLike } from '../types/tron';
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
    const response = await window.tronLink.request({ method: 'tron_requestAccounts' });

    if (response.code !== 200) {
      throw new Error(response.message ?? 'Wallet connection rejected.');
    }
  }

  const snapshot = getWalletSnapshot();

  if (!snapshot.walletAddress) {
    throw new Error('Connect Wallet.');
  }

  return snapshot;
}

interface DeployTokenOptions {
  onStatusChange?: (status: DeploymentStatus) => void;
  onTransactionHash?: (transactionHash: string) => void;
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

  if (snapshot.network !== 'mainnet' && snapshot.network !== 'nile') {
    throw new Error('Unsupported network. Use TRON Mainnet or Nile Testnet.');
  }

  if (!FACTORY_ADDRESS) {
    throw new Error('Missing VITE_FACTORY_ADDRESS.');
  }

  const factory = await tronWeb.contract([...tokenFactoryAbi], FACTORY_ADDRESS);
  options.onStatusChange?.('awaiting_signature');

  const transactionHash = await factory
    .createToken(values.name.trim(), values.symbol.trim().toUpperCase(), values.supply.trim(), values.decimals, values.iconUrl)
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
