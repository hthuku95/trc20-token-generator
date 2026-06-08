import { create } from 'zustand';
import type { DeploymentResult, DeploymentStatus, TokenFormValues, TronNetwork } from '../types/tron';

interface DappState {
  walletAddress: string;
  network: TronNetwork;
  deploymentStatus: DeploymentStatus;
  currentToken: TokenFormValues | null;
  transactionHash: string;
  result: DeploymentResult | null;
  setWallet: (walletAddress: string, network: TronNetwork) => void;
  setNetwork: (network: TronNetwork) => void;
  setDeploymentStatus: (deploymentStatus: DeploymentStatus) => void;
  setCurrentToken: (currentToken: TokenFormValues | null) => void;
  setTransactionHash: (transactionHash: string) => void;
  setResult: (result: DeploymentResult | null) => void;
  resetDeployment: () => void;
}

export const useDappStore = create<DappState>((set) => ({
  walletAddress: '',
  network: 'unknown',
  deploymentStatus: 'idle',
  currentToken: null,
  transactionHash: '',
  result: null,
  setWallet: (walletAddress, network) => set({ walletAddress, network }),
  setNetwork: (network) => set({ network }),
  setDeploymentStatus: (deploymentStatus) => set({ deploymentStatus }),
  setCurrentToken: (currentToken) => set({ currentToken }),
  setTransactionHash: (transactionHash) => set({ transactionHash }),
  setResult: (result) => set({ result }),
  resetDeployment: () =>
    set({
      deploymentStatus: 'idle',
      currentToken: null,
      transactionHash: '',
      result: null,
    }),
}));
