const { ethers } = require("hardhat");

async function main() {
  const addr = process.env.PRESALE_ADDRESS || process.argv[2];
  if (!addr) throw new Error("Usage: PRESALE_ADDRESS=0x... npx hardhat run scripts/open-window.js --network sepolia");

  const [signer] = await ethers.getSigners();
  const c = new ethers.Contract(addr, [
    "function paused() view returns (bool)",
    "function isOpen() view returns (bool)",
    "function openAt() view returns (uint256)",
    "function closeAt() view returns (uint256)",
    // possible writers
    "function configure(uint64 openAt, uint64 closeAt)",
    "function setWindow(uint256 openAt, uint256 closeAt)",
    "function setOpen(bool on)"
  ], signer);

  const now = Math.floor(Date.now()/1000);
  const openTs  = now + 5*60;           // open in 5 minutes
  const closeTs = openTs + 30*86400;    // +30 days

  const fmt = (ts) => `${ts}  ${new Date(ts*1000).toISOString()}`;

  console.log("Presale:", addr);
  try {
    const [oa, ca] = await Promise.all([
      c.openAt().catch(()=>null),
      c.closeAt().catch(()=>null),
    ]);
    if (oa != null) console.log("current openAt :", fmt(Number(oa)));
    if (ca != null) console.log("current closeAt:", fmt(Number(ca)));
  } catch {}

  // Try configure(uint64,uint64)
  const tryCall = async (label, fn, ...args) => {
    try {
      const tx = await c[fn](...args);
      console.log(`${label} tx:`, tx.hash);
      await tx.wait();
      console.log(`✓ ${label} succeeded`);
      return true;
    } catch (e) {
      console.log(`✗ ${label} failed:`, e.shortMessage || e.message);
      return false;
    }
  };

  let ok = false;
  ok ||= await tryCall("configure(uint64,uint64)", "configure", openTs, closeTs);
  if (!ok) ok ||= await tryCall("setWindow(uint256,uint256)", "setWindow", openTs, closeTs);

  // as a last resort, toggle boolean open if present
  if (!ok) {
    // if open is in the future, setOpen(true) may still be rejected by some contracts;
    // but we try in case the contract only uses a boolean gate.
    ok ||= await tryCall("setOpen(true)", "setOpen", true);
  }

  // Final readback
  try {
    const paused = await c.paused().catch(()=>null);
    const isOpen = await c.isOpen().catch(()=>null);
    const [oa2, ca2] = await Promise.all([
      c.openAt().catch(()=>null),
      c.closeAt().catch(()=>null),
    ]);
    if (paused !== null) console.log("paused:", paused);
    if (oa2 !== null) console.log("openAt :", fmt(Number(oa2)));
    if (ca2 !== null) console.log("closeAt:", fmt(Number(ca2)));
    if (isOpen !== null) console.log("isOpen:", isOpen);
  } catch (e) {
    console.log("Readback failed:", e.message);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
