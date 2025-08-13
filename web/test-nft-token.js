require('dotenv').config();
const { NFTStorage } = require('nft.storage');

const token = process.env.PINATA_JWT;
if (!token) {
  console.error('No token found in NFT_STORAGE_API_KEY');
  process.exit(1);
}

const client = new NFTStorage({ token });
console.log('Token length:', token.length);
