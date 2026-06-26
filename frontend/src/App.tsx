import { useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { ShieldCheck, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { DeploymentProgress } from './components/DeploymentProgress';
import { PoolPriceChecker } from './components/PoolPriceChecker';
import { ReviewPanel } from './components/ReviewPanel';
import { SuccessCard } from './components/SuccessCard';
import { TokenForm } from './components/TokenForm';
import { WalletConnectButton } from './components/WalletConnectButton';
import { deployToken, deployTokenVanity, getFactoryAddress, getWalletSnapshot } from './services/tronLink';
import { useDappStore } from './store/useDappStore';
import type { TokenFormValues } from './types/tron';

function App() {
  const walletAddress = useDappStore((state) => state.walletAddress);
  const network = useDappStore((state) => state.network);
  const deploymentStatus = useDappStore((state) => state.deploymentStatus);
  const currentToken = useDappStore((state) => state.currentToken);
  const result = useDappStore((state) => state.result);
  const setWallet = useDappStore((state) => state.setWallet);
  const setNetwork = useDappStore((state) => state.setNetwork);
  const setCurrentToken = useDappStore((state) => state.setCurrentToken);
  const setDeploymentStatus = useDappStore((state) => state.setDeploymentStatus);
  const setTransactionHash = useDappStore((state) => state.setTransactionHash);
  const setResult = useDappStore((state) => state.setResult);
  const resetDeployment = useDappStore((state) => state.resetDeployment);
  const factoryAddress = getFactoryAddress();

  const deployment = useMutation({
    mutationFn: (values: TokenFormValues) =>
      (values.vanitySalt ? deployTokenVanity : deployToken)(values, {
        onStatusChange: setDeploymentStatus,
        onTransactionHash: setTransactionHash,
      }),
    onSuccess: (deploymentResult) => {
      setDeploymentStatus("success");
      setResult(deploymentResult);
      toast.success("Token deployed");
    },
    onError: (error) => {
      setDeploymentStatus("error");
      toast.error(error instanceof Error ? error.message : "Deployment failed");
    },
  });

  useEffect(() => {
    const snapshot = getWalletSnapshot();

    if (snapshot.walletAddress) {
      setWallet(snapshot.walletAddress, snapshot.network);
    } else {
      setNetwork(snapshot.network);
    }
  }, [setNetwork, setWallet]);

  function handleReview(values: TokenFormValues) {
    setCurrentToken(values);
    setDeploymentStatus('idle');
    setResult(null);
  }

  function handleDeploy() {
    if (!currentToken) {
      toast.error('Review token details first');
      return;
    }

    deployment.mutate(currentToken);
  }

  function handleCreateAnother() {
    resetDeployment();
    deployment.reset();
  }

  const deploymentActive =
    deploymentStatus === 'awaiting_signature' ||
    deploymentStatus === 'broadcasting' ||
    deploymentStatus === 'confirming';

  return (
    <main className="min-h-screen px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <header className="flex flex-col gap-4 border-b border-line pb-5 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-line bg-white/5 px-3 py-1 text-sm text-slate-300">
              <ShieldCheck className="h-4 w-4 text-mint" />
              Frontend-only TRON dApp
            </div>
            <h1 className="text-3xl font-semibold tracking-normal text-white sm:text-4xl">
              TRC-20 Token Generator
            </h1>
            <p className="mt-2 max-w-2xl text-slate-300">
              Configure a token, confirm the factory call in TronLink, and deploy directly from your own wallet.
            </p>
          </div>
          <WalletConnectButton />
        </header>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-6">
            <section className="rounded-lg border border-line bg-panel/86 p-5 shadow-glow">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-white">Token Parameters</h2>
                  <p className="mt-1 text-sm text-slate-400">
                    Values are validated locally before the wallet signature request.
                  </p>
                </div>
                <Sparkles className="h-5 w-5 text-amber" />
              </div>
              <TokenForm disabled={!walletAddress || deploymentActive} onReview={handleReview} />
              {!walletAddress ? (
                <p className="mt-4 rounded-md border border-amber/40 bg-amber/10 px-3 py-2 text-sm text-amber">
                  Connect TronLink to enable token creation.
                </p>
              ) : null}
            </section>

            <DeploymentProgress status={deploymentStatus} />
            <SuccessCard result={result} onCreateAnother={handleCreateAnother} />
          </div>

          <ReviewPanel
            token={currentToken}
            network={network}
            factoryAddress={factoryAddress}
            disabled={deploymentActive || deployment.isPending}
            onDeploy={handleDeploy}
          />
        </section>

        <PoolPriceChecker />
      </div>
    </main>
  );
}

export default App;
