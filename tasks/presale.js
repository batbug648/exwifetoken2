const { task } = require("hardhat/config");

function getAddr(a) {
  return (
    a.address ||
    process.env.PRESALE_ADDRESS ||
    (() => { throw new Error("Set --address or PRESALE_ADDRESS"); })()
  );
}

/* ========== pause / unpause (uses setPaused(bool)) ========== */
task("presale:pause", "Pause the presale")
  .addOptionalParam("address", "Presale address")
  .setAction(async (a, hre) => {
    const ps = await hre.ethers.getContractAt("EXWIFEPresale", getAddr(a));
    const [o] = await hre.ethers.getSigners();
    if ((await ps.owner()).toLowerCase() !== o.address.toLowerCase()) throw new Error("Signer not owner");
    const tx = await ps.connect(o).setPaused(true);
    console.log("setPaused(true) tx:", tx.hash);
    await tx.wait();
    console.log("paused:", await ps.paused());
  });

task("presale:unpause", "Unpause the presale")
  .addOptionalParam("address", "Presale address")
  .setAction(async (a, hre) => {
    const ps = await hre.ethers.getContractAt("EXWIFEPresale", getAddr(a));
    const [o] = await hre.ethers.getSigners();
    if ((await ps.owner()).toLowerCase() !== o.address.toLowerCase()) throw new Error("Signer not owner");
    const tx = await ps.connect(o).setPaused(false);
    console.log("setPaused(false) tx:", tx.hash);
    await tx.wait();
    console.log("paused:", await ps.paused());
  });

/* ========== finalize (your ABI requires a boolean) ========== */
task("presale:finalize", "Finalize the presale (calls finalize(true))")
  .addOptionalParam("address", "Presale address")
  .setAction(async (a, hre) => {
    const ps = await hre.ethers.getContractAt("EXWIFEPresale", getAddr(a));
    const [o] = await hre.ethers.getSigners();
    if ((await ps.owner()).toLowerCase() !== o.address.toLowerCase()) throw new Error("Signer not owner");

    const tx = await ps.connect(o).finalize(true); // bool required by your ABI
    console.log("finalize(true) tx:", tx.hash);
    await tx.wait();

    try { console.log("finalized():", await ps.finalized()); } catch {}
    const bal = await hre.ethers.provider.getBalance(ps.target);
    console.log("Contract balance (ETH):", hre.ethers.formatEther(bal));
  });

/* ========== airdrop (human units -> wei) ========== */
task("presale:airdrop", "Airdrop tokens via presale")
  .addParam("to", "Recipient address")
  .addParam("amount", "Token amount in human units, e.g. '1000'")
  .addOptionalParam("address", "Presale address")
  .addOptionalParam("decimals", "Token decimals (default 18)", "18")
  .setAction(async (a, hre) => {
    const ps = await hre.ethers.getContractAt("EXWIFEPresale", getAddr(a));
    const [o] = await hre.ethers.getSigners();
    if ((await ps.owner()).toLowerCase() !== o.address.toLowerCase()) throw new Error("Signer not owner");
    const dec = parseInt(a.decimals, 10) || 18;
    const wei = hre.ethers.parseUnits(a.amount, dec);
    const tx = await ps.connect(o).airdrop(a.to, wei);
    console.log("airdrop tx:", tx.hash);
    await tx.wait();
    console.log(`✓ Airdropped ${a.amount} tokens to ${a.to}`);
  });
