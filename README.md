# 🗳️ Stellar Live Poll — Level 2

A decentralized on-chain voting application built on the **Stellar Testnet** using **Soroban Smart Contracts**. Users can connect their Stellar wallet (Freighter or xBull) and cast votes that are recorded permanently on the blockchain.

---

## 🌐 Live Demo

👉 **[https://stellar-internship-level-2.vercel.app](https://stellar-internship-level-2.vercel.app)**

---

## 📸 Screenshots

### UI
![UI](frontend/public/Level%202%20SS/UI.png.png)

### Freighter Wallet Connection
![Freighter Wallet Connection](frontend/public/Level%202%20SS/Frieghter%20Wallet%20Connection.png.png)

### Freighter Transaction Confirmation
![Freighter Confirmation](frontend/public/Level%202%20SS/Frieghter%20Confirmation.png.png)

### Freighter Vote Result
![Freighter Result](frontend/public/Level%202%20SS/Frieghter%20Result.png.png)

### xBull Wallet Connection
![xBull Wallet Connection](frontend/public/Level%202%20SS/xBull%20Wallet%20Connection.png.png)

### xBull Transaction Confirmation
![xBull Confirmation](frontend/public/Level%202%20SS/xBull%20Confirmation.png.png)

### xBull Vote Result
![xBull Result](frontend/public/Level%202%20SS/xBull%20Result.png.png)

---

## ✨ Features

- ✅ Connect with **Freighter** or **xBull** wallet
- ✅ Cast votes on-chain via **Soroban Smart Contract**
- ✅ Live results update every **5 seconds**
- ✅ Transaction hash with **Stellar Explorer** link
- ✅ Recent vote events from contract
- ✅ Fully deployed on **Vercel**
- ✅ 3 error types handled: Wallet Not Found, User Rejected, Network Error

---

## 🛠️ Tech Stack

| Technology | Purpose |
|---|---|
| React.js | Frontend UI |
| Stellar SDK | Blockchain interaction |
| Soroban | Smart Contract platform |
| Freighter API | Freighter wallet integration |
| xBull SDK | xBull wallet integration |
| Vercel | Deployment |

---

## 📋 Smart Contract

- **Network:** Stellar Testnet
- **Contract ID:** `CBBRQYEOT6E2NQBXNUI6MOUXE32LVKNVBF4ZDZBOYUDPQRGWRSFBLGUI`
- **RPC URL:** `https://soroban-testnet.stellar.org`

### Contract Functions

| Function | Description |
|---|---|
| `vote_a()` | Cast a vote for Option A |
| `vote_b()` | Cast a vote for Option B |
| `get_results()` | Returns current vote counts |

---

## 🚀 Getting Started

### Prerequisites
- Node.js installed
- [Freighter Wallet](https://freighter.app) browser extension
- Stellar testnet account funded via [Friendbot](https://friendbot.stellar.org)

### Installation

```bash
# Clone the repository
git clone https://github.com/vaiii05-hub/Stellar-Internship-Level-2.git

# Go to frontend folder
cd Stellar-Internship-Level-2/frontend

# Install dependencies
npm install

# Start the app
npm start
```

App will run at `http://localhost:3000`

---

## 🗳️ How to Vote

1. Open the app
2. Select **Freighter** or **xBull** wallet
3. Click **Connect Wallet** and approve the connection
4. Click **Vote Option A** or **Vote Option B**
5. Approve the transaction in your wallet
6. See your vote reflected in **Live Results** ✅

---

## 📁 Project Structure

```
Stellar-Internship-Level-2/
├── Contract/                  # Soroban smart contract (Rust)
│   └── contracts/
│       └── hello-world/
│           └── src/
│               ├── lib.rs     # Contract logic
│               └── test.rs    # Contract tests
└── frontend/                  # React frontend
    ├── public/
    │   └── Level 2 SS/        # Screenshots
    └── src/
        ├── App.js             # Main app component
        └── App.css            # Styles
```

---

## ⚠️ Error Handling

The app handles 3 types of errors:

| Error | Description |
|---|---|
| Wallet Not Found | Wallet extension not installed |
| User Rejected | User cancelled the transaction |
| Network Error | Connection or RPC issue |

---

## 👤 Author

**vaiii05-hub**
- GitHub: [@vaiii05-hub](https://github.com/vaiii05-hub)

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).
