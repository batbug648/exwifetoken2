const { ethers } = require("hardhat");

async function main() {
  // Known values from your project memory
  const TOKEN = process.env.EXWIFE_TOKEN || "0x0cF3EcA1AA8f4BCc10D51C8f4e75C17667D8Af07";
  const TREASURY = process.env.TREASURY || "0x4799d7Bf70371A396E3415336DD821586A72D37e";

  // Params — adjust RATE if you want a different token/ETH price
  const RATE_TOKENS_PER_ETH = process.env.RATE || ethers.parseUnits("1000000", 0).toString(); // 1,000,000 tokens / ETH
  const GOAL_ETH = process.env.GOAL_ETH || "1200";
  const CAP_ETH  = process.env.CAP_ETH  || "10000";

  const now = Math.floor(Date.now()/1000);
  const openAt  = now + 5*60;           // open in 5 minutes
  const closeAt = openAt + 30*86400;    // +30 days

  const goalWei = ethers.parseEther(GOAL_ETH.toString());
  const capWei  = ethers.parseEther(CAP_ETH.toString());

  console.log("Deploying ExwifePresaleV2 with:");
  console.log({ TOKEN, TREASURY, RATE_TOKENS_PER_ETH, openAt, closeAt, goalWei: goalWei.toString(), capWei: capWei.toString() });

  const F = await ethers.getContractFactory("ExwifePresaleV2");
  const c = await F.deploy(
    TOKEN,
    TREASURY,
    RATE_TOKENS_PER_ETH,
    openAt,
    closeAt,
    capWei,
    goalWei
  );
  console.log("tx:", c.deploymentTransaction().hash);
  await c.waitForDeployment();
  const addr = await c.getAddress();
  console.log("✓ Deployed ExwifePresaleV2 at:", addr);

  // echo minimal ABI methods your front-end uses
  console.log("ABI methods available: paused(), buy() payable, totalRaisedWei(), weiRaised(), isOpen(), openAt(), closeAt()");
}

main().catch((e) => { console.error(e); process.exit(1); });
