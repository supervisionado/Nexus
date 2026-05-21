# Nexus Marketplace

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Solidity](https://img.shields.io/badge/Solidity-^0.8.33-blue)](https://soliditylang.org)
[![OpenZeppelin](https://img.shields.io/badge/OpenZeppelin-^5.4.0-4e5fd4)](https://openzeppelin.com)
[![Hardhat](https://img.shields.io/badge/Built%20with-Hardhat-ffaa00)](https://hardhat.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178c6)](https://www.typescriptlang.org)

> **Private Marketplace for Phanatics NFTs**  
> List. Buy. Trade. All on-chain. No gas wars. No bots. Just Phanic energy. 👻🦔

---

## 📦 Contract Info

| Field | Value |
|-------|-------|
| **Name** | Nexus |
| **Purpose** | Private ERC721 marketplace for Phanatics (`PHNT`) |
| **Collection** | `0x9A7e...57fB` (configurable pre-lock) |
| **Fees** | Configurable marketplace fee + configurable royalty (BPS) |
| **Floor Price** | Enforced minimum listing price (configurable) |
| **Security** | `Ownable` + `ReentrancyGuard` + `Pausable` |

---

## ⚡ How It Works

```
1️⃣ SELLER lists NFT
   → Set price (≥ floor) + duration (≥ 1h)
   → NFT stays in wallet (approval required)
   → Listing goes live on-chain

2️⃣ BUYER purchases listing
   → Pays: price + royalty% + fixed fee
   → NFT transfers instantly
   → Seller receives ETH, stats update

3️⃣ ANYONE can disable expired listings
   → Keeps catalog clean, gas-efficient
```

### 💰 Fee Breakdown (on purchase)

```
Total Paid = Listing Price 
           + (Price × Royalty BPS / 10,000) 
           + Fixed Nexus Fee

Example: 0.05 ETH listing, 5% royalty, 0.001 ETH fee
→ Buyer pays: 0.05 + 0.0025 + 0.001 = 0.0535 ETH
→ Seller receives: 0.05 ETH
→ Protocol receives: 0.0035 ETH (royalty + fee)
```

---

## 🔑 Owner Functions

```ts
// Configuration (locked after first listing)
setCollectionAddr(address)     // Set Phanatics contract (one-time)
setFloorPrice(uint96)          // Min listing price (wei)
setMarketplaceFee(uint96)      // Fixed fee per sale (wei)
setRoyaltiesBPS(uint32)        // Royalty in basis points (max 9999)

// Treasury
withdrawAllTo(address)         // Withdraw collected fees + royalties

// Safety
pause() / unpause()            // Emergency halt
```

---

## 🧑‍💻 Public Functions

### Listing Management

```ts
// List an NFT for sale
listForSale(tokenId, price, durationSec) 
  → Requires: ownership, approval, price ≥ floor, duration ≥ 1h

// Buy a listed NFT
buyListing(tokenId) payable 
  → Sends: price + royalty + fee
  → Transfers NFT + ETH atomically

// View a listing
fetchTokenListing(tokenId) → Listing struct

// Disable a listing
disableListing(tokenId) 
  → Seller/owner: anytime
  → Anyone: if expired
```

### Stats & Views

```ts
// Marketplace-wide
getMarketplaceTotalSales() → uint256
getMarketplaceTotalListings() → uint256

// Per-user
getUserSalesVolume(addr) → uint256   // Total ETH sold
getUserSales(addr) → uint256          // # of sales
getUserPurchases(addr) → uint256      // # of buys
getUserListings(addr) → uint256       // Active listings

// Config getters
getCollectionAddr() → address
getFloorPrice() → uint256
getMarketplaceFee() → uint256
getRoyaltiesBPS() → uint32
```

---

## 🔐 Security Highlights

✅ **ReentrancyGuard** on `buyListing` and `withdrawAllTo`  
✅ **Pausable** emergency stop for critical situations  
✅ **Approval checks** ensure NFT can be transferred at time of sale  
✅ **Expiration logic** prevents stale listings from being bought  
✅ **Owner-changed check** protects against pre-approval exploits  
✅ **Config lock** prevents collection address change after first listing  

⚠️ **Notes**:
- Sellers must approve `Nexus` for their NFTs (`setApprovalForAll` or `approve`)
- Floor price and fees are configurable — trust the owner
- Royalties are enforced on-chain, but marketplace compliance is off-chain dependent

---

## 📜 License

MIT — See [`LICENSE`](LICENSE) for details.

```text
SPDX-License-Identifier: MIT
```

---

> 👻 Built by **SuperVisionado** for PhanicVerse.  
> *Audit in progress. Not financial advice. Trade responsibly.*

---

Powered by ghosts, hedgehogs, and clean code 🧊


