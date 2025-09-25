const hre = require("hardhat");
const PRESALE = "0xF4A37B656A33d418FB37280c9304274078A9b3ed";
async function main() {
  const [owner] = await hre.ethers.getSigners();
  console.log("Owner:", await owner.getAddress());
  const p = await hre.ethers.getContractAt("EXWIFEPresale", PRESALE, owner);
  const tx = await p.finalize(true);
  console.log("Finalize tx:", tx.hash);
  const r = await tx.wait();
  console.log("Mined in block", r.blockNumber);
}
main().catch(e => { console.error(e); process.exit(1); });
