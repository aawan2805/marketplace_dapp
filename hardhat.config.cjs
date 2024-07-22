require("@nomicfoundation/hardhat-toolbox");
require("hardhat-deploy")

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.24",
  networks: {
    alfajores: {
      chainId: 44787,
      url: "https://celo-alfajores.infura.io/v3/b3a6e614b0864904be3700b5563b3fc0", // Insert Infura Celo Url here
      accounts: ["0xc6dd256c0eec4044866233086f4029bb34303b63cb3fcf0d4c7f2648eefd8219"], // Insert Metamask Private key here
    }
  },
  paths: {
    artifacts: "./src/artifacts"
  },
  namedAccounts: {
    deployer: {
      default: 0,
    }
  }

};
