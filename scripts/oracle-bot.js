/**
 * TokenPriceOracle Bot for TRON (Nile Testnet)
 *
 * Fetches a token price from CoinGecko and pushes it to
 * the TokenPriceOracle contract on-chain via the oracle address.
 *
 * Designed for automation with CRON or PM2 (see usage examples after the
 * require() calls below).
 *
 * Setup:
 *   1. npm install tronweb dotenv
 *   2. Add to .env:
 *        PRIVATE_KEY_NILE=<oracle_wallet_private_key>
 *        ORACLE_CONTRACT_ADDRESS=<deployed_oracle_address>
 *        COINGECKO_TOKEN_ID=ethereum          (optional, default: tether)
 *        TOKEN_PRICE_SCALING=18                (optional, default: 18)
 *   OR set TOKEN_PRICE directly to skip the API.
 *
 * Usage:
 *   node scripts/oracle-bot.js
 */

const TronWeb = require('tronweb');
require('dotenv').config();

// Automation examples (CRON/PM2):
//   CRON (every 15 min):
//     */15 * * * * cd /path/to/project && node scripts/oracle-bot.js >> /var/log/oracle.log 2>&1
//   PM2:
//     pm2 start scripts/oracle-bot.js --name oracle-bot --cron-restart="*/15 * * * *"

const ORACLE_PRIVATE_KEY = process.env.PRIVATE_KEY_NILE;
const ORACLE_CONTRACT = process.env.ORACLE_CONTRACT_ADDRESS;
const TOKEN_PRICE = process.env.TOKEN_PRICE;
const COINGECKO_TOKEN_ID = process.env.COINGECKO_TOKEN_ID || 'tether';
const PRICE_SCALING = parseInt(process.env.TOKEN_PRICE_SCALING || '18', 10);

const FULL_NODE = 'https://nile.trongrid.io';
const SOLIDITY_NODE = 'https://nile.trongrid.io';
const EVENT_SERVER = 'https://nile.trongrid.io';

const ABI = [
  {
    inputs: [{ internalType: 'uint256', name: '_newValue', type: 'uint256' }],
    name: 'setTokenValue',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
];

function now() {
  return new Date().toISOString();
}

async function fetchPriceFromCoinGecko() {
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${COINGECKO_TOKEN_ID}&vs_currencies=usd`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`CoinGecko HTTP ${response.status}: ${response.statusText}`);
  }
  const data = await response.json();
  const price = data[COINGECKO_TOKEN_ID]?.usd;
  if (price === undefined || price === null) {
    throw new Error(`No USD price found for "${COINGECKO_TOKEN_ID}"`);
  }
  return price;
}

async function updateOraclePrice() {
  if (!ORACLE_PRIVATE_KEY) throw new Error('Missing PRIVATE_KEY_NILE in .env');
  if (!ORACLE_CONTRACT) throw new Error('Missing ORACLE_CONTRACT_ADDRESS in .env');

  const tronWeb = new TronWeb(FULL_NODE, SOLIDITY_NODE, EVENT_SERVER, ORACLE_PRIVATE_KEY);
  const contract = await tronWeb.contract(ABI, ORACLE_CONTRACT);

  // 1. Get the raw price
  let rawPrice;
  if (TOKEN_PRICE) {
    rawPrice = parseFloat(TOKEN_PRICE);
    console.log(`[${now()}] Using static price from env: $${rawPrice}`);
  } else {
    rawPrice = await fetchPriceFromCoinGecko();
    console.log(`[${now()}] Fetched live price from CoinGecko: $${rawPrice}`);
  }

  // 2. Scale to uint256 fixed-point using BigInt (avoids floating-point drift)
  const [whole, frac = ''] = rawPrice.toString().split('.');
  const decimalsInInput = frac.length;
  if (decimalsInInput > PRICE_SCALING) {
    throw new Error(`Price has ${decimalsInInput} decimals, max supported is ${PRICE_SCALING}`);
  }
  const scaledStr = whole + frac.padEnd(PRICE_SCALING, '0').slice(0, PRICE_SCALING);
  const scaledPrice = BigInt(scaledStr).toString();
  console.log(`[${now()}] Scaled price (${PRICE_SCALING} decimals): ${scaledPrice}`);

  // 3. Send transaction
  try {
    const tx = await contract.setTokenValue(scaledPrice).send();
    console.log(`[${now()}] Transaction submitted: ${tx}`);

    // 4. Wait for confirmation (Nile can be slow, poll up to 90s)
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 3000));
      const receipt = await tronWeb.trx.getTransactionInfo(tx);
      if (receipt && Object.keys(receipt).length > 0) {
        const result = receipt.receipt?.result || receipt.result;
        if (result === 'SUCCESS') {
          console.log(`[${now()}] Price updated in block ${receipt.blockNumber}`);
        } else {
          console.log(`[${now()}] Transaction result: ${result}`);
        }
        return;
      }
    }
    console.log(`[${now()}] Timed out waiting for confirmation. Check tx: ${tx}`);
  } catch (err) {
    console.error(`[${now()}] Failed to set price:`, err.message);
  }
}

updateOraclePrice();
