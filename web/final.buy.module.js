(() => {
  if (window.__FINAL_BUY_MODULE__) return;

  // ---------- helpers ----------
  const byId = (id) => document.getElementById(id);
  const q = (sel) => document.querySelector(sel);
  const amtEl = () =>
    byId("buyAmount") ||
    byId("ethAmount") ||
    q("#amount, [name=amount], input[id*='amount' i], input[name*='amount' i]");

  const toast = (window.toast || {});
  const info = toast.info?.bind(toast) || ((m)=>console.info("[info]", m));
  const ok   = toast.success?.bind(toast) || ((m)=>console.log("[ok]", m));
  const err  = toast.error?.bind(toast) || ((m)=>console.error("[error]", m));

  const readEth = () => {
    const el = amtEl();
    const raw = (el?.value ?? "").replace(",", ".").trim();
    return { el, raw, num: Number.parseFloat(raw) };
  };

  // ---------- block auto-buy unless via our handler ----------
  try {
    if (window.ethers?.Contract && !window.ethers.Contract.__FINAL_PATCHED__) {
      const C = window.ethers.Contract;
      const orig = C.prototype.buy;
      if (typeof orig === "function") {
        C.prototype.buy = function(...args){
          if (!window.__ALLOW_BUY_CALL__) {
            const e = new Error("Auto-buy blocked");
            e.code = "AUTO_BUY_BLOCKED";
            throw e;
          }
          return orig.apply(this, args);
        };
        C.__FINAL_PATCHED__ = true;
      }
    }
  } catch(_) {}

  // ---------- label updater ----------
  const labelFmt = (v) => (Number.isFinite(v) && v > 0 ? `Buy ${v.toFixed(3)} ETH` : "Buy now");
  const validAmt = (v) => Number.isFinite(v) && v >= 0.001;
  const syncLabelAndDisable = () => {
    const { el, num } = readEth();
    const buy = byId("buyBtn") || q("[data-action='buy'], button.buy, a.buy");
    if (buy) buy.textContent = labelFmt(num);
    if (buy) buy.disabled = !validAmt(num);
    if (el) {
      if (!el.min || Number(el.min) < 0.001) el.min = "0.001";
      el.placeholder = el.placeholder || "0.001";
      el.autocomplete = "off";
    }
  };

  // ---------- compute max ----------
  async function fillMax() {
    const el = amtEl();
    if (!el) return;
    try {
      const provider = window.ethereum
        ? new ethers.BrowserProvider(window.ethereum)
        : new ethers.JsonRpcProvider(window.EXWIFE_ENV?.rpc);

      // feeData with fallback to legacy gasPrice for older RPCs
      let gp = 0n;
      try {
        const fee = await provider.getFeeData();
        gp = (fee.maxFeePerGas || fee.gasPrice || 0n);
      } catch {
        try { gp = await provider.getGasPrice(); } catch { gp = 0n; }
      }

      const signer = await provider.getSigner();
      const bal = await provider.getBalance(await signer.getAddress());
      const reserve = 200000n * gp; // ~200k gas reserve
      const minWei  = ethers.parseEther("0.001");
      const spend   = (bal > reserve ? (bal - reserve) : 0n);
      if (spend < minWei) { err("Balance too low for 0.001 ETH after gas reserve"); return; }
      const eth = Number(ethers.formatEther(spend));
      el.value = String(eth.toFixed(4));
      syncLabelAndDisable();
    } catch {
      err("Couldn't compute max amount");
    }
  }

  // ---------- main buy handler ----------
  async function handleBuy() {
    const { raw, num } = readEth();
    if (!raw) { err("Enter an amount in ETH."); return; }
    if (!Number.isFinite(num) || num < 0.001) { err("Enter an amount ≥ 0.001 ETH"); return; }

    const provider = window.ethereum
      ? new ethers.BrowserProvider(window.ethereum)
      : new ethers.JsonRpcProvider(window.EXWIFE_ENV?.rpc);

    let signer;
    try { signer = await provider.getSigner(); }
    catch { err("No wallet connected."); return; }

    const net = await provider.getNetwork();
    if (String(net.chainId) !== "1") { await window.updateNetworkPill?.(); err("Please switch to Ethereum Mainnet."); return; }

    const PRESALE = (window.PRESALE_ADDRESS || window.EXWIFE_ENV?.presale);
    const ABI = (window.PRESALE_ABI_MIN || window.PRESALE_ABI);
    if (!PRESALE || !ABI) { err("Presale config missing."); return; }

    const presale = new ethers.Contract(PRESALE, ABI, signer);
    try { if (await presale.paused?.()) { err("Presale is paused."); return; } } catch {}

    const value = ethers.parseEther(String(num));

    // estimate gas
    let gas;
    try { gas = await presale.buy.estimateGas({ value }); }
    catch (e) { err(e?.shortMessage || "Buy not available. Check amount/network."); return; }

    // fee/gas price with fallback
    let gp = 0n;
    try {
      const fee = await provider.getFeeData();
      gp = (fee.maxFeePerGas || fee.gasPrice || 0n);
    } catch {
      try { gp = await provider.getGasPrice(); } catch { gp = 0n; }
    }

    const gasCost = gas * gp;
    const needWei = gasCost + value;
    const bal = await provider.getBalance(await signer.getAddress());
    if (bal < needWei) { err("Insufficient funds for amount + gas"); return; }

    const buyBtn = byId("buyBtn") || q("[data-action='buy'], button.buy, a.buy");
    const setPending = (v)=>{ try { if (buyBtn) buyBtn.disabled = !!v; } catch {} };

    window.__ALLOW_BUY_CALL__ = true;
    setPending(true);
    try {
      info("Submitting transaction… Confirm in your wallet");
      const tx = await presale.buy({ value });
      info("Pending… " + tx.hash);
      await tx.wait();
      ok("Purchase confirmed");
      await window.EXWIFE_refreshRaised?.();
    } catch (e) {
      if (String(e?.code) === "ACTION_REJECTED") err("Transaction rejected");
      else err(e?.shortMessage || e?.message || "Transaction failed");
    } finally {
      window.__ALLOW_BUY_CALL__ = false;
      setPending(false);
    }
  }

  // wrap to enforce auto-buy guard
  if (!handleBuy.__FINAL_WRAPPED__) {
    const base = handleBuy;
    async function safe(){ window.__ALLOW_BUY_CALL__ = true; try { await base(); } finally { window.__ALLOW_BUY_CALL__ = false; } }
    safe.__FINAL_WRAPPED__ = true;
    window.handleBuy = safe;
  }

  // ---------- wiring ----------
  const wire = () => {
    // input label + disable
    document.addEventListener("input", (e) => {
      if (e.target === amtEl()) syncLabelAndDisable();
    }, true);

    // initial sync
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", syncLabelAndDisable, { once: true });
    } else {
      syncLabelAndDisable();
    }

    // Buy button
    const buy = byId("buyBtn") || q("[data-action='buy'], button.buy, a.buy");
    if (buy && !buy.__FINAL_WIRED__) {
      const clean = buy.cloneNode(true);
      buy.replaceWith(clean);
      clean.addEventListener("click", (e) => { e?.preventDefault?.(); window.handleBuy(); });
      clean.__FINAL_WIRED__ = true;
    }

    // Refresh
    const refresh = byId("refreshBtn") || byId("refresh") || q("[data-action='refresh'], [data-refresh], button.refresh, a.refresh");
    const doRefresh = (typeof window.EXWIFE_refreshRaised === "function")
      ? window.EXWIFE_refreshRaised
      : (async () => { (window.toast?.info || console.info)("Refreshed."); });
    if (refresh && !refresh.__FINAL_WIRED__) {
      const clean = refresh.cloneNode(true);
      refresh.replaceWith(clean);
      clean.addEventListener("click", (e) => { e?.preventDefault?.(); try { doRefresh(); } catch (e) { console.warn("refresh failed:", e); } });
      clean.__FINAL_WIRED__ = true;
    }

    // Max button
    const el = amtEl();
    if (el) {
      let maxBtn = byId("maxBtn") || q("[data-action='max']");
      if (!maxBtn) {
        maxBtn = document.createElement("button");
        maxBtn.id = "maxBtn"; maxBtn.type = "button"; maxBtn.textContent = "Max";
        maxBtn.style.marginLeft = "0.5rem";
        el.insertAdjacentElement("afterend", maxBtn);
      }
      if (!maxBtn.__FINAL_WIRED__) {
        maxBtn.addEventListener("click", fillMax);
        maxBtn.__FINAL_WIRED__ = true;
      }
    }
  };

  wire();
  window.__FINAL_BUY_MODULE__ = true;
})();
