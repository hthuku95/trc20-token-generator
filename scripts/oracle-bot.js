/**
 * TokenPriceOracle Bot for TRON (Nile Testnet)
 *
 * Fetches a price from a data source and pushes it to
 * the TokenPriceOracle contract on-chain.
 *
 * Usage: node scripts/oracle-bot.js
 *
 * Requires .env file at project root with:
 *   PRIVATE_KEY_NILE=...
 *   ORACLE_CONTRACT_ADDRESS=...
 *   TOKEN_PRICE=0.01
 */

const TronWeb = require('tronweb');
require('dotenv').config();

const ORACLE_PRIVATE_KEY = process.env.PRIVATE_KEY_NILE;
const ORACLE_CONTRACT = process.env.ORACLE_CONTRACT_ADDRESS;
const TOKEN_PRICE = process.env.TOKEN_PRICE || '0.01';

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

async function main() {
  if (!ORACLE_PRIVATE_KEY) throw new Error('Missing PRIVATE_KEY_NILE in .env');
  if (!ORACLE_CONTRACT) throw new Error('Missing ORACLE_CONTRACT_ADDRESS in .env');

  const tronWeb = new TronWeb(FULL_NODE, SOLIDITY_NODE, EVENT_SERVER, ORACLE_PRIVATE_KEY);
  const contract = await tronWeb.contract(ABI, ORACLE_CONTRACT);

  const priceInSun = TronWeb.toSun(TOKEN_PRICE);
  console.log(`[Oracle Bot] Setting price to ${TOKEN_PRICE} USD (${priceInSun} in smallest units)...`);

  try {
    const tx = await contract.setTokenValue(priceInSun).send();
    console.log(`[Oracle Bot] Transaction sent: ${tx}`);
    console.log(`[Oracle Bot] Price updated successfully.`);
  } catch (err) {
    console.error('[Oracle Bot] Failed to set price:', err.message);
  }
}

main();
