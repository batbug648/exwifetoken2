const { ethers } = require("hardhat");
async function main(){
  const addr = process.env.PRESALE_ADDR;
  if (!addr) throw new Error("Set PRESALE_ADDR=0x...");
  const [s] = await ethers.getSigners();
  const c = new ethers.Contract(addr, ["function setPaused(bool)","function paused() view returns (bool)"], s);
  const tx = await c.setPaused(true);
  console.log("pause tx:", tx.hash); await tx.wait();
  console.log("paused:", await c.paused());
}
main().catch(e=>{console.error(e);process.exit(1);});
