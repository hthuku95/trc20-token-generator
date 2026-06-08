export const tokenFactoryAbi = [
  {
    inputs: [
      { internalType: 'string', name: 'name', type: 'string' },
      { internalType: 'string', name: 'symbol', type: 'string' },
      { internalType: 'uint256', name: 'supply', type: 'uint256' },
      { internalType: 'uint8', name: 'decimals', type: 'uint8' },
      { internalType: 'string', name: 'iconUrl', type: 'string' },
    ],
    name: 'createToken',
    outputs: [{ internalType: 'address', name: 'tokenAddress', type: 'address' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'creator', type: 'address' },
      { indexed: true, internalType: 'address', name: 'tokenAddress', type: 'address' },
      { indexed: false, internalType: 'string', name: 'name', type: 'string' },
      { indexed: false, internalType: 'string', name: 'symbol', type: 'string' },
      { indexed: false, internalType: 'string', name: 'iconUrl', type: 'string' },
    ],
    name: 'TokenCreated',
    type: 'event',
  },
] as const;
