// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
  function transfer(address to, uint256 amount) external returns (bool);
  function balanceOf(address account) external view returns (uint256);
  function decimals() external view returns (uint8);
}

contract ExwifePresaleV2 {
  address public immutable wallet;       // where raised ETH goes (treasury)
  IERC20  public immutable token;        // EXWIFE token
  uint256 public immutable rate;         // tokens per 1 ETH (18-decimal ETH)
  uint256 public immutable capWei;       // hard cap in wei
  uint256 public immutable goalWei;      // soft goal in wei

  uint256 public immutable openAt;       // unix timestamp
  uint256 public immutable closeAt;      // unix timestamp

  bool public paused;                    // owner pause
  address public immutable owner;

  uint256 public weiRaised;              // total ETH raised (legacy name)
  // alias for your UI convenience:
  function totalRaisedWei() external view returns (uint256) { return weiRaised; }

  event TokensPurchased(address indexed buyer, uint256 valueWei, uint256 amountTokens);
  event Paused(address indexed account);
  event Unpaused(address indexed account);
  event Withdrawn(address indexed to, uint256 valueWei);
  event Skimmed(address indexed to, uint256 tokenAmount);

  modifier onlyOwner() { require(msg.sender == owner, "not owner"); _; }
  modifier onlyWhileOpen() {
    require(block.timestamp >= openAt && block.timestamp < closeAt, "not open");
    _;
  }
  modifier notPaused() { require(!paused, "paused"); _; }

  constructor(
    address _token,
    address _wallet,
    uint256 _rate,
    uint256 _openAt,
    uint256 _closeAt,
    uint256 _capWei,
    uint256 _goalWei
  ) {
    require(_token != address(0) && _wallet != address(0), "bad addr");
    require(_openAt < _closeAt, "bad window");
    require(_rate > 0, "bad rate");
    owner   = msg.sender;
    token   = IERC20(_token);
    wallet  = _wallet;
    rate    = _rate;
    openAt  = _openAt;
    closeAt = _closeAt;
    capWei  = _capWei;
    goalWei = _goalWei;
  }

  // UI helpers
  function isOpen() public view returns (bool) {
    return block.timestamp >= openAt && block.timestamp < closeAt;
  }

  // Owner controls
  function setPaused(bool on) external onlyOwner {
    paused = on;
    if (on) emit Paused(msg.sender); else emit Unpaused(msg.sender);
  }

  // Buy EXWIFE with ETH
  receive() external payable { _buy(msg.sender); }
  function buy() external payable { _buy(msg.sender); }

  function _buy(address beneficiary) internal onlyWhileOpen notPaused {
    require(beneficiary != address(0), "bad");
    require(msg.value > 0, "no eth");
    require(weiRaised + msg.value <= capWei, "cap");

    // tokens = rate * ETH (both 18 decimals) → rate is tokens per 1 ETH, token has its own decimals
    // We assume `rate` is already in "token units per 1 ETH" respecting token decimals.
    uint256 tokensOut = (msg.value * rate) / 1e18;
    require(tokensOut > 0, "too small");

    weiRaised += msg.value;

    // Transfer tokens the contract holds (owner must pre-fund this contract)
    require(token.transfer(beneficiary, tokensOut), "token xfer failed");

    // Push ETH to treasury wallet
    (bool ok, ) = wallet.call{value: msg.value}("");
    require(ok, "eth xfer failed");

    emit TokensPurchased(beneficiary, msg.value, tokensOut);
  }

  // Owner can withdraw stray ETH if any accumulates (shouldn't normally)
  function withdrawETH(uint256 amountWei) external onlyOwner {
    (bool ok, ) = payable(wallet).call{value: amountWei}("");
    require(ok, "withdraw fail");
    emit Withdrawn(wallet, amountWei);
  }

  // Owner can skim leftover tokens after sale ends
  function skimTokens(uint256 amount) external onlyOwner {
    require(block.timestamp >= closeAt || paused, "not ended");
    require(token.transfer(wallet, amount), "skim fail");
    emit Skimmed(wallet, amount);
  }
}
