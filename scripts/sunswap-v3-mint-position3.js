/**
 * Mint Position 3 only (narrow in-range position for price display)
 * Run after pool exists and is initialized.
 *
 * Usage:
 *   source .env && TOKEN_ADDRESS=TGU75S5GAkZZs3uWTcZGGMPXHBKG1FGdWJ node scripts/sunswap-v3-mint-position3.js
 */

const TronWeb = require('tronweb');
require('dotenv').config();

const FULL_NODE = 'https://nile.trongrid.io';
const PK = process.env.PRIVATE_KEY_NILE;
const TOKEN = process.env.TOKEN_ADDRESS;
const WTRX = 'TYsbWxNnyTgsZaTFaue9hqpxkU3Fkco94a';
const POSITION_MANAGER = 'TPQzqHbCzQfoVdAV6bLwGDos8Lk2UjXz2R';
const SUNSWAP_V3_FACTORY = 'TUTGcsGDRScK1gsDPMELV2QZxeESWb1Gac';
const FEE_TIER = 10000;

function now() { return new Date().toISOString(); }
function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  const tw = new TronWeb(FULL_NODE, FULL_NODE, FULL_NODE, PK);
  const owner = tw.address.fromPrivateKey(PK);
  const ownerHex = tw.address.toHex(owner);

  console.log(`[${now()}] Wallet: ${owner}`);
  const trxBal = await tw.trx.getBalance(owner);
  console.log(`[${now()}] TRX: ${(trxBal / 1e6).toFixed(2)}`);

  const tokenHex = tw.address.toHex(TOKEN).toLowerCase();
  const wtrxHex  = tw.address.toHex(WTRX).toLowerCase();
  const token0 = tokenHex < wtrxHex ? TOKEN : WTRX;
  const token1 = tokenHex < wtrxHex ? WTRX : TOKEN;
  const token0Hex = tw.address.toHex(token0);
  const token1Hex = tw.address.toHex(token1);
  const isToken0Our = token0 === TOKEN;
  console.log(`[${now()}] token0: ${token0}${isToken0Our ? ' (TOKEN)' : ' (WTRX)'}`);
  console.log(`[${now()}] token1: ${token1}${!isToken0Our ? ' (TOKEN)' : ' (WTRX)'}`);

  // Get pool
  const factoryAbi = [
    { inputs: [{ name: 'tokenA', type: 'address' }, { name: 'tokenB', type: 'address' }, { name: 'fee', type: 'uint24' }], name: 'getPool', outputs: [{ name: '', type: 'address' }], stateMutability: 'view', type: 'function' },
  ];
  const factory = await tw.contract(factoryAbi, SUNSWAP_V3_FACTORY);
  let poolAddr = await factory.getPool(token0Hex, token1Hex, FEE_TIER).call();
  const poolNorm = poolAddr.replace('0x', '').toLowerCase();
  if (poolNorm === '410000000000000000000000000000000000000000') {
    console.error('Pool does not exist. Run sunswap-v3-setup.js first.');
    process.exit(1);
  }
  const poolB58 = tw.address.fromHex(poolAddr);
  console.log(`[${now()}] Pool: ${poolB58}`);

  // Check slot0
  const poolAbi = [
    { inputs: [], name: 'slot0', outputs: [
      { name: 'sqrtPriceX96', type: 'uint160' },
      { name: 'tick', type: 'int24' },
      { name: 'observationIndex', type: 'uint16' },
      { name: 'observationCardinality', type: 'uint16' },
      { name: 'observationCardinalityNext', type: 'uint16' },
      { name: 'feeProtocol', type: 'uint8' },
      { name: 'unlocked', type: 'bool' }
    ], stateMutability: 'view', type: 'function' },
  ];
  const pool = await tw.contract(poolAbi, poolAddr);
  const slot0 = await pool.slot0().call();
  const currentTick = Number(slot0.tick);
  const sqrtPrice = slot0.sqrtPriceX96;
  console.log(`[${now()}] Current tick: ${currentTick}, sqrtPriceX96: ${sqrtPrice}`);

  // Check balances
  const wtrxCAbi = [
    { inputs: [], name: 'deposit', outputs: [], stateMutability: 'payable', type: 'function' },
    { inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], name: 'approve', outputs: [{ name: '', type: 'bool' }], stateMutability: 'nonpayable', type: 'function' },
    { inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }], name: 'allowance', outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view', type: 'function' },
    { inputs: [{ name: 'account', type: 'address' }], name: 'balanceOf', outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view', type: 'function' },
  ];
  const wtrxC = await tw.contract(wtrxCAbi, WTRX);
  let wtrxBal = await wtrxC.balanceOf(ownerHex).call();
  console.log(`[${now()}] WTRX balance: ${(Number(wtrxBal)/1e6).toFixed(2)}`);

  const tAbi = [
    { inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], name: 'approve', outputs: [{ name: '', type: 'bool' }], stateMutability: 'nonpayable', type: 'function' },
    { inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }], name: 'allowance', outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view', type: 'function' },
    { inputs: [{ name: 'account', type: 'address' }], name: 'balanceOf', outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view', type: 'function' },
  ];
  const tC = await tw.contract(tAbi, TOKEN);
  const tBal = await tC.balanceOf(ownerHex).call();
  const tDec = 6;
  console.log(`[${now()}] Token balance: ${(Number(tBal)/10**tDec).toFixed(2)}`);

  // Wrap WTRX if needed
  const P3_WTRX_AMT = 61_000_000n;
  if (BigInt(wtrxBal) < P3_WTRX_AMT) {
    const wrap = P3_WTRX_AMT - BigInt(wtrxBal);
    console.log(`[${now()}] Wrapping ${(Number(wrap)/1e6).toFixed(2)} TRX → WTRX...`);
    const wtx = await wtrxC.deposit().send({ callValue: Number(wrap), shouldPollResponse: true, feeLimit: 100_000_000 });
    console.log(`[${now()}] wrap tx: ${wtx}`);
    await delay(5000);
    wtrxBal = await wtrxC.balanceOf(ownerHex).call();
    console.log(`[${now()}] WTRX: ${(Number(wtrxBal)/1e6).toFixed(2)}`);
  }

  // Approve WTRX for PositionManager
  const pmHex = tw.address.toHex(POSITION_MANAGER);
  const wAllow = await wtrxC.allowance(ownerHex, pmHex).call();
  if (BigInt(wAllow) < P3_WTRX_AMT) {
    console.log(`[${now()}] Approving WTRX for PositionManager...`);
    const atx = await wtrxC.approve(pmHex, '100000000000000').send({ shouldPollResponse: true, feeLimit: 100_000_000 });
    console.log(`[${now()}] approve tx: ${atx}`);
    await delay(5000);
  }

  // Approve TOKEN for PositionManager
  const P3_TOKEN_AMT = (20n * 10n**BigInt(tDec)).toString(); // 20 TOKEN
  const tAllow = await tC.allowance(ownerHex, pmHex).call();
  if (BigInt(tAllow) < BigInt(P3_TOKEN_AMT)) {
    console.log(`[${now()}] Approving TOKEN for PositionManager...`);
    const atx = await tC.approve(pmHex, '100000000000000').send({ shouldPollResponse: true, feeLimit: 100_000_000 });
    console.log(`[${now()}] approve tx: ${atx}`);
    await delay(5000);
  }

  // Mint Position 3: narrow range at current tick
  const TICK_SPACING = 200;
  const p3_low  = Math.floor(currentTick / TICK_SPACING) * TICK_SPACING;
  const p3_high = p3_low + TICK_SPACING;

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

  console.log(`\n[${now()}] Minting Position 3 (${Number(P3_TOKEN_AMT)/10**tDec} TOKEN + ${(Number(P3_WTRX_AMT)/1e6).toFixed(1)} WTRX, ticks ${p3_low}-${p3_high})...`);
  const r = await pm.mint([
    token0Hex, token1Hex, FEE_TIER,
    p3_low, p3_high,
    isToken0Our ? P3_TOKEN_AMT : P3_WTRX_AMT.toString(),
    isToken0Our ? P3_WTRX_AMT.toString() : P3_TOKEN_AMT,
    '0', '0', ownerHex, deadline
  ]).send({ shouldPollResponse: true, feeLimit: 500_000_000 });
  console.log(`[${now()}] Position 3 TX: ${r || 'ok'}`);

  // Verify liquidity
  await delay(10000);
  const liq = await pool.liquidity().call();
  console.log(`[${now()}] Pool liquidity after Position 3: ${liq}`);
  console.log(`\n[${now()}] ✅ Done!`);
}

main().catch(e => console.error('Fatal:', JSON.stringify(e?.message || e?.error || e || 'unknown').substring(0, 500)));
