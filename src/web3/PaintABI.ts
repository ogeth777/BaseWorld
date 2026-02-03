export const PaintABI = [
  {
    "inputs": [],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "tileId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "painter",
        "type": "address"
      }
    ],
    "name": "Painted",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "PAINT_PRICE",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "owner",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "tileId",
        "type": "uint256"
      }
    ],
    "name": "paint",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "withdraw",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;

// Update this after deployment!
export const CONTRACT_ADDRESS = "0x9Ec87D0a207d535B958A62B00634B4b1817c3501"; 
