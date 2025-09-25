// scripts/deploy-mainnet.js
const hre = require("hardhat");
const { ethers } = hre;

/**
 * === EDIT treasury ONLY (put your full 0xF8… address) ===
 * admin/owner are set to your 0x4799… deployer as requested.
 */
const DEPLOY = {
  admin:   "0x4799d7Bf70371A396E3415336DD821586A72D37e",
  treasury:"0xF869F4270163311c06e7DC066A92878FD4B1648e",
  owner:   "0x4799d7Bf70371A396E3415336DD821586A72D37e",

  // Window (UTC)
  openISO:  "2025-09-22T16:00:00Z",
  closeISO: "2025-10-22T16:00:00Z",

  // Economics
  rateTokensPerEth: 100000,   // tokens per 1 ETH
  minEth: "0.001"             // min buy (ETH). Use "0.000000001" for 1 gwei like Sepolia
};

function toUnix(iso) { return Math.floor(new Date(iso).getTime() / 1000); }

async function main() {
  const [deployer] = await ethers.getSigners();
  const deployerAddr = await deployer.getAddress();
  console.log("Deployer:", deployerAddr);

  // Sanity checks
  const reqAddr = (label, v) => {
    if (!ethers.isAddress(v)) throw new Error(`Invalid ${label} address: ${v}`);
    return v;
  };
  const admin    = reqAddr("admin", DEPLOY.admin);
  const treasury = reqAddr("treasury", DEPLOY.treasury);
  const owner    = reqAddr("owner", DEPLOY.owner);

  const OPEN  = toUnix(DEPLOY.openISO);
  const CLOSE = toUnix(DEPLOY.closeISO);
  if (!(OPEN > 0 && CLOSE > OPEN)) throw new Error(`OPEN/CLOSE invalid: ${OPEN} .. ${CLOSE}`);

  // price per token (wei) = 1e18 wei / tokensPerETH
  const ONE_ETH_WEI = ethers.parseEther("1");
  const rate = BigInt(DEPLOY.rateTokensPerEth);
  if (rate <= 0n) throw new Error("rateTokensPerEth must be > 0");
  const priceWeiPerToken = ONE_ETH_WEI / rate; // integer division
  const minBuyWei = ethers.parseEther(DEPLOY.minEth);

  console.log("Derived:", {
    priceWeiPerToken: priceWeiPerToken.toString(),
    minBuyWei: minBuyWei.toString(),
    OPEN, CLOSE
  });

  // ===== TOKEN: EXWIFE(name, symbol, admin) =====
  const Token = await ethers.getContractFactory("EXWIFE");
  const name   = "EXWIFE";
  const symbol = "EXWIFE";
  const token  = await Token.deploy(name, symbol, admin);
  await token.waitForDeployment();
  const tokenAddr = await token.getAddress();
  console.log("Token:", tokenAddr);

  // ===== PRESALE: EXWIFEPresale =====
  // constructor(IMintable _token, address payable _treasury, uint256 _priceWeiPerToken,
  //             uint256 _minBuyWei, uint64 _openingTime, uint64 _closingTime, address initialOwner)
  const Presale = await ethers.getContractFactory("EXWIFEPresale");
  const presale = await Presale.deploy(
    tokenAddr,
    treasury,
    priceWeiPerToken,
    minBuyWei,
    OPEN,
    CLOSE,
    owner
  );
  await presale.waitForDeployment();
  const presaleAddr = await presale.getAddress();
  console.log("Presale:", presaleAddr);

  // ===== Grant MINTER_ROLE to presale =====
  let MINTER_ROLE;
  try { MINTER_ROLE = await token.MINTER_ROLE(); }
  catch { MINTER_ROLE = ethers.id("MINTER_ROLE"); }
  try {
    const tx = await token.grantRole(MINTER_ROLE, presaleAddr);
    await tx.wait();
    console.log("Granted MINTER_ROLE to presale:", presaleAddr);
  } catch (e) {
    console.warn("Could not grant MINTER_ROLE automatically. Grant it manually if required:", e?.reason || e?.message || e);
  }

  // ===== Etherscan verification args =====
  console.log("\n=== VERIFY ARGS ===");
  console.log("Token args:", JSON.stringify([name, symbol, admin]));
  console.log(
    "Presale args:",
    JSON.stringify([
      tokenAddr,
      treasury,
      priceWeiPerToken.toString(),
      minBuyWei.toString(),
      OPEN,
      CLOSE,
      owner
    ])
  );
}

main().catch((e) => { console.error(e); process.exit(1); });

