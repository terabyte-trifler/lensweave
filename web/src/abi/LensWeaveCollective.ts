// web/src/abi/LensWeaveCollective.ts
export const LensWeaveCollectiveABI = [
    {
      "type": "function",
      "name": "mintCollective",
      "stateMutability": "nonpayable",
      "inputs": [
        { "name": "uri",          "type": "string" },
        { "name": "creators",     "type": "address[]" },
        { "name": "sharesBps",    "type": "uint96[]" },
        { "name": "royaltyBps",   "type": "uint96" },
        { "name": "to",           "type": "address" }
      ],
      "outputs": [{ "type": "uint256" }]
    }
  ] as const
  