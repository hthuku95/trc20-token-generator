/**
 * TokenPriceOracle Bot for TRON (Nile Testnet)
 *
 * Fetches a token price from CoinGecko and pushes it to
 * the TokenPriceOracle contract on-chain via the oracle address.
 *
 * Designed for automation with CRON or PM2 (see notes below).
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
 *
 * Automation:
 *   CRON (every 15 minutes):
 *     */15 * * * * cd /path/to/project && node scripts/oracle-bot.js >> /var/log/oracle.log 2>&1
 *
 *   PM2 (process manager):
 *     pm2 start scripts/oracle-bot.js --name oracle-bot --cron-restart="*/15 * * * *"
 */

const TronWeb = require('tronweb');
require('dotenv').config();

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

  // 2. Scale to uint256 fixed-point (default 18 decimals like ETH/Wei)
  const scaledPrice = TronWeb.toBigNumber(rawPrice * 10 ** PRICE_SCALING).toFixed(0);
  console.log(`[${now()}] Scaled price (${PRICE_SCALING} decimals): ${scaledPrice}`);

  // 3. Send transaction
  try {
    const tx = await contract.setTokenValue(scaledPrice).send();
    console.log(`[${now()}] Transaction submitted: ${tx}`);

    // 4. Wait for confirmation
    const receipt = await tronWeb.trx.getTransactionInfo(tx);
    if (receipt && receipt.receipt?.result === 'SUCCESS') {
      console.log(`[${now()}] Price updated successfully in block ${receipt.blockNumber}`);
    } else {
      console.warn(`[${now()}] Transaction sent but confirmation uncertain. Receipt:`, JSON.stringify(receipt));
    }
  } catch (err) {
    console.error(`[${now()}] Failed to set price:`, err.message);
  }
}

updateOraclePrice();
