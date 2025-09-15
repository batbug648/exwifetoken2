const { ethers } = require("hardhat");
async function safe(c, fn, ...a){ try { return await c[fn](...a); } catch { return null; } }
async function main(){
  const token = process.env.EXWIFE_TOKEN;
  const presale = process.env.PRESALE_NEW;
  const [signer] = await ethers.getSigners();
  const me = await signer.getAddress();

  const erc20 = new ethers.Contract(token, [
    "function name() view returns (string)",
    "function symbol() view returns (string)",
    "function decimals() view returns (uint8)",
    "function totalSupply() view returns (uint256)",
    "function balanceOf(address) view returns (uint256)",
    // optional guards many tokens use:
    "function paused() view returns (bool)",
    "function tradingOpen() view returns (bool)",
    "function isTradingEnabled() view returns (bool)",
    "function owner() view returns (address)"
  ], signer);

  const [nm, sy, dec, ts, balMe, balPresale, paused, tOpen, tEn, owner] = await Promise.all([
    safe(erc20,"name"), safe(erc20,"symbol"), safe(erc20,"decimals"), safe(erc20,"totalSupply"),
    safe(erc20,"balanceOf", me), safe(erc20,"balanceOf", presale),
    safe(erc20,"paused"), safe(erc20,"tradingOpen"), safe(erc20,"isTradingEnabled"),
    safe(erc20,"owner")
  ]);

  function fmt(x){ if(x==null) return "n/a"; try{ return x.toString(); }catch{return String(x); } }
  const d = Number(dec ?? 18);
  const f = (n)=> n==null ? "n/a" : (Number(n)/10**d).toString();

  console.log("Token:", token);
  console.log("Me:", me);
  console.log("Presale:", presale);
  console.log({ name: fmt(nm), symbol: fmt(sy), decimals: fmt(dec), totalSupply: f(ts) });
  console.log("Balances  ->  me:", f(balMe), " | presale:", f(balPresale));
  console.log("Guards    ->  paused:", fmt(paused), " tradingOpen:", fmt(tOpen), " isTradingEnabled:", fmt(tEn));
  console.log("Owner     -> ", owner || "n/a");
}
main().catch(e=>{console.error(e);process.exit(1);});
