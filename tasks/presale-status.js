const { task } = require("hardhat/config");
const { formatEther } = require("ethers");

task("presale:status", "Print presale status")
  .addOptionalParam("address", "Presale contract address (defaults to ENV)")
  .setAction(async (args, hre) => {
    const addr = args.address || process.env.PRESALE_ADDRESS || process.env.EXWIFE_PRESALE;
    if (!addr) throw new Error("No presale address. Use --address or set PRESALE_ADDRESS.");

    const abi = [
      "function paused() view returns (bool)",
      "function totalRaisedWei() view returns (uint256)",
      "function weiRaised() view returns (uint256)",
      "function openingTime() view returns (uint256)",
      "function closingTime() view returns (uint256)",
      "function cap() view returns (uint256)",
      "function goal() view returns (uint256)",
      "function rate() view returns (uint256)"
    ];

    const presale = await hre.ethers.getContractAt(abi, addr);

    const paused = await presale.paused().catch(()=>false);
    const now = Math.floor(Date.now()/1000);

    async function u64(fn) {
      try { return await presale[fn](); } catch { return null; }
    }

    const totalRaised = await u64("totalRaisedWei") ?? await u64("weiRaised");
    const cap         = await u64("cap");
    const goal        = await u64("goal");
    const rate        = await u64("rate");
    const open        = await u64("openingTime");
    const close       = await u64("closingTime");

    const raisedEth = totalRaised ? Number(formatEther(totalRaised)) : NaN;
    const capEth    = cap        ? Number(formatEther(cap)) : NaN;
    const goalEth   = goal       ? Number(formatEther(goal)) : NaN;

    function pct(n, d){ return (isFinite(n)&&isFinite(d)&&d>0) ? ((n/d)*100).toFixed(2)+"%" : "n/a"; }

    console.log("Presale:", addr);
    console.log(" paused:", paused);
    console.log(" raised:", isFinite(raisedEth) ? `${raisedEth} ETH` : "n/a");
    console.log("   goal:", isFinite(goalEth) ? `${goalEth} ETH` : "n/a", "(", pct(raisedEth, goalEth), ")");
    console.log("    cap:", isFinite(capEth)  ? `${capEth} ETH`  : "n/a", "(", pct(raisedEth, capEth),  ")");
    console.log("   rate:", rate ? rate.toString() : "n/a", "tokens/ETH");
    console.log(" opening:", open ? new Date(Number(open)*1000).toISOString() : "n/a");
    console.log(" closing:", close? new Date(Number(close)*1000).toISOString() : "n/a");
    console.log("   now  :", new Date(now*1000).toISOString());
    console.log(" status:", (open&&close) ? (now<Number(open)?"NOT OPEN":(now>Number(close)?"CLOSED":"OPEN")) : "UNKNOWN");
  });

