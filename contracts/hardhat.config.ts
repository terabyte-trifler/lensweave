import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";
dotenv.config();

const PRIVATE_KEY = process.env.PRIVATE_KEY!;
const BASECAMP_RPC = process.env.BASECAMP_RPC || "https://123420001114.rpc.thirdweb.com";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: { optimizer: { enabled: true, runs: 200 } },
  },
  networks: {
    // Camp Basecamp testnet (EVM)
    basecamp: {
      url: BASECAMP_RPC,
      chainId: 123420001114,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
  },
  etherscan: {
    // no verifier yet; skip
  },
};

export default config;
