const { ethers } = require("hardhat");
async function main() {
  const tokenAddr = process.env.EXWIFE_TOKEN;
  const presale   = process.env.PRESALE_NEW;
  const amount    = process.env.AMOUNT || "20000000"; // 20,000,000 tokens (adjust)
  if (!tokenAddr || !presale) throw new Error("Set EXWIFE_TOKEN and PRESALE_NEW env vars");

  const [signer] = await ethers.getSigners();
  const erc20 = new ethers.Contract(
    tokenAddr,
    ["function decimals() view returns(uint8)", "function transfer(address,uint256) returns(bool)"],
    signer
  );
  const dec = await erc20.decimals();
  const amt = ethers.parseUnits(amount, dec);
  console.log("Transferring", amount, "tokens to", presale);
  const tx = await erc20.transfer(presale, amt);
  console.log("tx:", tx.hash);
  await tx.wait();
  console.log("✓ Funded", amount, "tokens to", presale);
}
main().catch(e=>{console.error(e);process.exit(1);});
