const hre = require("hardhat");
const PRESALE = "0xF4A37B656A33d418FB37280c9304274078A9b3ed";
async function main() {
  const [buyer] = await hre.ethers.getSigners();
  console.log("Buyer:", await buyer.getAddress());
  const presale = await hre.ethers.getContractAt("EXWIFEPresale", PRESALE, buyer);
  const tx = await presale.buy({ value: hre.ethers.parseEther("0.0011") });
  console.log("Tx:", tx.hash);
  const r = await tx.wait();
  console.log("Mined in block", r.blockNumber);
}
main().catch(e => { console.error(e); process.exit(1); });
