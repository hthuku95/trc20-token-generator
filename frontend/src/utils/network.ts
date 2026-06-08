import type { TronNetwork } from '../types/tron';

const NILE_HOST_MARKERS = ['nile', 'nileex'];
const MAINNET_HOST_MARKERS = ['trongrid.io'];

export function detectNetwork(host?: string): TronNetwork {
  if (!host) {
    return 'unknown';
  }

  const normalizedHost = host.toLowerCase();

  if (NILE_HOST_MARKERS.some((marker) => normalizedHost.includes(marker))) {
    return 'nile';
  }

  if (MAINNET_HOST_MARKERS.some((marker) => normalizedHost.includes(marker))) {
    return 'mainnet';
  }

  return 'unsupported';
}

export function getTronScanTxUrl(network: TronNetwork, transactionHash: string) {
  const host = network === 'nile' ? 'https://nile.tronscan.org' : 'https://tronscan.org';
  return `${host}/#/transaction/${transactionHash}`;
}

export function getTronScanAddressUrl(network: TronNetwork, address: string) {
  const host = network === 'nile' ? 'https://nile.tronscan.org' : 'https://tronscan.org';
  return `${host}/#/contract/${address}`;
}

export function getNetworkLabel(network: TronNetwork) {
  const labels: Record<TronNetwork, string> = {
    mainnet: 'Mainnet',
    nile: 'Nile Testnet',
    unsupported: 'Unsupported',
    unknown: 'Unknown',
  };

  return labels[network];
}
