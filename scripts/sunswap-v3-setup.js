/**
 * SunSwap V3 Pool Setup Script (Nile Testnet)
 *
 * Creates a concentrated liquidity pool for your TRC-20 token paired with WTRX,
 * initializes the price to 3.03 TRX per token ($1.00 at $0.33/TRX),
 * and mints two non-swappable positions.
 *
 * Usage:
 *   source .env && node scripts/sunswap-v3-setup.js
 *
 * Required env:
 *   PRIVATE_KEY_NILE - deployer wallet private key
 *   TOKEN_ADDRESS    - your deployed TRC-20 token address
 */

const TronWeb = require('tronweb');
require('dotenv').config();

const FULL_NODE = 'https://nile.trongrid.io';

const SUNSWAP_V3_FACTORY  = 'TUTGcsGDRScK1gsDPMELV2QZxeESWb1Gac';
const POSITION_MANAGER    = 'TPQzqHbCzQfoVdAV6bLwGDos8Lk2UjXz2R';
const WTRX                = 'TYsbWxNnyTgsZaTFaue9hqpxkU3Fkco94a';
const FEE_TIER            = 10000;
const TICK_SPACING        = 200;

/// 'TGU75S5GAkZZs3uWTcZGGMPXHBKG1FGdWJ', 


const TOKEN = process.env.TOKEN_ADDRESS || 'TZCDV3bjjhgyTqzhPzHao2px3qUNgTdfUf';
const PK    = process.env.PRIVATE_KEY_NILE;

if (!PK) { console.error('Missing PRIVATE_KEY_NILE'); process.exit(1); }

// --- BigInt sqrt (Newton's method) ---
function sqrt(value) {
  if (value < 2n) return value;
  let x = value;
  let y = (x + 1n) >> 1n;
  while (y < x) { x = y; y = (y + value / y) >> 1n; }
  return x;
}

// --- Price to sqrtPriceX96 (Q64.96) ---
function priceToSqrtPriceX96(price) {
  const TWO_96 = 1n << 96n;
  const TWO_192 = TWO_96 * TWO_96;
  const s = price.toString();
  const dot = s.indexOf('.');
  const decimals = dot === -1 ? 0 : s.length - 1 - dot;
  const intStr = s.replace('.', '');
  const priceInt = BigInt(intStr);
  const divisor = BigInt(10) ** BigInt(decimals);
  // sqrt(price) * 2^96 = sqrt(price * 2^192) / 2^96 * 2^96 = sqrt(price * 2^192)
  const scaled = priceInt * TWO_192 / divisor;
  return sqrt(scaled);
}

// --- Price to tick, aligned to tick spacing ---
function priceToTick(price, alignDown) {
  const rawTick = Math.log(price) / Math.log(1.0001);
  // Align to tick spacing
  const aligned = alignDown
    ? Math.floor(rawTick / TICK_SPACING) * TICK_SPACING
    : Math.ceil(rawTick / TICK_SPACING) * TICK_SPACING;
  return aligned;
}

// --- Helpers ---
function now() { return new Date().toISOString(); }
function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

