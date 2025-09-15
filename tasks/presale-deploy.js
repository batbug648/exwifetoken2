const { task } = require("hardhat/config");
require("dotenv").config();
const fs = require("fs");
const path = require("path");

function req(name){
  const v = process.env[name];
  if (!v || !v.trim()) throw new Error(`Missing ${name} in .env`);
  return v.trim();
}
function opt(name, defv=""){
  const v = process.env[name];
  return (v && v.trim()) ? v.trim() : defv;
}

task("deploy:presale","Deploy EXWIFEPresale with args from .env (JS)")
  .addFlag("dry","Only show parsed args (no deploy)")
  .setAction(async (args, hre) => {
    await hre.run("compile");
    const { ethers } = hre;

    // Constructor order:
    // 0 _token (address)
    // 1 _treasury (address)
    // 2 _priceWeiPerToken (uint256)
    // 3 _minBuyWei (uint256)
    // 4 _openingTime (uint64)
    // 5 _closingTime (uint64)
    // 6 initialOwner (address)

    const token     = req("PRESALE_TOKEN");
    const treasury  = req("PRESALE_TREASURY");
    const priceWeiPerToken = BigInt(req("PRESALE_PRICE_WEI_PER_TOKEN"));
    const minBuyWei        = BigInt(req("PRESALE_MIN_BUY_WEI"));
    const opening          = BigInt(req("PRESALE_OPENING"));
    const closing          = BigInt(req("PRESALE_CLOSING"));
    const owner            = opt("PRESALE_OWNER", (await hre.ethers.getSigners())[0].address);

    const deployArgs = [
      token,
      treasury,
      priceWeiPerToken,
      minBuyWei,
      opening,
      closing,
      owner
    ];

    console.log("Deploy args:", {
      token, treasury,
      priceWeiPerToken: priceWeiPerToken.toString(),
      minBuyWei:        minBuyWei.toString(),
      opening:          opening.toString(),
      closing:          closing.toString(),
      owner
    });

    if (args.dry) return;

    const F = await ethers.getContractFactory("EXWIFEPresale");
    const c = await F.deploy(...deployArgs);
    await c.waitForDeployment();
    const address = await c.getAddress();
    console.log("✅ Deployed EXWIFEPresale at:", address);

    // Write breadcrumb with BigInt-safe JSON
    const out = { address, network: hre.network.name, time: Date.now(), deployArgs };
    const replacer = (_k, v) => (typeof v === "bigint" ? v.toString() : v);
    fs.writeFileSync(
      path.join(process.cwd(), ".last-presale.json"),
      JSON.stringify(out, replacer, 2)
    );
  });

