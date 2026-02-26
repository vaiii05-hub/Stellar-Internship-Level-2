import React, { useState, useEffect, useCallback } from "react";
import * as StellarSdk from "@stellar/stellar-sdk";
import {
  isConnected as freighterIsConnected,
  requestAccess,
  getAddress,
  signTransaction as freighterSignTransaction,
} from "@stellar/freighter-api";

// =============================
// CONFIG
// =============================
const CONTRACT_ID = "CBBRQYEOT6E2NQBXNUI6MOUXE32LVKNVBF4ZDZBOYUDPQRGWRSFBLGUI";
const NETWORK_PASSPHRASE = "Test SDF Network ; September 2015";
const RPC_URL = "https://soroban-testnet.stellar.org";

const server = new StellarSdk.rpc.Server(RPC_URL);
const contract = new StellarSdk.Contract(CONTRACT_ID);

// =============================
// ERROR TYPES
// =============================
const ERROR_TYPES = {
  WALLET_NOT_FOUND: "WALLET_NOT_FOUND",
  USER_REJECTED: "USER_REJECTED",
  NETWORK_ERROR: "NETWORK_ERROR",
  SIMULATION_FAILED: "SIMULATION_FAILED",
};

function classifyError(error) {
  const msg = error?.message?.toLowerCase() || "";
  if (msg.includes("not installed") || msg.includes("not found") || msg.includes("undefined") || msg.includes("no wallet"))
    return ERROR_TYPES.WALLET_NOT_FOUND;
  if (msg.includes("declined") || msg.includes("rejected") || msg.includes("cancel") || msg.includes("user rejected"))
    return ERROR_TYPES.USER_REJECTED;
  if (msg.includes("simulation") || msg.includes("simulate"))
    return ERROR_TYPES.SIMULATION_FAILED;
  return ERROR_TYPES.NETWORK_ERROR;
}

function getErrorMessage(type) {
  switch (type) {
    case ERROR_TYPES.WALLET_NOT_FOUND:
      return "❌ Wallet not installed. Please install Freighter or xBull.";
    case ERROR_TYPES.USER_REJECTED:
      return "❌ Transaction rejected by user.";
    case ERROR_TYPES.SIMULATION_FAILED:
      return "❌ Transaction simulation failed. Try again.";
    default:
      return "❌ Network error. Please check your connection.";
  }
}