// --- Main ---
async function main() {
  const tw = new TronWeb(FULL_NODE, FULL_NODE, FULL_NODE, PK);
  const owner = tw.address.fromPrivateKey(PK);
  const ownerHex = tw.address.toHex(owner);

  console.log(`[${now()}] Wallet: ${owner}`);
  console.log(`[${now()}] Token:  ${TOKEN}`);
  console.log(`[${now()}] WTRX:   ${WTRX}`);

  const trxBal = await tw.trx.getBalance(owner);
  console.log(`[${now()}] TRX: ${(trxBal / 1e6).toFixed(2)}`);

  // --- Token ordering ---
  const tokenHex = tw.address.toHex(TOKEN).toLowerCase();
  const wtrxHex  = tw.address.toHex(WTRX).toLowerCase();
  const token0 = tokenHex < wtrxHex ? TOKEN : WTRX;
  const token1 = tokenHex < wtrxHex ? WTRX : TOKEN;
  const token0Hex = tw.address.toHex(token0);
  const token1Hex = tw.address.toHex(token1);
  const isToken0Our = token0 === TOKEN;
  console.log(`[${now()}] token0: ${token0}${isToken0Our ? ' (TOKEN)' : ' (WTRX)'}`);
  console.log(`[${now()}] token1: ${token1}${!isToken0Our ? ' (TOKEN)' : ' (WTRX)'}`);

  // --- Factory ---
  const factoryAbi = [
    { inputs: [{ name: 'tokenA', type: 'address' }, { name: 'tokenB', type: 'address' }, { name: 'fee', type: 'uint24' }], name: 'getPool', outputs: [{ name: '', type: 'address' }], stateMutability: 'view', type: 'function' },
    { inputs: [{ name: 'tokenA', type: 'address' }, { name: 'tokenB', type: 'address' }, { name: 'fee', type: 'uint24' }], name: 'createPool', outputs: [{ name: '', type: 'address' }], stateMutability: 'nonpayable', type: 'function' },
  ];
  const factory = await tw.contract(factoryAbi, SUNSWAP_V3_FACTORY);
  const ZERO_ADDR = '410000000000000000000000000000000000000000';

  let poolAddr = await factory.getPool(token0Hex, token1Hex, FEE_TIER).call();
  // Normalize: contract calls return hex with '0x' prefix or without
  const poolNorm = poolAddr.replace('0x', '').toLowerCase();
  if (poolNorm !== ZERO_ADDR) {
    console.log(`[${now()}] Pool exists: ${poolAddr}`);
  } else {
    console.log(`[${now()}] Creating pool (1% fee, high energy)...`);
    const tx = await factory.createPool(token0Hex, token1Hex, FEE_TIER)
      .send({ shouldPollResponse: true, feeLimit: 800_000_000 });
    console.log(`[${now()}] createPool tx: ${tx}`);
    await delay(10000);
    poolAddr = await factory.getPool(token0Hex, token1Hex, FEE_TIER).call();
    const poolNorm2 = (poolAddr || '').replace('0x', '').toLowerCase();
    if (poolNorm2 === ZERO_ADDR) { console.error('Pool creation failed'); process.exit(1); }
    console.log(`[${now()}] Pool: ${poolAddr}`);
  }

  // --- Initialize pool ---
  const poolAbi = [
    { inputs: [{ name: 'sqrtPriceX96', type: 'uint160' }], name: 'initialize', outputs: [], stateMutability: 'nonpayable', type: 'function' },
    { inputs: [], name: 'slot0', outputs: [{ name: 'sqrtPriceX96', type: 'uint160' }, { name: 'tick', type: 'int24' }, { name: 'observationIndex', type: 'uint16' }, { name: 'observationCardinality', type: 'uint16' }, { name: 'observationCardinalityNext', type: 'uint16' }, { name: 'feeProtocol', type: 'uint8' }, { name: 'unlocked', type: 'bool' }], stateMutability: 'view', type: 'function' },
  ];
  const pool = await tw.contract(poolAbi, poolAddr);
  let slot0;
  try { slot0 = await pool.slot0().call(); } catch (e) {
    console.log(`[${now()}] slot0 not available yet (pool may need initialization)`);
  }

  const targetPrice = isToken0Our ? 3.03 : (1 / 3.03);
  const sqrtPrice = priceToSqrtPriceX96(targetPrice);
  console.log(`[${now()}] Target price: ${targetPrice.toFixed(6)}, sqrtPriceX96: ${sqrtPrice}`);

  if (slot0 && slot0.sqrtPriceX96 && slot0.sqrtPriceX96.toString() !== '0') {
    console.log(`[${now()}] Already initialized: tick=${slot0.tick}, sqrt=${slot0.sqrtPriceX96}`);
  } else {
    console.log(`[${now()}] Initializing pool...`);
    const tx = await pool.initialize(sqrtPrice.toString())
      .send({ shouldPollResponse: true, feeLimit: 200_000_000 });
    console.log(`[${now()}] initialize tx: ${tx}`);
    await delay(10000);
    slot0 = await pool.slot0().call();
    console.log(`[${now()}] Initialized: tick=${slot0.tick}, sqrtPriceX96=${slot0.sqrtPriceX96}`);
  }

  // --- Wrap TRX to WTRX ---
  const wtrxAbi = [
    { inputs: [], name: 'deposit', outputs: [], stateMutability: 'payable', type: 'function' },
    { inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], name: 'approve', outputs: [{ name: '', type: 'bool' }], stateMutability: 'nonpayable', type: 'function' },
    { inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }], name: 'allowance', outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view', type: 'function' },
    { inputs: [{ name: 'account', type: 'address' }], name: 'balanceOf', outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view', type: 'function' },
    { inputs: [], name: 'decimals', outputs: [{ name: '', type: 'uint8' }], stateMutability: 'view', type: 'function' },
  ];
  const wtrxC = await tw.contract(wtrxAbi, WTRX);
  let wtrxBal = await wtrxC.balanceOf(ownerHex).call();
  console.log(`[${now()}] WTRX balance: ${(Number(wtrxBal)/1e6).toFixed(2)}`);

  const wtrxNeeded = 152_000_000n; // 152 WTRX (units)
  if (BigInt(wtrxBal) < wtrxNeeded) {
    const wrap = wtrxNeeded - BigInt(wtrxBal);
    console.log(`[${now()}] Wrapping ${(Number(wrap)/1e6).toFixed(2)} TRX -> WTRX...`);
    const tx = await wtrxC.deposit().send({
      callValue: Number(wrap), shouldPollResponse: true, feeLimit: 100_000_000,
    });
    console.log(`[${now()}] wrap tx: ${tx}`);
    await delay(5000);
    wtrxBal = await wtrxC.balanceOf(ownerHex).call();
    console.log(`[${now()}] WTRX: ${(Number(wtrxBal)/1e6).toFixed(2)}`);
  }

  // --- Check token balance ---
  const tAbi = [
    { inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], name: 'approve', outputs: [{ name: '', type: 'bool' }], stateMutability: 'nonpayable', type: 'function' },
    { inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }], name: 'allowance', outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view', type: 'function' },
    { inputs: [{ name: 'account', type: 'address' }], name: 'balanceOf', outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view', type: 'function' },
  ];
  const tC = await tw.contract(tAbi, TOKEN);
  const tBal = await tC.balanceOf(ownerHex).call();
  const tDec = 6;
  console.log(`[${now()}] Token balance: ${(Number(tBal)/10**tDec).toFixed(2)}`);
  const TOKENS_AVAILABLE = BigInt(tBal);
  if (TOKENS_AVAILABLE < 1000n * 10n**BigInt(tDec)) {
    console.error(`Need at least 1,000 tokens, have ${(Number(tBal)/10**tDec).toFixed(2)}`);
    process.exit(1);
  }

  // --- Approve PositionManager ---
  const pmHex = tw.address.toHex(POSITION_MANAGER);
  const approveAmount = (100_000_000_000 * 10**tDec).toString(); // huge allowance

  const tAllow = await tC.allowance(ownerHex, pmHex).call();
  if (BigInt(tAllow) < 50_000_000n * 10n**BigInt(tDec)) {
    console.log(`[${now()}] Approving token for PositionManager...`);
    const tx = await tC.approve(pmHex, approveAmount)
      .send({ shouldPollResponse: true, feeLimit: 100_000_000 });
    console.log(`[${now()}] approve tx: ${tx}`);
    await delay(5000);
  }

  const wAllow = await wtrxC.allowance(ownerHex, pmHex).call();
  if (BigInt(wAllow) < wtrxNeeded) {
    console.log(`[${now()}] Approving WTRX for PositionManager...`);
    const tx = await wtrxC.approve(pmHex, approveAmount)
      .send({ shouldPollResponse: true, feeLimit: 100_000_000 });
    console.log(`[${now()}] approve tx: ${tx}`);
    await delay(5000);
  }

  // --- Calculate tick ranges ---
  // Position 1 (token only, above current): 3.10 - 10.00
  // Position 2 (WTRX only, below current):  2.50 - 3.00
  const p1_low  = isToken0Our ? 3.10 : (1 / 10.00);
  const p1_high = isToken0Our ? 10.00 : (1 / 3.10);
  const p2_low  = isToken0Our ? 2.50 : (1 / 3.00);
  const p2_high = isToken0Our ? 3.00 : (1 / 2.50);

  const t1_low  = priceToTick(p1_low, true);
  const t1_high = priceToTick(p1_high, false);
  const t2_low  = priceToTick(p2_low, true);
  const t2_high = priceToTick(p2_high, false);

  console.log(`\n[${now()}] Position 1 (TOKEN only): ticks [${t1_low}, ${t1_high}]`);
  console.log(`[${now()}] Position 2 (WTRX only): ticks [${t2_low}, ${t2_high}]`);

  // --- Mint positions ---
  const pmAbi = [{
    inputs: [{
      components: [
        { name: 'token0', type: 'address' },
        { name: 'token1', type: 'address' },
        { name: 'fee', type: 'uint24' },
        { name: 'tickLower', type: 'int24' },
        { name: 'tickUpper', type: 'int24' },
        { name: 'amount0Desired', type: 'uint256' },
        { name: 'amount1Desired', type: 'uint256' },
        { name: 'amount0Min', type: 'uint256' },
        { name: 'amount1Min', type: 'uint256' },
        { name: 'recipient', type: 'address' },
        { name: 'deadline', type: 'uint256' },
      ], name: 'params', type: 'tuple',
    }],
    name: 'mint', outputs: [
      { name: 'tokenId', type: 'uint256' },
      { name: 'liquidity', type: 'uint128' },
      { name: 'amount0', type: 'uint256' },
      { name: 'amount1', type: 'uint256' },
    ], stateMutability: 'nonpayable', type: 'function',
  }];
  const pm = await tw.contract(pmAbi, POSITION_MANAGER);
  const deadline = Math.floor(Date.now() / 1000) + 7200;

  const SUPPLY = TOKENS_AVAILABLE.toString();
  const WTRX_AMT = wtrxNeeded.toString();

  // Position 1: deposit TOKEN only (above current price) - skip if previously minted
  if (TOKENS_AVAILABLE > 1000n * 10n**BigInt(tDec)) {
    const p1Supply = TOKENS_AVAILABLE - 1000n * 10n**BigInt(tDec); // leave 1000 tokens for Position 3
    console.log(`\n[${now()}] Minting Position 1 (${(Number(p1Supply)/10**tDec).toFixed(0)} TOKEN, range 3.10-10.00)...`);
    try {
      const r = await pm.mint([
        token0Hex, token1Hex, FEE_TIER,
        t1_low, t1_high,
        isToken0Our ? p1Supply.toString() : '0',
        isToken0Our ? '0' : p1Supply.toString(),
        '0', '0', ownerHex, deadline
      ]).send({ shouldPollResponse: true, feeLimit: 500_000_000 });
      console.log(`[${now()}] Position 1 TX: ${r}`);
    } catch (e) {
      console.error(`[${now()}] Position 1 failed: ${(e?.message || e?.error || JSON.stringify(e) || 'unknown').substring(0, 300)}`);
    }
  } else {
    console.log(`\n[${now()}] Skipping Position 1 (only ${(Number(TOKENS_AVAILABLE)/10**tDec).toFixed(0)} TOKEN left)`);
  }

  await delay(5000);

  // Position 2: deposit WTRX only (below current price)
  console.log(`[${now()}] Minting Position 2 (151.5 WTRX, range 2.50-3.00)...`);
  try {
    const r = await pm.mint([
      token0Hex, token1Hex, FEE_TIER,
      t2_low, t2_high,
      isToken0Our ? '0' : WTRX_AMT,
      isToken0Our ? WTRX_AMT : '0',
      '0', '0', ownerHex, deadline
    ]).send({ shouldPollResponse: true, feeLimit: 500_000_000 });
    console.log(`[${now()}] Position 2 TX: ${r}`);
  } catch (e) {
    console.error(`[${now()}] Position 2 failed: ${(e?.message || e?.error || JSON.stringify(e) || 'unknown').substring(0, 300)}`);
  }

  await delay(5000);

  // Position 3: narrow range around current price (both tokens, small amount for price display)
  const currentTick = Number(slot0.tick);
  const TICK_SPACING = 200;
  const p3_low_tick  = Math.floor(currentTick / TICK_SPACING) * TICK_SPACING;
  const p3_high_tick = p3_low_tick + TICK_SPACING;
  const P3_TOKEN = (20n * 10n**BigInt(tDec)).toString(); // 20 TOKEN
  const P3_WTRX = 61_000_000n.toString(); // ~61 WTRX matched to 3.03
  console.log(`\n[${now()}] Minting Position 3 (${Number(P3_TOKEN)/10**tDec} TOKEN + ${(Number(P3_WTRX)/1e6).toFixed(1)} WTRX, tick range ${p3_low_tick}-${p3_high_tick})...`);
  try {
    const r = await pm.mint([
      token0Hex, token1Hex, FEE_TIER,
      p3_low_tick, p3_high_tick,
      isToken0Our ? P3_TOKEN : P3_WTRX,
      isToken0Our ? P3_WTRX : P3_TOKEN,
      '0', '0', ownerHex, deadline
    ]).send({ shouldPollResponse: true, feeLimit: 500_000_000 });
    console.log(`[${now()}] Position 3 TX: ${r || 'no txid'}`);
  } catch (e) {
    console.error(`[${now()}] Position 3 failed: ${(e?.message || e?.error || JSON.stringify(e)).substring(0, 300)}`);
  }

  const poolB58 = tw.address.fromHex(poolAddr.replace('0x', ''));
  console.log(`\n[${now()}] ✅ Done! Pool (base58): ${poolB58}`);
  console.log(`[${now()}] Explorer: https://nile.tronscan.org/#/contract/${poolB58}`);
  console.log(`[${now()}] Hex:      ${poolAddr}`);
  console.log(`[${now()}] Set TOKEN_POOL_ADDRESS=${poolB58} in .env to track this pool`);
}

main().catch(e => { console.error('Fatal:', e?.message || e?.error || JSON.stringify(e) || e); process.exit(1); });
