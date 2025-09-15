require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

// Load custom tasks
require("./tasks/presale-constructor");
require("./tasks/presale-status");
require("./tasks/presale");
require("./tasks/presale-deploy");

module.exports = {
  solidity: "0.8.24",
  networks: {
    sepolia: {
      url: process.env.RPC_URL,
      accounts: [process.env.PRIVATE_KEY],
    },
  },
  etherscan: {
    apiKey: {
      sepolia: process.env.ETHERSCAN_API_KEY,
    },
  },
  // Optional: silence Sourcify notice (leave disabled unless you want it)
  sourcify: {
    enabled: false,
  },
};

require("./tasks/presale-window");
