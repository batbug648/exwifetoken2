const hre = require("hardhat");
const PRESALE = "0xF4A37B656A33d418FB37280c9304274078A9b3ed";
async function readOnce() {
  const [s] = await hre.ethers.getSigners();
  const p = await hre.ethers.getContractAt("EXWIFEPresale", PRESALE, s);
  const wei = await p.totalRaisedWei().catch(async()=>{ try { return await p.weiRaised(); } catch { return 0n; }});
  const eth = Number(hre.ethers.formatEther(wei));
  let rate = 100000;
  try { rate = Number((await p.rate()).toString()); } catch {}
  const sold = Math.floor(eth * rate);
  console.log(new Date().toISOString(), "raised:", eth, "ETH | sold:", sold, "tokens");
}
async function main(){ await readOnce(); setInterval(readOnce, 20000); }
main().catch(e => { console.error(e); process.exit(1); });
