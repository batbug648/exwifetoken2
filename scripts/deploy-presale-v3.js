const { ethers } = require("hardhat");
async function main() {
  const TOKEN = process.env.EXWIFE_TOKEN;
  const TREASURY = process.env.TREASURY;

  // Correct scaling: smallest token units per 1 ETH (token has 18 decimals)
  const RATE_TOKENS_PER_ETH = ethers.parseUnits("1000000", 18).toString(); // 1,000,000 * 10^18

  const GOAL_ETH = process.env.GOAL_ETH || "1200";
  const CAP_ETH  = process.env.CAP_ETH  || "10000";

  const now = Math.floor(Date.now()/1000);
  const openAt  = now + 5*60;        // open in ~5 min
  const closeAt = openAt + 30*86400; // +30 days

  const goalWei = ethers.parseEther(GOAL_ETH);
  const capWei  = ethers.parseEther(CAP_ETH);

  console.log("Deploying v3 with scaled rate:", RATE_TOKENS_PER_ETH);
  const F = await ethers.getContractFactory("ExwifePresaleV2");
  const c = await F.deploy(TOKEN, TREASURY, RATE_TOKENS_PER_ETH, openAt, closeAt, capWei, goalWei);
  console.log("tx:", c.deploymentTransaction().hash);
  await c.waitForDeployment();
  console.log("✓ Deployed v3 at:", await c.getAddress());
}
main().catch(e=>{console.error(e);process.exit(1);});
