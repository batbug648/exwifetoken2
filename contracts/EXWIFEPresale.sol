// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

interface IMintable {
    function mint(address to, uint256 amount) external;
    function decimals() external view returns (uint8);
}

contract EXWIFEPresale is Ownable {
    IMintable public immutable token;
    address payable public immutable treasury;
    uint256 public immutable priceWeiPerToken;
    uint256 public immutable minBuyWei;
    uint64 public openingTime;
    uint64 public closingTime;
    bool public finalized;
    bool public paused;
    uint256 public totalRaisedWei;
    uint256 public totalSoldTokens;

    event TokensPurchased(address indexed buyer, uint256 value, uint256 amount);
    event Finalized(uint256 raised, uint256 sold);
    event Paused(bool paused);

    constructor(
        IMintable _token,
        address payable _treasury,
        uint256 _priceWeiPerToken,
        uint256 _minBuyWei,
        uint64 _openingTime,
        uint64 _closingTime,
        address initialOwner
    ) Ownable(initialOwner) {
        require(address(_token) != address(0) && _treasury != address(0), "bad addr");
        require(_openingTime < _closingTime, "times");
        require(_priceWeiPerToken > 0 && _minBuyWei > 0, "params");
        token = _token;
        treasury = _treasury;
        priceWeiPerToken = _priceWeiPerToken;
        minBuyWei = _minBuyWei;
        openingTime = _openingTime;
        closingTime = _closingTime;
    }

    modifier whenOpen() {
        require(block.timestamp >= openingTime && block.timestamp <= closingTime, "not open");
        _;
    }

    modifier whenNotPaused() {
        require(!paused, "paused");
        _;
    }

    function buy() public payable whenOpen whenNotPaused {
        require(!finalized, "finalized");
        require(msg.value >= minBuyWei, "min");
        uint256 tokens = (msg.value * (10 ** token.decimals())) / priceWeiPerToken;
        require(tokens > 0, "tiny");
        token.mint(msg.sender, tokens);
        totalRaisedWei += msg.value;
        totalSoldTokens += tokens;
        emit TokensPurchased(msg.sender, msg.value, tokens);
    }

    function finalize(bool sendEthToTreasury) external onlyOwner {
        require(!finalized, "done");
        finalized = true;
        if (sendEthToTreasury) {
            (bool ok,) = treasury.call{value: address(this).balance}("");
            require(ok, "xfer");
        }
        emit Finalized(totalRaisedWei, totalSoldTokens);
    }

    function airdrop(address to, uint256 tokens) external onlyOwner {
        require(finalized, "finalize first");
        require(to != address(0) && tokens > 0, "bad");
        token.mint(to, tokens);
    }

    function setPaused(bool _paused) external onlyOwner {
        paused = _paused;
        emit Paused(_paused);
    }

    receive() external payable { buy(); }
}

