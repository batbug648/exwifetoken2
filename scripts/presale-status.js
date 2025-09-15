const { ethers } = require("hardhat");

async function main() {
  const addr = process.env.PRESALE_NEW;
  if (!addr) throw new Error("Set PRESALE_NEW=0x...");

  const [s] = await ethers.getSigners();
  const c = new ethers.Contract(addr, [
    "function paused() view returns (bool)",
    "function isOpen() view returns (bool)",
    "function openAt() view returns (uint256)",
    "function closeAt() view returns (uint256)",
    "function weiRaised() view returns (uint256)"
  ], s);

  const [paused, isOpen, oa, ca, raised] = await Promise.all([
    c.paused(),
    c.isOpen(),
    c.openAt(),
    c.closeAt(),
    c.weiRaised()
  ]);

  const fmt = (ts) => `${ts}  ${new Date(Number(ts) * 1000).toISOString()}`;

  console.log({
    paused,
    isOpen,
    openAt: fmt(oa),
    closeAt: fmt(ca),
    weiRaised: raised.toString()
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
