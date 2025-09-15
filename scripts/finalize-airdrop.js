const { ethers } = require("hardhat");
require("dotenv").config();
const d = require("../deployments/sepolia.json");

const AIRDROP_TO = process.env.AIRDROP_TO || "0x4799d7Bf70371A396E3415336DD821586A72D37e";
const AIRDROP_AMOUNT = "10000000"; // 10,000,000

async function main() {
  const [owner] = await ethers.getSigners();
  console.log("Owner (deployer):", owner.address);
  console.log("Airdrop target:", AIRDROP_TO);

  // Contracts
  const ps = await ethers.getContractAt("EXWIFEPresale", d.presale);
  const tk = await ethers.getContractAt("EXWIFE", d.token);

  // 1) Finalize presale (sends ETH to treasury when 'true')
  const isFinalized = await ps.finalized();
  if (!isFinalized) {
    console.log("Finalizing sale and sending raised ETH to treasury...");
    const txF = await ps.finalize(true);
    await txF.wait();
    console.log("Finalized.");
  } else {
    console.log("Already finalized, skipping.");
  }

  // 2) Airdrop 10,000,000 via presale (it has MINTER_ROLE)
  const amount = ethers.parseUnits(AIRDROP_AMOUNT, 18);
  console.log(`Airdropping ${AIRDROP_AMOUNT} EXWIFE to ${AIRDROP_TO} ...`);
  const txA = await ps.airdrop(AIRDROP_TO, amount);
  await txA.wait();
  console.log("Airdrop complete.");

  // 3) Show resulting balance (human-readable)
  const bal = await tk.balanceOf(AIRDROP_TO);
  console.log("Recipient EXWIFE balance:", ethers.formatUnits(bal, 18));
}

main().catch((e) => { console.error(e); process.exit(1); });

