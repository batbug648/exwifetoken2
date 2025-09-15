import { task } from "hardhat/config";
import { ethers } from "hardhat";
import * as dotenv from "dotenv"; dotenv.config();

function getAddr(flag?: string, envName?: string) {
  const a = flag || process.env[envName || ""] || process.env.PRESALE_ADDRESS;
  if (!a) throw new Error("Missing address. Pass --address or set PRESALE_ADDRESS in .env");
  return a;
}

task("presale:pause", "Pause the presale")
  .addOptionalParam("address", "Presale address")
  .setAction(async ({ address }, hre) => {
    const addr = getAddr(address, "PRESALE_ADDRESS");
    const ps = await ethers.getContractAt("EXWIFEPresale", addr);
    const [owner] = await ethers.getSigners();
    if ((await ps.owner()).toLowerCase() !== owner.address.toLowerCase()) throw new Error("Signer is not owner");
    const tx = await ps.connect(owner).pause();
    console.log("pause() tx:", tx.hash); await tx.wait(); console.log("paused():", await ps.paused());
  });

task("presale:unpause", "Unpause the presale")
  .addOptionalParam("address", "Presale address")
  .setAction(async ({ address }, hre) => {
    const addr = getAddr(address, "PRESALE_ADDRESS");
    const ps = await ethers.getContractAt("EXWIFEPresale", addr);
    const [owner] = await ethers.getSigners();
    if ((await ps.owner()).toLowerCase() !== owner.address.toLowerCase()) throw new Error("Signer is not owner");
    const tx = await ps.connect(owner).unpause();
    console.log("unpause() tx:", tx.hash); await tx.wait(); console.log("paused():", await ps.paused());
  });

task("presale:finalize", "Finalize the presale (with or without arg)")
  .addOptionalParam("address", "Presale address")
  .addOptionalParam("withsweep", "Try finalize(true) first (default true)", true, Boolean)
  .setAction(async ({ address, withsweep }, hre) => {
    const addr = getAddr(address, "PRESALE_ADDRESS");
    const ps = await ethers.getContractAt("EXWIFEPresale", addr);
    const [owner] = await ethers.getSigners();
    if ((await ps.owner()).toLowerCase() !== owner.address.toLowerCase()) throw new Error("Signer is not owner");

    try {
      const tx = withsweep ? await ps.connect(owner).finalize(true) : await ps.connect(owner).finalize();
      console.log("finalize tx:", tx.hash); await tx.wait();
    } catch (e) {
      if (withsweep) {
        console.log("finalize(true) failed, retrying finalize() …");
        const tx = await ps.connect(owner).finalize();
        console.log("finalize() tx:", tx.hash); await tx.wait();
      } else { throw e; }
    }
    try { console.log("finalized():", await (ps as any).finalized()); } catch {}
    const bal = await ethers.provider.getBalance(addr);
    console.log("Contract balance (ETH):", ethers.formatEther(bal));
  });

task("presale:airdrop", "Airdrop tokens via presale")
  .addParam("to", "Recipient address")
  .addParam("amount", "Token amount in human units, e.g. '1000'")
  .addOptionalParam("address", "Presale address")
  .addOptionalParam("decimals", "Token decimals (default 18)", "18")
  .setAction(async ({ to, amount, address, decimals }, hre) => {
    const addr = getAddr(address, "PRESALE_ADDRESS");
    const ps = await ethers.getContractAt("EXWIFEPresale", addr);
    const [owner] = await ethers.getSigners();
    if ((await ps.owner()).toLowerCase() !== owner.address.toLowerCase()) throw new Error("Signer is not owner");
    const dec = parseInt(decimals, 10) || 18;
    const wei = ethers.parseUnits(amount, dec);
    const tx = await ps.connect(owner).airdrop(to, wei);
    console.log("airdrop tx:", tx.hash); await tx.wait(); console.log("✓ Airdrop complete");
  });
