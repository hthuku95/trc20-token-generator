export type TronNetwork = 'mainnet' | 'nile' | 'unsupported' | 'unknown';

export type DeploymentStatus =
  | 'idle'
  | 'awaiting_signature'
  | 'broadcasting'
  | 'confirming'
  | 'success'
  | 'error';

export interface TokenFormValues {
  name: string;
  symbol: string;
  supply: string;
  decimals: number;
  iconUrl: string;
}

export interface DeploymentResult extends TokenFormValues {
  contractAddress: string;
  transactionHash: string;
  ownerAddress: string;
  network: TronNetwork;
}

export interface TronContractCall {
  send: (options?: Record<string, unknown>) => Promise<string>;
}

export interface TokenFactoryContract {
  createToken: (
    name: string,
    symbol: string,
    supply: string | number,
    decimals: number,
    iconUrl: string,
  ) => TronContractCall;
}

export interface TronWebLike {
  defaultAddress?: {
    base58?: string;
  };
  fullNode?: {
    host?: string;
  };
  contract: (abi: unknown[], address: string) => Promise<TokenFactoryContract>;
  trx: {
    getTransactionInfo: (transactionHash: string) => Promise<Record<string, unknown>>;
  };
}

declare global {
  interface Window {
    tronLink?: {
      request?: (args: { method: string }) => Promise<{ code: number; message?: string }>;
    };
    tronWeb?: TronWebLike;
  }
}
