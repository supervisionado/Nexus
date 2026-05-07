import hardhatToolboxMochaEthersPlugin from "@nomicfoundation/hardhat-toolbox-mocha-ethers";
import { configVariable, defineConfig } from "hardhat/config";
import dotenv from "dotenv";
dotenv.config();

export default defineConfig({
  plugins: [hardhatToolboxMochaEthersPlugin],
  solidity: {
    profiles: {
      default: {
        version: "0.8.33",
      },
      production: {
        version: "0.8.33",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    },
  },
  networks: {
    hardhatMainnet: {
      type: "edr-simulated",
      chainType: "l1",
    },
    hardhatOp: {
      type: "edr-simulated",
      chainType: "op",
    },
    sepolia: {
      type: "http",
      chainType: "l1",
      url: `${process.env.INFURA_SEPOLIA}`,
      accounts: { mnemonic: `${process.env.SECRET}` }
    },
    mainnet: {
      type: "http",
      chainType: "l1",
      url: `${process.env.INFURA_ETHEREUM}`,
      accounts: { mnemonic: `${process.env.SECRET}` }
    },
    sonic: {
      type: "http",
      url: "https://rpc.soniclabs.com",
      chainId: 146,
      accounts: { mnemonic: `${process.env.SECRET}` }
    },
    sonicTestnet: {
      type: "http",
      url: "https://rpc.testnet.soniclabs.com",
      chainId: 14601,
      accounts: { mnemonic: `${process.env.SECRET}` }
    }
  },
  verify: {
    etherscan: {
      apiKey: process.env.API_KEY || ""
    }
  }
});