// =============================
// APP
// =============================
function App() {
  const [selectedWallet, setSelectedWallet] = useState("");
  const [publicKey, setPublicKey] = useState("");
  const [activeWallet, setActiveWallet] = useState("");
  const [status, setStatus] = useState("idle");
  const [statusMsg, setStatusMsg] = useState("Select a wallet to get started");
  const [txHash, setTxHash] = useState("");
  const [votes, setVotes] = useState({ a: 0, b: 0 });
  const [loading, setLoading] = useState(false);
  const [lastVoted, setLastVoted] = useState(null);
  const [events, setEvents] = useState([]);

  // =============================
  // FETCH RESULTS
  // =============================
  const fetchResults = useCallback(async () => {
    try {
      if (!publicKey) return;
      const account = await server.getAccount(publicKey);

      const tx = new StellarSdk.TransactionBuilder(account, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(contract.call("get_results"))
        .setTimeout(30)
        .build();

      const simulation = await server.simulateTransaction(tx);

      if (StellarSdk.rpc.Api.isSimulationSuccess(simulation)) {
        const retval = simulation.result?.retval;
        if (retval) {
          const tuple = retval.value();
          setVotes({
            a: Number(tuple[0].value()),
            b: Number(tuple[1].value()),
          });
        }
      }
    } catch (e) {
      console.log("Result fetch failed:", e.message);
    }
  }, [publicKey]);

  // =============================
  // FETCH EVENTS
  // =============================
  const fetchEvents = useCallback(async () => {
    try {
      const latestLedger = await server.getLatestLedger();
      const startLedger = Math.max(1, latestLedger.sequence - 1000);

      const response = await server.getEvents({
        startLedger,
        filters: [{ type: "contract", contractIds: [CONTRACT_ID] }],
        limit: 10,
      });

      if (response.events && response.events.length > 0) {
        const parsed = response.events.map((e) => ({
          id: e.id,
          option: (() => {
            try {
              const t = e.topic?.[1];
              if (!t) return "Unknown";
              const raw = t.value?.();
              const str = raw instanceof Uint8Array
                ? Buffer.from(raw).toString("utf8")
                : String(raw ?? "");
              return str === "vote_a" ? "Option A" : "Option B";
            } catch { return "Unknown"; }
          })(),
          ledger: e.ledger,
        }));
        setEvents(parsed.slice(0, 5));
      }
    } catch (e) {
      console.log("Event fetch failed:", e.message);
    }
  }, []);

  // Poll every 5 seconds
  useEffect(() => {
    if (!publicKey) return;
    fetchResults();
    fetchEvents();
    const interval = setInterval(() => {
      fetchResults();
      fetchEvents();
    }, 5000);
    return () => clearInterval(interval);
  }, [publicKey, fetchResults, fetchEvents]);

  // =============================
  // SIGN TRANSACTION
  // =============================
  const signTx = async (xdr) => {
    if (activeWallet === "freighter") {
      const result = await freighterSignTransaction(xdr, {
        networkPassphrase: NETWORK_PASSPHRASE,
      });
      if (result.error) throw new Error(result.error);
      return result.signedTxXdr;
    } else if (activeWallet === "xbull") {
      const result = await window.xBullSDK.signXDR(xdr, {
        networkPassphrase: NETWORK_PASSPHRASE,
      });
      if (!result) throw new Error("User declined");
      return result;
    }
    throw new Error("No wallet connected");
  };

  // =============================
  // CONNECT WALLET
  // =============================
  const connectWallet = async () => {
    try {
      if (!selectedWallet) {
        setStatusMsg("⚠️ Please select a wallet first");
        return;
      }
      setStatus("connecting");
      setStatusMsg("🔄 Connecting wallet...");
      setLoading(true);

      if (selectedWallet === "freighter") {
        const connResult = await freighterIsConnected();
        if (!connResult || !connResult.isConnected) {
          throw new Error("Freighter not installed. Please install from freighter.app");
        }
        const accessResult = await requestAccess();
        if (accessResult.error) throw new Error(accessResult.error);

        const addressResult = await getAddress();
        if (addressResult.error) throw new Error(addressResult.error);
        if (!addressResult.address) throw new Error("No address returned from Freighter");

        setPublicKey(addressResult.address);
        setActiveWallet("freighter");
        setStatus("idle");
        setStatusMsg("✅ Freighter connected: " + addressResult.address.slice(0, 6) + "..." + addressResult.address.slice(-4));

      } else if (selectedWallet === "xbull") {
        if (typeof window.xBullSDK === "undefined") {
          throw new Error("xBull not installed. Please install from xbull.app");
        }
        const response = await window.xBullSDK.connect({
          canRequestPublicKey: true,
          canRequestSign: true,
        });
        if (!response) throw new Error("User declined xBull connection");

        const addr = response.publicKey || (await window.xBullSDK.getPublicKey());
        if (!addr) throw new Error("No address returned from xBull");

        setPublicKey(addr);
        setActiveWallet("xbull");
        setStatus("idle");
        setStatusMsg("✅ xBull connected: " + addr.slice(0, 6) + "..." + addr.slice(-4));
      }

    } catch (error) {
      console.error("connectWallet error:", error);
      setStatus("error");
      setStatusMsg(getErrorMessage(classifyError(error)));
    } finally {
      setLoading(false);
    }
  };

  // =============================
  // VOTE — balance check removed, direct transaction
  // =============================
  const vote = async (method) => {
    try {
      if (!publicKey) {
        setStatusMsg("❌ Please connect your wallet first");
        return;
      }
      setLoading(true);
      setTxHash("");
      setStatus("voting");
      setStatusMsg("🔄 Building transaction...");

      const account = await server.getAccount(publicKey);

      // ✅ No balance check — you have enough XLM
      let tx = new StellarSdk.TransactionBuilder(account, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(contract.call(method))
        .setTimeout(30)
        .build();

      setStatusMsg("⚡ Simulating transaction...");
      const simulation = await server.simulateTransaction(tx);
      if (simulation.error) {
        throw new Error("simulation failed: " + simulation.error);
      }

      tx = StellarSdk.rpc.assembleTransaction(tx, simulation).build();
      setStatusMsg("✍️ Waiting for wallet signature...");

      let signedXDR;
      try {
        signedXDR = await signTx(tx.toXDR());
      } catch (e) {
        throw new Error("User declined");
      }

      const signedTx = StellarSdk.TransactionBuilder.fromXDR(signedXDR, NETWORK_PASSPHRASE);

      setStatus("pending");
      setStatusMsg("⏳ Submitting transaction...");
      const result = await server.sendTransaction(signedTx);

      if (result.status === "PENDING") {
        setStatusMsg("⏳ Transaction pending confirmation...");
        await pollTransactionStatus(result.hash);
      } else if (result.status === "ERROR") {
        throw new Error("Transaction failed on network");
      }

      setStatus("success");
      setStatusMsg("✅ Vote submitted successfully!");
      setTxHash(result.hash);
      setLastVoted(method === "vote_a" ? "A" : "B");

      setTimeout(() => {
        fetchResults();
        fetchEvents();
      }, 2000);

    } catch (error) {
      console.error(error);
      setStatus("error");
      setStatusMsg(getErrorMessage(classifyError(error)));
    } finally {
      setLoading(false);
    }
  };

  // =============================
  // POLL TRANSACTION STATUS
  // =============================
  const pollTransactionStatus = async (hash) => {
    for (let i = 0; i < 10; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      try {
        const tx = await server.getTransaction(hash);
        if (tx.status === "SUCCESS") return;
        if (tx.status === "FAILED") throw new Error("Transaction failed");
      } catch (e) {
        if (e.message === "Transaction failed") throw e;
      }
    }
  };

  // =============================
  // COMPUTED
  // =============================
  const totalVotes = votes.a + votes.b;
  const percentA = totalVotes > 0 ? Math.round((votes.a / totalVotes) * 100) : 50;
  const percentB = totalVotes > 0 ? Math.round((votes.b / totalVotes) * 100) : 50;

  // =============================
  // UI
  // =============================
  return (
    <div style={styles.container}>
      <div style={styles.card}>

        <div style={styles.header}>
          <h1 style={styles.title}>🗳️ Live Poll</h1>
          <p style={styles.subtitle}>Vote on-chain · Results update in real-time</p>
        </div>

        {/* SELECT WALLET */}
        <div style={styles.section}>
          <p style={styles.label}>Select Wallet</p>
          <div style={styles.walletRow}>
            <button
              style={{ ...styles.walletBtn, ...(selectedWallet === "freighter" ? styles.walletBtnActive : {}) }}
              onClick={() => setSelectedWallet("freighter")}
            >
              🪐 Freighter
            </button>
            <button
              style={{ ...styles.walletBtn, ...(selectedWallet === "xbull" ? styles.walletBtnActive : {}) }}
              onClick={() => setSelectedWallet("xbull")}
            >
              🐂 xBull
            </button>
          </div>
          <button
            style={{ ...styles.connectBtn, opacity: loading ? 0.7 : 1 }}
            onClick={connectWallet}
            disabled={loading}
          >
            {loading && status === "connecting" ? "Connecting..." : "Connect Wallet"}
          </button>
        </div>

        {/* STATUS BAR */}
        <div
          style={{
            ...styles.statusBar,
            background:
              status === "success" ? "#d4edda"
              : status === "error" ? "#f8d7da"
              : status === "pending" ? "#fff3cd"
              : "#e9ecef",
            color:
              status === "success" ? "#155724"
              : status === "error" ? "#721c24"
              : status === "pending" ? "#856404"
              : "#495057",
          }}
        >
          {statusMsg}
        </div>

        {/* CAST YOUR VOTE */}
        <div style={styles.section}>
          <p style={styles.label}>Cast Your Vote</p>
          <div style={styles.voteRow}>
            <button
              style={{ ...styles.voteBtn, background: lastVoted === "A" ? "#00b894" : "#00cec9", opacity: loading ? 0.6 : 1 }}
              onClick={() => vote("vote_a")}
              disabled={loading}
            >
              {loading && status === "voting" ? "⏳ Voting..." : "✅ Vote Option A"}
            </button>
            <button
              style={{ ...styles.voteBtn, background: lastVoted === "B" ? "#6c63ff" : "#a29bfe", opacity: loading ? 0.6 : 1 }}
              onClick={() => vote("vote_b")}
              disabled={loading}
            >
              {loading && status === "voting" ? "⏳ Voting..." : "✅ Vote Option B"}
            </button>
          </div>
        </div>

        {/* LIVE RESULTS */}
        <div style={styles.section}>
          <p style={styles.label}>
            Live Results {publicKey && <span style={styles.liveTag}>● LIVE</span>}
          </p>
          <div style={styles.resultRow}>
            <span style={styles.resultLabel}>Option A</span>
            <div style={styles.barBg}>
              <div style={{ ...styles.barFill, width: percentA + "%", background: "#00b894" }} />
            </div>
            <span style={styles.resultCount}>{votes.a} ({percentA}%)</span>
          </div>
          <div style={styles.resultRow}>
            <span style={styles.resultLabel}>Option B</span>
            <div style={styles.barBg}>
              <div style={{ ...styles.barFill, width: percentB + "%", background: "#6c63ff" }} />
            </div>
            <span style={styles.resultCount}>{votes.b} ({percentB}%)</span>
          </div>
          <p style={styles.totalVotes}>Total votes: {totalVotes}</p>
        </div>

        {/* RECENT EVENTS */}
        {events.length > 0 && (
          <div style={styles.section}>
            <p style={styles.label}>Recent Vote Events</p>
            {events.map((e) => (
              <div key={e.id} style={styles.eventRow}>
                <span style={styles.eventDot}>●</span>
                <span style={styles.eventText}>
                  Vote cast for <strong>{e.option}</strong> at ledger {e.ledger}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* TX HASH */}
        {txHash && (
          <div style={styles.txBox}>
            <p style={styles.txLabel}>Transaction Hash:</p>
            <a
              href={"https://stellar.expert/explorer/testnet/tx/" + txHash}
              target="_blank"
              rel="noopener noreferrer"
              style={styles.txHash}
            >
              {txHash.slice(0, 20)}...{txHash.slice(-10)} ↗
            </a>
          </div>
        )}

        {/* CONNECTED ADDRESS */}
        {publicKey && (
          <p style={styles.addressText}>
            🔗 {publicKey.slice(0, 8)}...{publicKey.slice(-6)}
          </p>
        )}

      </div>
    </div>
  );
}

// =============================
// STYLES
// =============================
const styles = {
  container: {
    minHeight: "100vh", display: "flex", justifyContent: "center",
    alignItems: "center", background: "linear-gradient(135deg, #1e1e2f, #2c2c54)",
    padding: 20, fontFamily: "'Segoe UI', sans-serif",
  },
  card: {
    background: "white", padding: 36, borderRadius: 16,
    width: "100%", maxWidth: 460, boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
  },
  header: { textAlign: "center", marginBottom: 24 },
  title: { fontSize: 28, fontWeight: 700, margin: 0, color: "#1e1e2f" },
  subtitle: { fontSize: 13, color: "#888", marginTop: 6 },
  section: { marginBottom: 22 },
  label: { fontSize: 12, fontWeight: 600, color: "#888", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 },
  walletRow: { display: "flex", gap: 10, marginBottom: 12 },
  walletBtn: { flex: 1, padding: "10px 0", border: "2px solid #ddd", borderRadius: 8, background: "white", cursor: "pointer", fontSize: 14, fontWeight: 600, color: "#555" },
  walletBtnActive: { border: "2px solid #6c63ff", background: "#f0eeff", color: "#6c63ff" },
  connectBtn: { width: "100%", padding: 12, background: "#1e1e2f", color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 15, fontWeight: 600 },
  statusBar: { padding: "10px 14px", borderRadius: 8, fontSize: 13, marginBottom: 22, fontWeight: 500, wordBreak: "break-word" },
  voteRow: { display: "flex", gap: 12 },
  voteBtn: { flex: 1, padding: "14px 0", border: "none", borderRadius: 10, color: "white", cursor: "pointer", fontSize: 14, fontWeight: 700 },
  resultRow: { display: "flex", alignItems: "center", gap: 10, marginBottom: 10 },
  resultLabel: { width: 70, fontSize: 13, fontWeight: 600, color: "#333" },
  barBg: { flex: 1, height: 14, background: "#f0f0f0", borderRadius: 99, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 99, transition: "width 0.6s ease" },
  resultCount: { fontSize: 12, color: "#666", width: 80, textAlign: "right" },
  totalVotes: { textAlign: "center", fontSize: 12, color: "#aaa", marginTop: 6 },
  liveTag: { color: "#e74c3c", fontSize: 11, marginLeft: 6 },
  eventRow: { display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: "1px solid #f0f0f0" },
  eventDot: { color: "#6c63ff", fontSize: 10 },
  eventText: { fontSize: 12, color: "#555" },
  txBox: { background: "#f8f9fa", borderRadius: 8, padding: "10px 14px", marginBottom: 12 },
  txLabel: { fontSize: 11, color: "#888", margin: "0 0 4px 0", fontWeight: 600 },
  txHash: { fontSize: 12, color: "#6c63ff", wordBreak: "break-all", textDecoration: "none", fontWeight: 600 },
  addressText: { textAlign: "center", fontSize: 12, color: "#aaa", margin: 0 },
};

export default App;
