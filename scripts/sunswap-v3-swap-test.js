/**
 * SunSwap V3 Swap Test (Nile Testnet)
 *
 * Swaps 1 TOKEN → WTRX on our pool to verify it works.
 *
 * Usage:
 *   source .env && TOKEN_ADDRESS=TGU75S5GAkZZs3uWTcZGGMPXHBKG1FGdWJ node scripts/sunswap-v3-swap-test.js
 */

const TronWeb = require('tronweb');
require('dotenv').config();

const FULL_NODE = 'https://nile.trongrid.io';
const PK = process.env.PRIVATE_KEY_NILE;
const TOKEN = process.env.TOKEN_ADDRESS;
const WTRX = 'TYsbWxNnyTgsZaTFaue9hqpxkU3Fkco94a';
const SWAP_ROUTER = 'TFkswj6rUfK3cQtFGzungCkNXxD2UCpEVD';
const FEE_TIER = 10000;
const POOL = 'TQzLbMRHTxcbvey8BPQ51PjxfibCo11EFj';

function now() { return new Date().toISOString(); }

async function main() {
  const tw = new TronWeb(FULL_NODE, FULL_NODE, FULL_NODE, PK);
  const owner = tw.address.fromPrivateKey(PK);
  const ownerHex = tw.address.toHex(owner);

  console.log(`[${now()}] Wallet: ${owner}`);
  const trxBal = await tw.trx.getBalance(owner);
  console.log(`[${now()}] TRX: ${(trxBal / 1e6).toFixed(2)}`);

  // Token with decimals
  const tAbi = [
    { inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], name: 'approve', outputs: [{ name: '', type: 'bool' }], stateMutability: 'nonpayable', type: 'function' },
    { inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }], name: 'allowance', outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view', type: 'function' },
    { inputs: [{ name: 'account', type: 'address' }], name: 'balanceOf', outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view', type: 'function' },
  ];
  const tC = await tw.contract(tAbi, TOKEN);
  const tokenBal = await tC.balanceOf(ownerHex).call();
  const tDec = 6;
  console.log(`[${now()}] Token balance: ${(Number(tokenBal)/10**tDec).toFixed(4)}`);

  const wtrxC = await tw.contract(tAbi, WTRX);
  const wtrxBal = await wtrxC.balanceOf(ownerHex).call();
  console.log(`[${now()}] WTRX balance: ${(Number(wtrxBal)/1e6).toFixed(4)}`);

  if (Number(tokenBal) < 1 * 10**tDec) {
    console.error('Need at least 1 token');
    process.exit(1);
  }

  // Approve SwapRouter to spend our tokens
  const routerHex = tw.address.toHex(SWAP_ROUTER);
  const allowance = await tC.allowance(ownerHex, routerHex).call();
  if (BigInt(allowance) < 1_000_000n * 10n**BigInt(tDec)) {
    console.log(`[${now()}] Approving SwapRouter...`);
    const tx = await tC.approve(routerHex, '100000000000000').send({ shouldPollResponse: true, feeLimit: 100_000_000 });
    console.log(`[${now()}] approve: ${tx}`);
    await new Promise(r => setTimeout(r, 5000));
  }

  // V3 SwapRouter exactInputSingle
  const routerAbi = [{
    inputs: [{
      components: [
        { name: 'tokenIn', type: 'address' },
        { name: 'tokenOut', type: 'address' },
        { name: 'fee', type: 'uint24' },
        { name: 'recipient', type: 'address' },
        { name: 'deadline', type: 'uint256' },
        { name: 'amountIn', type: 'uint256' },
        { name: 'amountOutMinimum', type: 'uint256' },
        { name: 'sqrtPriceLimitX96', type: 'uint160' },
      ], name: 'params', type: 'tuple',
    }],
    name: 'exactInputSingle', outputs: [{ name: 'amountOut', type: 'uint256' }],
    stateMutability: 'payable', type: 'function',
  }];
  const router = await tw.contract(routerAbi, SWAP_ROUTER);

  // We'll swap 1 TOKEN for WTRX
  const amountIn = (1n * 10n**BigInt(tDec)).toString(); // 1 TOKEN
  const amountOutMin = '1'; // accept almost nothing (Nile testnet, just verifying it works)
  const deadline = Math.floor(Date.now() / 1000) + 3600;

  console.log(`\n[${now()}] Swapping 1 TOKEN → WTRX via exactInputSingle...`);
  console.log(`[${now()}] tokenIn: ${TOKEN}, tokenOut: ${WTRX}, fee: ${FEE_TIER}`);

  // token0 = TOKEN, token1 = WTRX from our setup (TOKEN < WTRX hex)
  const token0Hex = tw.address.toHex(TOKEN).toLowerCase();
  const wtrxHex = tw.address.toHex(WTRX).toLowerCase();
  const tokenIn = token0Hex < wtrxHex ? tw.address.toHex(TOKEN) : tw.address.toHex(WTRX);
  const tokenOut = token0Hex < wtrxHex ? tw.address.toHex(WTRX) : tw.address.toHex(TOKEN);

  const params = [
    tokenIn,
    tokenOut,
    FEE_TIER,
    ownerHex,
    deadline,
    amountIn,
    amountOutMin,
    '0', // sqrtPriceLimitX96 = 0 (no limit)
  ];

  console.log(`[${now()}] Params: tokenIn(${tw.address.fromHex(tokenIn)}) → tokenOut(${tw.address.fromHex(tokenOut)}), amountIn=${amountIn}`);

  const tx = await router.exactInputSingle(params)
    .send({ shouldPollResponse: true, feeLimit: 300_000_000 });

  console.log(`[${now()}] Swap TX: ${JSON.stringify(tx)}`);

  // Check final balances
  await new Promise(r => setTimeout(r, 10000));
  const finalTokenBal = await tC.balanceOf(ownerHex).call();
  const finalWtrxBal = await wtrxC.balanceOf(ownerHex).call();
  console.log(`\n[${now()}] Final balances:`);
  console.log(`[${now()}] Token: ${(Number(finalTokenBal)/10**tDec).toFixed(4)} (was ${(Number(tokenBal)/10**tDec).toFixed(4)})`);
  console.log(`[${now()}] WTRX:  ${(Number(finalWtrxBal)/1e6).toFixed(4)} (was ${(Number(wtrxBal)/1e6).toFixed(4)})`);
  console.log(`[${now()}] ✅ Swap test complete!`);
}

main().catch(e => console.error('Fatal:', JSON.stringify(e?.message || e?.error || e || '?').substring(0, 500)));
