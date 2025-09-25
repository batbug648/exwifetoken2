const { task } = require("hardhat/config");
const { ethers } = require("ethers");

const PRESALE_ABI_MIN = [
  "function buy() payable",
  "function totalRaisedWei() view returns (uint256)",
  "function weiRaised() view returns (uint256)"
];

function fmtETH(wei){ try { return ethers.formatEther(wei); } catch { return "0"; } }

async function getRaisedWithFallbacks(contract, provider){
  try { const r = await contract.totalRaisedWei(); return { wei:r, source:"totalRaisedWei()" }; } catch {}
  try { const r = await contract.weiRaised();      return { wei:r, source:"weiRaised()" };      } catch {}
  try { const b = await provider.getBalance(contract.target); return { wei:b, source:"balanceOf(contract)" }; } catch {}
  return { wei:0n, source:"unknown" };
}

async function getAnySigner(hre){
  try { const ss = await hre.ethers.getSigners?.(); if (ss?.length) return ss[0]; } catch {}
  const p = await hre.ethers.provider;
  return ethers.Wallet.createRandom().connect(p);
}

async function tryStaticBuy(contract, signer, valueWei){
  try {
    await contract.connect(signer).buy.staticCall({ value: valueWei });
    return { ok:true, reason:null };
  } catch (e) {
    const reason = e?.reason || e?.error?.reason || e?.shortMessage || e?.info?.error?.message || e?.message || null;
    return { ok:false, reason };
  }
}

task("presale:status", "Prints presale OPEN/CLOSED, raised, and min contribution probe")
  .addParam("address", "Presale contract address")
  .setAction(async (args, hre) => {
    const provider = hre.ethers.provider;
    const net = await provider.getNetwork();
    const chainId = Number(net.chainId ?? 0);
    let chainName = net.name || "";
    if (chainId === 1) chainName = "mainnet";
    if (chainId === 11155111) chainName = "sepolia";

    const c = new hre.ethers.Contract(args.address, PRESALE_ABI_MIN, provider);
    const raised = await getRaisedWithFallbacks(c, provider);

    const signer = await getAnySigner(hre);
    const PROBE_VALUES = [
      0n,
      10n**9n,      // 1 gwei
      10n**12n,     // 1e3 gwei
      10n**15n,     // 0.001 ETH
      5n*10n**15n,  // 0.005 ETH
      10n**16n,     // 0.01 ETH
      5n*10n**16n,  // 0.05 ETH
      10n**17n      // 0.1 ETH
    ];

    let open=false, minOk=null, lastReason=null;
    for (const v of PROBE_VALUES){
      const { ok, reason } = await tryStaticBuy(c, signer, v);
      if (ok){ open=true; minOk=v; break; }
      lastReason = reason;
      if (reason && /not\s*open/i.test(reason)) { open=false; break; }
    }

    const line=(k,v)=>console.log(`${k.padEnd(18," ")} ${v}`);
    console.log("────────────────────────────────────────────────────────────");
    line("Network", `${chainName} (chainId ${chainId})`);
    line("Presale", args.address);
    line("Raised (ETH)", fmtETH(raised.wei));
    line("Raised source", raised.source);

    if (open){
      line("Status", "OPEN");
      if (minOk === 0n) line("Min contribution","0");
      else if (minOk !== null) line("Min contribution", `${fmtETH(minOk)} ETH (first passing probe)`);
      else line("Min contribution", ">= probe max (increase ladder)");
      console.log("────────────────────────────────────────────────────────────");
      process.exit(0);
    } else {
      line("Status", "CLOSED");
      if (lastReason) line("Last reason", lastReason);
      console.log("────────────────────────────────────────────────────────────");
      process.exit(2);
    }
  });

module.exports = {};
