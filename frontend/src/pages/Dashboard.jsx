import { useState, useEffect } from "react";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;

function Dashboard() {
    const userId = parseInt(sessionStorage.getItem("userId") || "0");
    const accountId = parseInt(sessionStorage.getItem("accountId") || "0");
    const userName = sessionStorage.getItem("userName") || "User";

    const [account, setAccount] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [amount, setAmount] = useState("");
    const [description, setDescription] = useState("");
    const [loading, setLoading] = useState(true);
    const [txLoading, setTxLoading] = useState(false);

    // PIN Modal state
    const [showPinModal, setShowPinModal] = useState(false);
    const [pin, setPin] = useState("");
    const [pendingType, setPendingType] = useState(""); // "Deposit" or "Withdraw"
    const [pinError, setPinError] = useState("");

    // Pagination
    const [page, setPage] = useState(1);
    const PAGE_SIZE = 10;

    useEffect(() => {
        if (!userId) { window.location.href = "/SignInPage"; return; }
        fetchDashboard();
    }, []);

    const fetchDashboard = async () => {
        try {
            const res = await axios.get(`${API_URL}/api/user/dashboard/${userId}`);
            setAccount(res.data.account);
            setTransactions(res.data.transactions);
            setPage(1); // reset to first page on refresh
        } catch (e) {
            console.error("Failed to load dashboard", e);
        } finally {
            setLoading(false);
        }
    };

    // Step 1: user clicks Deposit/Withdraw → open PIN modal
    const requestTransaction = (type) => {
        const parsedAmount = parseFloat(amount);
        if (!parsedAmount || parsedAmount <= 0) { alert("Enter a valid amount."); return; }
        setPendingType(type);
        setPin("");
        setPinError("");
        setShowPinModal(true);
    };

    // Step 2: user confirms PIN inside modal → submit to backend
    const confirmTransaction = async () => {
        if (!pin) { setPinError("Please enter your PIN."); return; }
        setTxLoading(true);
        setPinError("");
        try {
            const endpoint = pendingType === "Deposit" ? "deposit" : "withdraw";
            await axios.post(`${API_URL}/api/user/${endpoint}`, {
                AccountID: accountId, UserID: userId,
                Amount: parseFloat(amount),
                Description: description || pendingType,
                PIN: pin
            });
            setShowPinModal(false);
            setAmount("");
            setDescription("");
            setPin("");
            await fetchDashboard();
        } catch (e) {
            setPinError(e.response?.data?.message || "Transaction failed.");
        } finally {
            setTxLoading(false);
        }
    };

    const handleLogout = () => {
        sessionStorage.clear();
        window.location.href = "/SignInPage";
    };

    if (loading) return (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
            <p style={{ color: "#94a3b8", fontSize: "1.2rem" }}>Loading your account...</p>
        </div>
    );

    const balance = account?.balance ?? 0;

    return (
        <div className="dashboard">
            {/* ── Header ── */}
            <header className="dash-header">
                <div className="dash-header-left">
                    <div className="dash-logo">💳 JustBank</div>
                    <span className="dash-greeting">Welcome back, <strong>{account?.firstName || userName}</strong></span>
                </div>
                <button className="btn-logout" onClick={handleLogout}>Sign Out</button>
            </header>

            <div className="dash-body">
                {/* ── Balance Card ── */}
                <div className="balance-card">
                    <p className="balance-label">Current Balance</p>
                    <h1 className="balance-value">
                        ₹{parseFloat(balance).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </h1>
                    <p className="balance-sub">Account #{account?.accountId} &nbsp;•&nbsp; {account?.email}</p>
                </div>

                <div className="dash-grid">
                    {/* ── Transaction Panel ── */}
                    <div className="dash-card">
                        <h2 className="card-title">Make a Transaction</h2>
                        <div className="form-group" style={{ marginBottom: "1rem" }}>
                            <label>Amount (₹)</label>
                            <input
                                type="number" placeholder="0.00" min="1"
                                value={amount}
                                onChange={e => setAmount(e.target.value)}
                                className="tx-input"
                            />
                        </div>
                        <div className="form-group" style={{ marginBottom: "1.5rem" }}>
                            <label>Description (optional)</label>
                            <input
                                type="text" placeholder="e.g. Groceries, Rent..."
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                className="tx-input"
                            />
                        </div>
                        <div className="tx-buttons">
                            <button className="btn-deposit" onClick={() => requestTransaction("Deposit")}>
                                ↑ Deposit
                            </button>
                            <button className="btn-withdraw" onClick={() => requestTransaction("Withdraw")}>
                                ↓ Withdraw
                            </button>
                        </div>
                    </div>

                    {/* ── Account Details ── */}
                    <div className="dash-card">
                        <h2 className="card-title">Account Details</h2>
                        <div className="stat-row"><span>Full Name</span><strong>{account?.firstName} {account?.lastName}</strong></div>
                        <div className="stat-row"><span>Email</span><strong>{account?.email}</strong></div>
                        <div className="stat-row"><span>Phone</span><strong>{account?.phoneNumber}</strong></div>
                        <div className="stat-row"><span>Total Transactions</span><strong>{transactions.length}</strong></div>
                        <div className="stat-row">
                            <span>Total Deposited</span>
                            <strong className="green">
                                ₹{transactions.filter(t => t.transactionType?.trim() === "Deposit")
                                    .reduce((s, t) => s + t.amount, 0)
                                    .toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </strong>
                        </div>
                        <div className="stat-row">
                            <span>Total Withdrawn</span>
                            <strong className="red">
                                ₹{transactions.filter(t => t.transactionType?.trim() === "Withdraw")
                                    .reduce((s, t) => s + t.amount, 0)
                                    .toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </strong>
                        </div>
                    </div>
                </div>

                {/* ── Transaction History ── */}
                <div className="dash-card tx-history">
                    <h2 className="card-title">
                        Transaction History
                        <span style={{ float: "right", fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 400 }}>
                            {transactions.length} total
                        </span>
                    </h2>
                    {transactions.length === 0 ? (
                        <p style={{ color: "#94a3b8", textAlign: "center", padding: "2rem" }}>No transactions yet.</p>
                    ) : (() => {
                        const totalPages = Math.ceil(transactions.length / PAGE_SIZE);
                        const paginated = transactions.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
                        return (
                            <>
                                <div className="tx-table-wrap">
                                    <table className="tx-table">
                                        <thead>
                                            <tr>
                                                <th>Date & Time</th>
                                                <th>Description</th>
                                                <th>Type</th>
                                                <th>Amount</th>
                                                <th>Balance</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {paginated.map(tx => (
                                                <tr key={tx.transactionId}>
                                                    <td>{new Date(tx.createdAt).toLocaleString("en-IN")}</td>
                                                    <td>{tx.description}</td>
                                                    <td>
                                                        <span className={`tx-badge ${tx.transactionType?.trim() === "Deposit" ? "badge-deposit" : "badge-withdraw"}`}>
                                                            {tx.transactionType?.trim() === "Deposit" ? "↑" : "↓"} {tx.transactionType?.trim()}
                                                        </span>
                                                    </td>
                                                    <td className={tx.transactionType?.trim() === "Deposit" ? "green" : "red"}>
                                                        {tx.transactionType?.trim() === "Deposit" ? "+" : "-"}₹{parseFloat(tx.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                                    </td>
                                                    <td>₹{parseFloat(tx.balanceAfter).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {totalPages > 1 && (
                                    <div className="pagination">
                                        <button className="pg-btn" onClick={() => setPage(p => p - 1)} disabled={page === 1}>← Prev</button>
                                        <div className="pg-numbers">
                                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                                                <button key={n} className={`pg-num ${n === page ? "pg-active" : ""}`} onClick={() => setPage(n)}>{n}</button>
                                            ))}
                                        </div>
                                        <button className="pg-btn" onClick={() => setPage(p => p + 1)} disabled={page === totalPages}>Next →</button>
                                    </div>
                                )}
                            </>
                        );
                    })()}
                </div>
            </div>

            {/* ── PIN Confirmation Modal ── */}
            {showPinModal && (
                <div className="pin-overlay">
                    <div className="pin-modal">
                        <div className="pin-modal-header">
                            <span className={pendingType === "Deposit" ? "pin-icon green" : "pin-icon red"}>
                                {pendingType === "Deposit" ? "↑" : "↓"}
                            </span>
                            <h2>Confirm {pendingType}</h2>
                            <p className="pin-amount">
                                ₹{parseFloat(amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                {description && <span> — {description}</span>}
                            </p>
                        </div>
                        <div className="pin-modal-body">
                            <label>Enter your PIN to confirm</label>
                            <input
                                type="password"
                                className="tx-input pin-dots"
                                placeholder="••••"
                                maxLength={6}
                                value={pin}
                                onChange={e => setPin(e.target.value)}
                                onKeyDown={e => e.key === "Enter" && confirmTransaction()}
                                autoFocus
                            />
                            {pinError && <p className="pin-error">{pinError}</p>}
                        </div>
                        <div className="pin-modal-footer">
                            <button
                                className="btn-cancel"
                                onClick={() => { setShowPinModal(false); setPinError(""); }}
                                disabled={txLoading}
                            >
                                Cancel
                            </button>
                            <button
                                className={pendingType === "Deposit" ? "btn-deposit" : "btn-withdraw"}
                                onClick={confirmTransaction}
                                disabled={txLoading}
                                style={{ flex: 1 }}
                            >
                                {txLoading ? "Processing..." : `Confirm ${pendingType}`}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Dashboard;