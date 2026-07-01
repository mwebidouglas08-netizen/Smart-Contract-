// ============================================================
// StudentFees dApp — deployment config
// Edit the two values below after you deploy udentFees.sol
// (via Remix, Deploy & Run Transactions tab) to a network.
// ============================================================

const APP_CONFIG = {
  // Paste the deployed contract address here (starts with 0x...)
  CONTRACT_ADDRESS: "0x0000000000000000000000000000000000000000",

  // Network the contract is deployed to. Used only to warn the
  // user if their wallet is pointed at the wrong chain.
  NETWORK: {
    chainIdHex: "0xaa36a7",   // 11155111 = Ethereum Sepolia testnet
    chainName: "Sepolia",
    nativeCurrency: { name: "Sepolia ETH", symbol: "ETH", decimals: 18 },
    rpcUrls: ["https://rpc.sepolia.org"],
    blockExplorerUrls: ["https://sepolia.etherscan.io"]
  }
};
