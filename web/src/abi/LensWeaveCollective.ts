// web/src/abi/LensWeaveCollective.ts
export const LensWeaveCollectiveABI = [
    {
      type: 'event',
      name: 'Minted',
      inputs: [
        { type: 'uint256', name: 'tokenId', indexed: true },
        { type: 'string',  name: 'uri' },
        { type: 'address[]', name: 'creators' },
        { type: 'uint96[]',  name: 'sharesBps' },
        { type: 'uint96',    name: 'royaltyBps' },
      ],
    },
    {
      type: 'function',
      name: 'mintCollective',
      stateMutability: 'nonpayable',
      inputs: [
        { name: 'uri', type: 'string' },
        { name: 'creators', type: 'address[]' },
        { name: 'sharesBps', type: 'uint96[]' },
        { name: 'royaltyBps', type: 'uint96' },
        { name: 'to', type: 'address' },
      ],
      outputs: [{ type: 'uint256' }],
    },
    {
      type: 'function',
      name: 'tokenURI',
      stateMutability: 'view',
      inputs: [{ name: 'tokenId', type: 'uint256' }],
      outputs: [{ type: 'string' }],
    },
  ] as const;
  