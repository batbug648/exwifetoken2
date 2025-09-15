const hre = require("hardhat");

async function main() {
  const ADMIN = "0x4799d7Bf70371A396E3415336DD821586A72D37e"; // your wallet (admin/minter)
  const Token = await hre.ethers.getContractFactory("EXWIFE");
  const token = await Token.deploy("EXWIFE", "EXWIFE", ADMIN);
  await token.waitForDeployment();
  console.log("✅ Token deployed:", await token.getAddress());
}

main().catch((e)=>{ console.error(e); process.exit(1); });

