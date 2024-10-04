# 🛒 Decentralized Marketplace dApp
## 📋 Overview
This project is a decentralized marketplace application for the buying and selling of physical goods. It uses Ethereum smart contracts to manage item listings, escrow functionality, and secure fund transfers between buyers and sellers. The application aims to provide a trustless environment with transparent dispute management, secure payment options, and an intuitive user interface.

## ✨ Features
- Item Listing and Management:
  - Add, edit, and delete item listings.
  - Specify item title, description, price, and upload an image.
  - Restrict edits/deletions after a purchase has been made.
- Purchasing and Secure Payments:
  - Buyers can purchase items and funds are held in an escrow contract.
  - If delivery is successful, the buyer can confirm receipt, releasing funds to the seller.
- Dispute Resolution:
  - If delivery fails or an issue arises, the buyer can open a dispute.
  - The arbitrator (a third-party wallet) can review proofs from both buyer and seller to decide on a refund or payment release.
- Tracking Code Management:
  - Seller can provide a tracking code upon shipment, and the buyer can verify the code for delivery updates.
  
## 🛠️ Technology Stack
- Frontend: React.js, Ant Design, Ethers.js
- Smart Contracts: Solidity, Hardhat, Chai, Faker.js
- Development Network: Celo's Alfajores testnet (similar to Ethereum)
- Tools: MetaMask, Hardhat, Node.js, IPFS for image storage

## 🚀 Getting Started
### 📦 Prerequisites
Make sure to have the following installed:
- Node.js (v14+)
- MetaMask browser extension
- An Ethereum test network (e.g., Alfajores, Ropsten, or Ganache)

⚙️ Installation
Clone the repository:
```
git clone https://github.com/aawan2805/marketplace_dapp
cd marketplace-dapp
```

Install dependencies:

```
npm install
```
Compile smart contracts using Hardhat:

```
yarn hardhat compile
```

Deploy the smart contracts to a test network:

```
yarn hardhat run scripts/deploy.js --network alfajores
```

Start the frontend React application:
```
yarn dev
```

To upload and download images you also need to run the server.js
```
npm server.js
```

### 📜 Smart Contracts
The project includes two main smart contracts:

- Item Contract: Manages item listing, updating, and deletion.
- Escrow Contract: Handles the payment, escrow management, and dispute resolution.


## 🔗 Links
[![linkedin](https://img.shields.io/badge/linkedin-0A66C2?style=for-the-badge&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/abdullah-bashir-yasmin-719a1b111)

