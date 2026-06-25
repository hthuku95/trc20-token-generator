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
  anchorPrice: string;
  vanityPattern: string;
  vanitySalt: string;
  vanityAddress: string;
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

export interface TronViewCall<T> {
  call: () => Promise<T>;
}

export interface OracleContract {
  oracleAddress: () => TronViewCall<string>;
  tokenValue: () => TronViewCall<string>;
  setTokenValue: (value: string | number) => TronContractCall;
}

export interface TokenFactoryContract {
  createToken: (
    name: string,
    symbol: string,
    supply: string | number,
    decimals: number,
    iconUrl: string,
    anchorPrice: string,
  ) => TronContractCall;
  createTokenVanity: (
    name: string,
    symbol: string,
    supply: string | number,
    decimals: number,
    iconUrl: string,
    anchorPrice: string,
    salt: string,
  ) => TronContractCall;
  predictTokenAddress: (
    name: string,
    symbol: string,
    supply: string | number,
    decimals: number,
    iconUrl: string,
    owner: string,
    salt: string,
  ) => TronViewCall<string>;
  getInitCodeHash: (
    name: string,
    symbol: string,
    supply: string | number,
    decimals: number,
    iconUrl: string,
    owner: string,
  ) => TronViewCall<string>;
  setTokenPriceOracle: (
    token: string,
    oracle: string,
  ) => TronContractCall;
  tokenPriceOracles: (token: string) => TronViewCall<string>;
  anchorPrices: (token: string) => TronViewCall<string>;
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
  request: (args: {
    method: string;
    params: Record<string, unknown>;
  }) => Promise<unknown>;
  address: {
    toHex: (address: string) => string;
    fromHex: (address: string) => string;
  };
  sha3: (data: string) => string;
}

declare global {
  interface Window {
    tronLink?: {
      request?: (args: { method: string; params?: Record<string, unknown> }) => Promise<{ code: number; message?: string }>;
    };
    tronWeb?: TronWebLike;
  }
}
