# TRON TRC-20 Token Generator

Frontend-only dApp for creating TRC-20 tokens from a user's TronLink wallet. The factory contract deploys new token contracts and assigns the initial supply to the creator.

## Live Demo

- **Frontend:** https://frontend-one-mu-71.vercel.app
- **Factory (Nile Testnet):** `TM12pSXLxaRxygYvE5EWj21uLyuyix4enq`

## Project Layout

```text
src/
  Token.sol              -- ERC20 token with configurable decimals
  TokenFactory.sol       -- Factory that deploys Token instances
test/
  TokenFactory.t.sol     -- Foundry tests (4 passing)
script/
  DeployTokenFactory.s.sol -- Foundry deployment script
frontend/
  src/
    App.tsx              -- Main application component
    components/          -- UI components (form, review, progress, results)
    services/tronLink.ts -- TronLink wallet integration
    store/useDappStore.ts -- Zustand state management
    types/tron.ts        -- TypeScript type definitions
    utils/               -- Network detection and form validation
    contracts/           -- Factory ABI
```

## Features

- Connect TronLink wallet (Nile Testnet or Mainnet)
- Configure token name, symbol, supply, and decimals
- Client-side form validation
- Review panel before deployment
- Deploy via TronLink signature
- Deployment progress tracker
- Success card with copy actions and TronScan links

## Development

```shell
# Install dependencies
npm install

# Compile contracts
forge build

# Run tests
forge test

# Frontend dev server
cd frontend && npm run dev
```

## Deploy Factory

### TronBox (TRON Nile/Mainnet)

```shell
npx tronbox compile
npx tronbox migrate --network nile   # or --network mainnet
```

### Foundry

```shell
forge script script/DeployTokenFactory.s.sol:DeployTokenFactory --rpc-url <rpc_url> --private-key <private_key> --broadcast
```

## Deploy Frontend

The frontend is a Vite + React + TypeScript app. Deploy to Vercel:

1. Connect the GitHub repo to Vercel
2. Set root directory to `frontend/`
3. Add env variable: `VITE_FACTORY_ADDRESS = <deployed_factory_address>`

## Dependencies

- OpenZeppelin Contracts `4.9.6` for Solidity `0.8.18`
- React 18, TypeScript, TailwindCSS, Zustand, TanStack React Query, TronWeb
