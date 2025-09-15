task("presale:window", "Get or set the presale open/close window")
  .addOptionalParam("address", "Presale address")
  .addOptionalParam("open", "Open time (unix or ISO, e.g., 2025-09-12T15:00:00Z or +10m or now)")
  .addOptionalParam("close", "Close time (unix or ISO, e.g., +30d or 2025-10-12T00:00:00Z)")
  .setAction(async (args, hre) => {
    const { ethers } = hre;
    const addr = args.address || process.env.PRESALE_ADDRESS;
    if (!addr) throw new Error("No address provided. Use --address 0x... or set PRESALE_ADDRESS.");

    const parseTime = (s) => {
      if (!s) return null;
      if (s === "now") return Math.floor(Date.now()/1000);
      if (/^\+\d+[smhdw]$/.test(s)) {
        const n = parseInt(s.slice(1), 10);
        const unit = s.slice(-1);
        const mult = { s:1, m:60, h:3600, d:86400, w:604800 }[unit];
        return Math.floor(Date.now()/1000) + n*mult;
      }
      if (/^\+\d+30d$/.test(s)) {
        return Math.floor(Date.now()/1000) + (30*86400);
      }
      if (/^\d{10}$/.test(s)) return parseInt(s,10);
      const t = Math.floor(Date.parse(s)/1000);
      if (isNaN(t)) throw new Error(`Bad time: ${s}`);
      return t;
    };

    const ABI = [
      "function paused() view returns (bool)",
      "function isOpen() view returns (bool)",
      "function openAt() view returns (uint256)",
      "function closeAt() view returns (uint256)",
      "function setWindow(uint256 openAt, uint256 closeAt)",
      "function configure(uint64 openAt, uint64 closeAt)",
      "function setOpen(bool on)"
    ];

    const [signer] = await ethers.getSigners();
    const c = new ethers.Contract(addr, ABI, signer);

    const safeRead = async (fn, def=null) => { try { return await c[fn](); } catch { return def; } };

    const paused = await safeRead("paused", null);
    const isOpen = await safeRead("isOpen", null);
    const oa = await safeRead("openAt", null);
    const ca = await safeRead("closeAt", null);
    const now = Math.floor(Date.now()/1000);

    console.log("Presale:", addr);
    if (paused !== null) console.log(" paused:", paused);
    if (oa !== null) console.log(" openAt:", oa, oa?new Date(oa*1000).toISOString():"");
    if (ca !== null) console.log(" closeAt:", ca, ca?new Date(ca*1000).toISOString():"");
    if (isOpen !== null) console.log(" isOpen:", isOpen);

    if (!args.open && !args.close) return;

    const openTs  = args.open  ? parseTime(args.open)  : (oa ?? now);
    const closeTs = args.close ? parseTime(args.close) : (ca ?? (now + 30*86400));
    if (closeTs <= openTs) throw new Error("close must be after open");

    let tx;
    if (c.setWindow) {
      tx = await c.setWindow(openTs, closeTs);
      console.log("setWindow tx:", tx.hash);
    } else if (c.configure) {
      tx = await c.configure(openTs, closeTs);
      console.log("configure tx:", tx.hash);
    } else if (c.setOpen) {
      const on = now >= openTs && now < closeTs;
      tx = await c.setOpen(on);
      console.log(`setOpen(${on}) tx:`, tx.hash);
    } else {
      throw new Error("No recognized window writer (setWindow/configure/setOpen) on contract.");
    }
    await tx.wait();
    console.log("✓ Window updated.");

    const oa2 = await safeRead("openAt", null);
    const ca2 = await safeRead("closeAt", null);
    const isOpen2 = await safeRead("isOpen", null);
    if (oa2 !== null) console.log(" openAt:", oa2, oa2?new Date(oa2*1000).toISOString():"");
    if (ca2 !== null) console.log(" closeAt:", ca2, ca2?new Date(ca2*1000).toISOString():"");
    if (isOpen2 !== null) console.log(" isOpen:", isOpen2);
  });
