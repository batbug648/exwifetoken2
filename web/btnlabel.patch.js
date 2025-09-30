<script>
(function(){
  const byId = id => document.getElementById(id);
  const amtEl = () =>
    byId("buyAmount") ||
    byId("ethAmount") ||
    document.querySelector("#amount,[name=amount],input[id*='amount' i],input[name*='amount' i]");
  const buy = byId("buyBtn") || document.querySelector("[data-action='buy'],button.buy,a.buy");
  const fmt = v => (Number.isFinite(v) && v > 0 ? `Buy ${v.toFixed(3)} ETH` : "Buy");
  const valid = v => Number.isFinite(v) && v >= 0.001;
  const read = () => {
    const el = amtEl();
    return parseFloat((el?.value || "").replace(",", "."));
  };
  const sync = () => {
    const v = read();
    if (buy) { buy.textContent = fmt(v); buy.disabled = !valid(v); }
  };
  document.addEventListener("input", (e) => { if (e.target === amtEl()) sync(); }, true);
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", sync, { once: true });
  } else {
    sync();
  }
})();
</script>
