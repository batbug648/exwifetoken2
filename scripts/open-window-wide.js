const { ethers } = require("hardhat");

async function main() {
  const addr = process.env.PRESALE_ADDRESS || process.argv[2];
  if (!addr) throw new Error("Usage: PRESALE_ADDRESS=0x... npx hardhat run scripts/open-window-wide.js --network sepolia");

  const [signer] = await ethers.getSigners();
  const c = new ethers.Contract(addr, [
    // reads
    "function paused() view returns (bool)",
    "function isOpen() view returns (bool)",
    "function openAt() view returns (uint256)",
    "function closeAt() view returns (uint256)",
    // candidate writers seen in the wild:
    "function configure(uint64,uint64)",
    "function setWindow(uint256,uint256)",
    "function setOpen(bool)",
    "function setTimes(uint256,uint256)",
    "function setSaleWindow(uint256,uint256)",
    "function setOpeningTime(uint256)",
    "function setClosingTime(uint256)",
    "function extend(uint64)",
    "function extendTime(uint256)"
  ], signer);

  const now = Math.floor(Date.now()/1000);
  const openTs  = now + 5*60;           // open in 5 minutes (avoid "must be future" checks)
  const closeTs = openTs + 30*86400;    // keep open ~30 days

  const candidates = [
    {label:"configure(uint64,uint64)", fn:"configure", args:[openTs, closeTs]},
    {label:"setWindow(uint256,uint256)", fn:"setWindow", args:[openTs, closeTs]},
    {label:"setTimes(uint256,uint256)", fn:"setTimes", args:[openTs, closeTs]},
    {label:"setSaleWindow(uint256,uint256)", fn:"setSaleWindow", args:[openTs, closeTs]},
    {label:"setOpeningTime(uint256)", fn:"setOpeningTime", args:[openTs]},
    {label:"setClosingTime(uint256)", fn:"setClosingTime", args:[closeTs]},
    {label:"extend(uint64)", fn:"extend", args:[(30*86400)]},          // add 30 days
    {label:"extendTime(uint256)", fn:"extendTime", args:[(30*86400)]},  // add 30 days
    {label:"setOpen(true)", fn:"setOpen", args:[true]},                 // last resort toggle
  ];

  const fmt = (ts) => ts ? `${ts}  ${new Date(ts*1000).toISOString()}` : "n/a";

  const safeRead = async (name) => {
    try { return await c[name](); } catch { return null; }
  };

  console.log("Presale:", addr);
  const [oa0, ca0, paused0, isOpen0] = await Promise.all([
    safeRead("openAt"),
    safeRead("closeAt"),
    safeRead("paused"),
    safeRead("isOpen")
  ]);
  if (oa0 !== null) console.log(" current openAt:", fmt(Number(oa0)));
  if (ca0 !== null) console.log(" current closeAt:", fmt(Number(ca0)));
  if (paused0 !== null) console.log(" paused:", paused0);
  if (isOpen0 !== null) console.log(" isOpen:", isOpen0);

  const tryTx = async ({label, fn, args}) => {
    if (typeof c[fn] !== "function") { console.log(`· ${label}: not present`); return false; }
    try {
      const tx = await c[fn](...args);
      console.log(`✓ ${label} sent:`, tx.hash);
      await tx.wait();
      console.log(`✓ ${label} confirmed`);
      return true;
    } catch (e) {
      console.log(`✗ ${label} failed:`, e.shortMessage || e.message);
      return false;
    }
  };

  let success = false;
  for (const cand of candidates) {
    success = await tryTx(cand);
    if (success) break;
  }

  const [oa, ca, paused1, isOpen1] = await Promise.all([
    safeRead("openAt"),
    safeRead("closeAt"),
    safeRead("paused"),
    safeRead("isOpen")
  ]);
  if (oa !== null) console.log(" final openAt:", fmt(Number(oa)));
  if (ca !== null) console.log(" final closeAt:", fmt(Number(ca)));
  if (paused1 !== null) console.log(" paused:", paused1);
  if (isOpen1 !== null) console.log(" isOpen:", isOpen1);

  if (!success) {
    console.log("\nResult: none of the common setter methods worked. This likely means the window is immutable post-deploy. In that case, we must deploy a new presale with fresh dates and point the front-end to it.");
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
