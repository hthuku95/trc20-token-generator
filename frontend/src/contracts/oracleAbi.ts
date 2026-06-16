export const oracleAbi = [
  {
    inputs: [{ internalType: 'address', name: '_oracleAddress', type: 'address' }],
    stateMutability: 'nonpayable',
    type: 'constructor',
  },
  {
    inputs: [],
    name: 'oracleAddress',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'tokenValue',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: '_newValue', type: 'uint256' }],
    name: 'setTokenValue',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;
