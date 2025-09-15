const { task } = require("hardhat/config");
const path = require("path");
const fs = require("fs");
task("presale:constructor", "Show EXWIFEPresale constructor from compiled ABI")
  .setAction(async (_, hre) => {
    await hre.run("compile");
    const p = path.join(__dirname, "..", "artifacts", "contracts", "EXWIFEPresale.sol", "EXWIFEPresale.json");
    const art = JSON.parse(fs.readFileSync(p, "utf8"));
    const ctor = (art.abi||[]).find(e => e.type==="constructor");
    if (!ctor) return console.log("No constructor found. Did compile succeed?");
    console.log("Constructor inputs:");
    (ctor.inputs||[]).forEach((inp,i)=>console.log(`  ${i}. ${inp.name} : ${inp.type}`));
  });
