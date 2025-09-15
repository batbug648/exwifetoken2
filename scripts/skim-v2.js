const { ethers } = require("hardhat");
async function main(){
  const presale = process.env.PRESALE_ADDR;
  const token   = process.env.EXWIFE_TOKEN;
  const [s] = await ethers.getSigners();
  const erc20 = new ethers.Contract(token, ["function balanceOf(address) view returns(uint256)"], s);
  const c = new ethers.Contract(presale, ["function skimTokens(uint256)","function paused() view returns (bool)"], s);
  const bal = await erc20.balanceOf(presale);
  console.log("presale token balance:", bal.toString());
  if (bal == 0n) { console.log("nothing to skim"); return; }
  const tx = await c.skimTokens(bal);
  console.log("skim tx:", tx.hash); await tx.wait();
  console.log("✓ skim complete");
}
main().catch(e=>{console.error(e);process.exit(1);});
