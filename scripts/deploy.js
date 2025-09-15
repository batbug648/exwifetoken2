const hre = require("hardhat");

async function main() {
  // === YOUR PARAMS ===
  const TOKEN         = "0x0cF3EcA1AA8f4BCc10D51C8f4e75C17667D8Af07";       // EXWIFE token (must allow presale to mint)
  const TREASURY      = "0x4799d7Bf70371A396E3415336DD821586A72D37e";      // your wallet
  const PRICE_WEI     = 100000000000n;                                      // 1e11 wei per token
  const MIN_BUY_WEI   = 10000000000000000n;                                 // 0.01 ETH
  const now           = Math.floor(Date.now() / 1000);
  const OPENING_TIME  = now + 120;                                          // opens in ~2 minutes
  const CLOSING_TIME  = OPENING_TIME + 7 * 24 * 3600;                       // open 7 days
  const INITIAL_OWNER = "0x4799d7Bf70371A396E3415336DD821586A72D37e";      // contract owner (pause/finalize)

  console.log("Deploying presale with:", {
    TOKEN, TREASURY,
    PRICE_WEI: PRICE_WEI.toString(),
    MIN_BUY_WEI: MIN_BUY_WEI.toString(),
    OPENING_TIME, CLOSING_TIME,
    INITIAL_OWNER
  });

  const Presale = await hre.ethers.getContractFactory("EXWIFEPresale");
  const presale = await Presale.deploy(
    TOKEN,
    TREASURY,
    PRICE_WEI,
    MIN_BUY_WEI,
    OPENING_TIME,
    CLOSING_TIME,
    INITIAL_OWNER
  );
  await presale.waitForDeployment();
  const addr = await presale.getAddress();
  console.log("✅ Presale deployed to:", addr);
  console.log("   Opening:", OPENING_TIME, "Closing:", CLOSING_TIME);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

