const { task } = require("hardhat/config");

task("presale:info", "Prints presale config & state")
  .addParam("address", "Presale contract address")
  .setAction(async (args, hre) => {
    const p = await hre.ethers.getContractAt("EXWIFEPresale", args.address);
    const [token, treasury, priceWeiPerToken, minBuyWei, openingTime, closingTime, finalized, raisedWei, sold] =
      await Promise.all([
        p.token(),
        p.treasury(),
        p.priceWeiPerToken(),
        p.minBuyWei(),
        p.openingTime(),
        p.closingTime(),
        p.finalized(),
        p.totalRaisedWei().catch(()=>0n),
        p.totalSoldTokens().catch(()=>0n),
      ]);

    const fmt = (w)=>hre.ethers.formatEther(w);
    const toISO = (s)=> new Date(Number(s)*1000).toISOString();

    console.log("Presale      :", args.address);
    console.log("Token        :", token);
    console.log("Treasury     :", treasury);
    console.log("Price (ETH/t):", fmt(priceWeiPerToken));
    console.log("Rate (t/ETH) :", (1n*10n**18n)/priceWeiPerToken);
    console.log("Min (ETH)    :", fmt(minBuyWei));
    console.log("Open (UTC)   :", toISO(openingTime));
    console.log("Close (UTC)  :", toISO(closingTime));
    console.log("Finalized    :", finalized);
    console.log("Raised (ETH) :", fmt(raisedWei||0n));
    console.log("Sold (tokens):", sold.toString());
  });

