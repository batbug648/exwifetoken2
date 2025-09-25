const { task } = require("hardhat/config");

task("presale:finalize", "Owner-only: finalize presale (finalize(bool sendEthToTreasury))")
  .addParam("address", "Presale contract address")
  .addOptionalParam("arg", "true|false (default: true)")
  .setAction(async (args, hre) => {
    const [signer] = await hre.ethers.getSigners();
    const presale = await hre.ethers.getContractAt("EXWIFEPresale", args.address, signer);

    const send = args.arg === undefined ? true : /^(1|true|yes)$/i.test(String(args.arg));
    console.log("Presale:", args.address);
    console.log("Caller :", await signer.getAddress());
    console.log("Sending ETH to treasury:", send);

    const tx = await presale.finalize(send);
    console.log("tx:", tx.hash);
    await tx.wait();
    console.log("✅ Finalize executed");
  });

