// pages/_document.jsx — EXWIFE Pages Router document with shims
import Document, { Html, Head, Main, NextScript } from "next/document";

export default class MyDocument extends Document {
  render() {
    return (
      <Html lang="en">
        <Head>
          {/* 1) HEAD SHIM */}
          <script
            id="exwife-head-shim"
            dangerouslySetInnerHTML={{
              __html: `
                (function(){
                  window.EXWIFE_ENV = {
                    network: 'mainnet',
                    rpc: [
                      'https://rpc.sepolia.org',
                      'https://sepolia.infura.io/v3/YOUR_INFURA_KEY',
                      'https://cloudflare-eth.com'
                    ],
                    presale: '0xF4A37B656A33d418FB37280c9304274078A9b3ed',
                    token:  '0x72E284f9F2cf9DEE3e60e78B1730c6037A1858D4',
                    symbol: 'EXWIFE',
                    goalEth: 1200
                  };
                  window.GOAL_ETH = Number(window.EXWIFE_ENV.goalEth || 1200);
                  window.PRESALE_ADDRESS = String(window.EXWIFE_ENV.presale);
                  window.EXWIFE_getRpc = function(){
                    for (let u of (window.EXWIFE_ENV.rpc || [])) { if (u) return u; }
                    return 'https://rpc.sepolia.org';
                  };
                  window.PRESALE_ABI_MIN = [
                    "function paused() view returns (bool)",
                    "function buy() payable",
                    "function totalRaisedWei() view returns (uint256)",
                    "function weiRaised() view returns (uint256)"
                  ];
                  window.__EXWIFE_HEAD_MARK = true;
                  console.info('EXWIFE_HEAD_SHIM loaded — PRESALE:', window.PRESALE_ADDRESS);
                })();
              `,
            }}
          />

          {/* Ethers UMD */}
          <script src="https://cdn.jsdelivr.net/npm/ethers@6.13.4/dist/ethers.umd.min.js"></script>
        </Head>
        <body>
          {/* Marker to grep in deployed HTML */}
          <div id="exwife-build-marker" data-v="layout-injected">
            EXWIFE v12.3 loaded (goal: 1200 ETH)
          </div>

          {/* Optional mount for owner panel (we'll wire it after Gate 1) */}
          <div id="ownerPanel" style={{ display: "none" }}></div>

          <Main />
          <NextScript />

          {/* 2) SAFE EVENT-SUBSCRIPTION SHIM */}
          <script
            id="exwife-safe-on"
            dangerouslySetInnerHTML={{
              __html: `
                (function(){
                  if (!window.ethers || !window.ethers.Contract) { console.warn('ethers not found — safe-on shim deferred'); return; }
                  if (window.__EXWIFE_SAFE_ON) return; window.__EXWIFE_SAFE_ON = true;
                  const P = window.ethers.Contract && window.ethers.Contract.prototype;
                  if (!P) return;
                  const origOn = P.on;
                  P.on = function(event, listener){
                    try { return origOn.call(this, event, listener); }
                    catch(err){
                      const m = (err && err.message ? err.message : '').toLowerCase();
                      if (m.includes('unknown fragment') || m.includes('invalid fragment') || m.includes('invalid argument')) {
                        console.warn('EXWIFE safe-on: skipping subscribe to', event);
                        return this;
                      }
                      throw err;
                    }
                  };
                  console.info('EXWIFE safe-on shim installed');
                })();
              `,
            }}
          />

          {/* 3) BOOTSTRAP — exposes EXWIFE_refreshRaised() and EXWIFE_buyInline() */}
          <script
            id="exwife-bootstrap"
            dangerouslySetInnerHTML={{
              __html: `
                (function(){
                  async function EXWIFE_getProvider(){
                    if (window.ethereum){
                      try { return new ethers.BrowserProvider(window.ethereum); }
                      catch(e){ console.warn('BrowserProvider failed — fallback', e); }
                    }
                    const rpc = window.EXWIFE_getRpc?.() || 'https://rpc.sepolia.org';
                    return new ethers.JsonRpcProvider(rpc);
                  }
                  async function EXWIFE_getPresaleContract(){
                    const pr = await EXWIFE_getProvider();
                    return new ethers.Contract(window.PRESALE_ADDRESS, window.PRESALE_ABI_MIN, pr);
                  }
                  window.EXWIFE_refreshRaised = async function(){
                    try{
                      const c = await EXWIFE_getPresaleContract();
                      if (typeof c.totalRaisedWei === 'function'){
                        try{ const v = await c.totalRaisedWei(); const n = Number(ethers.formatEther(v||0)); window.__EXWIFE_LAST_RAISED=n; return n; }catch(e){}
                      }
                      if (typeof c.weiRaised === 'function'){
                        try{ const v = await c.weiRaised(); const n = Number(ethers.formatEther(v||0)); window.__EXWIFE_LAST_RAISED=n; return n; }catch(e){}
                      }
                      try{
                        const pr = await EXWIFE_getProvider();
                        const bal = await pr.getBalance(window.PRESALE_ADDRESS);
                        const n = Number(ethers.formatEther(bal||0)); window.__EXWIFE_LAST_RAISED=n; return n;
                      }catch(e){ console.error('balance fallback failed', e); return 0; }
                    }catch(err){ console.error('EXWIFE_refreshRaised error', err); return 0; }
                  };
                  window.EXWIFE_buyInline = async function(ethAmount){
                    ethAmount = Number(ethAmount)||0;
                    if (!(ethAmount>0)) throw new Error('invalid amount');
                    if (!window.ethereum) throw new Error('No wallet detected');
                    const pr = new ethers.BrowserProvider(window.ethereum);
                    const signer = await pr.getSigner();
                    const c = new ethers.Contract(window.PRESALE_ADDRESS, window.PRESALE_ABI_MIN, signer);
                    if (typeof c.paused === 'function'){
                      try{ if (await c.paused()) throw new Error('paused'); }catch(e){ if (String(e).toLowerCase().includes('paused')) throw e; }
                    }
                    const tx = await c.buy({ value: ethers.parseEther(String(ethAmount)) });
                    console.info('EXWIFE buy tx:', tx.hash);
                    return tx;
                  };
                  window.__EXWIFE_TAIL_MARK = true;
                  console.info('EXWIFE bootstrap installed');
                })();
              `,
            }}
          />
        </body>
      </Html>
    );
  }
}

