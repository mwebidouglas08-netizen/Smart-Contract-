// ============================================================
// StudentFees dApp — wallet + contract wiring (ethers.js v6)
// Reads CONTRACT_ADDRESS / NETWORK from config.js
// ============================================================

let provider, signer, contract, readContract, connectedAddress;

const els = {
  connectBtn: document.getElementById("connectBtn"),
  networkPill: document.getElementById("networkPill"),
  statBalance: document.getElementById("statBalance"),
  statCount: document.getElementById("statCount"),
  statOwner: document.getElementById("statOwner"),
  payForm: document.getElementById("payForm"),
  payBtn: document.getElementById("payBtn"),
  payStatus: document.getElementById("payStatus"),
  lookupForm: document.getElementById("lookupForm"),
  lookupStatus: document.getElementById("lookupStatus"),
  ownerPanel: document.getElementById("ownerPanel"),
  withdrawBtn: document.getElementById("withdrawBtn"),
  withdrawStatus: document.getElementById("withdrawStatus"),
  refreshBtn: document.getElementById("refreshBtn"),
  ledgerBody: document.getElementById("ledgerBody"),
};

// ---------- Contract ABI (mirrors abi.json — kept inline so the ----------
// ---------- app also works when opened directly via file://)   ----------
const ABI = [
  { "inputs": [], "stateMutability": "nonpayable", "type": "constructor" },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "string", "name": "studentId", "type": "string" },
      { "indexed": true, "internalType": "string", "name": "feeType", "type": "string" },
      { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" },
      { "indexed": true, "internalType": "address", "name": "payer", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "timestamp", "type": "uint256" }
    ],
    "name": "PaymentReceived", "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "to", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "timestamp", "type": "uint256" }
    ],
    "name": "FundsWithdrawn", "type": "event"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "name": "allPayments",
    "outputs": [
      { "internalType": "uint256", "name": "amount", "type": "uint256" },
      { "internalType": "uint256", "name": "timestamp", "type": "uint256" },
      { "internalType": "string", "name": "studentId", "type": "string" },
      { "internalType": "string", "name": "feeType", "type": "string" },
      { "internalType": "address", "name": "payer", "type": "address" },
      { "internalType": "bool", "name": "confirmed", "type": "bool" }
    ],
    "stateMutability": "view", "type": "function"
  },
  {
    "inputs": [], "name": "getBalance",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view", "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "index", "type": "uint256" }],
    "name": "getPayment",
    "outputs": [
      { "internalType": "string", "name": "studentId", "type": "string" },
      { "internalType": "string", "name": "feeType", "type": "string" },
      { "internalType": "uint256", "name": "amount", "type": "uint256" },
      { "internalType": "uint256", "name": "timestamp", "type": "uint256" },
      { "internalType": "address", "name": "payer", "type": "address" },
      { "internalType": "bool", "name": "confirmed", "type": "bool" }
    ],
    "stateMutability": "view", "type": "function"
  },
  {
    "inputs": [], "name": "getPaymentCount",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view", "type": "function"
  },
  {
    "inputs": [
      { "internalType": "string", "name": "studentId", "type": "string" },
      { "internalType": "string", "name": "feeType", "type": "string" }
    ],
    "name": "hasPaid",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "view", "type": "function"
  },
  {
    "inputs": [], "name": "owner",
    "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "stateMutability": "view", "type": "function"
  },
  {
    "inputs": [
      { "internalType": "string", "name": "studentId", "type": "string" },
      { "internalType": "string", "name": "feeType", "type": "string" }
    ],
    "name": "payFee", "outputs": [], "stateMutability": "payable", "type": "function"
  },
  {
    "inputs": [
      { "internalType": "string", "name": "", "type": "string" },
      { "internalType": "string", "name": "", "type": "string" }
    ],
    "name": "studentPayments",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view", "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "newOwner", "type": "address" }],
    "name": "transferOwnership", "outputs": [], "stateMutability": "nonpayable", "type": "function"
  },
  {
    "inputs": [], "name": "withdraw", "outputs": [], "stateMutability": "nonpayable", "type": "function"
  }
];

function setStatus(el, msg, kind) {
  el.textContent = msg || "";
  el.className = "status-line" + (kind ? " " + kind : "");
}

function isConfigured() {
  return APP_CONFIG.CONTRACT_ADDRESS && /^0x[0-9a-fA-F]{40}$/.test(APP_CONFIG.CONTRACT_ADDRESS)
    && APP_CONFIG.CONTRACT_ADDRESS !== "0x0000000000000000000000000000000000000000";
}

function shortAddr(a) {
  return a ? a.slice(0, 6) + "…" + a.slice(-4) : "—";
}

// ---------- Read-only provider (works without wallet connected) ----------
function getReadProvider() {
  if (window.ethereum) return new ethers.BrowserProvider(window.ethereum);
  return new ethers.JsonRpcProvider(APP_CONFIG.NETWORK.rpcUrls[0]);
}

async function initReadContract() {
  if (!isConfigured()) return null;
  const rp = getReadProvider();
  return new ethers.Contract(APP_CONFIG.CONTRACT_ADDRESS, ABI, rp);
}

// ---------- Wallet connect ----------
async function connectWallet() {
  if (!window.ethereum) {
    setStatus(els.payStatus, "No wallet found. Install MetaMask to continue.", "err");
    window.open("https://metamask.io/download/", "_blank");
    return;
  }
  try {
    provider = new ethers.BrowserProvider(window.ethereum);
    const accounts = await provider.send("eth_requestAccounts", []);
    connectedAddress = accounts[0];
    signer = await provider.getSigner();

    if (isConfigured()) {
      contract = new ethers.Contract(APP_CONFIG.CONTRACT_ADDRESS, ABI, signer);
    }

    els.connectBtn.textContent = shortAddr(connectedAddress);
    els.connectBtn.disabled = true;
    await checkNetwork();
    await refreshAll();
  } catch (err) {
    console.error(err);
    setStatus(els.payStatus, "Wallet connection was rejected or failed.", "err");
  }
}

async function checkNetwork() {
  try {
    const net = await provider.getNetwork();
    const currentHex = "0x" + net.chainId.toString(16);
    els.networkPill.classList.remove("pill-hidden");
    if (currentHex.toLowerCase() !== APP_CONFIG.NETWORK.chainIdHex.toLowerCase()) {
      els.networkPill.textContent = "Wrong network";
      els.networkPill.classList.add("pill-warn");
    } else {
      els.networkPill.textContent = APP_CONFIG.NETWORK.chainName;
      els.networkPill.classList.remove("pill-warn");
    }
  } catch (e) { /* ignore */ }
}

// ---------- Stats + ledger ----------
async function refreshAll() {
  await Promise.all([refreshStats(), refreshLedger(), refreshOwnerPanel()]);
}

async function refreshStats() {
  if (!isConfigured()) {
    els.statBalance.textContent = "Not deployed";
    els.statCount.textContent = "—";
    els.statOwner.textContent = "Set CONTRACT_ADDRESS in config.js";
    return;
  }
  try {
    const rc = await initReadContract();
    const [balance, count, owner] = await Promise.all([
      rc.getBalance(),
      rc.getPaymentCount(),
      rc.owner(),
    ]);
    els.statBalance.textContent = ethers.formatEther(balance) + " ETH";
    els.statCount.textContent = count.toString();
    els.statOwner.textContent = shortAddr(owner);
    els.statOwner.title = owner;
    els.statOwner.dataset.full = owner;
  } catch (err) {
    console.error(err);
    els.statBalance.textContent = "—";
    els.statCount.textContent = "—";
    els.statOwner.textContent = "Error reading contract";
  }
}

async function refreshLedger() {
  if (!isConfigured()) {
    els.ledgerBody.innerHTML = `<tr><td colspan="6" class="empty-row">Contract address not set yet — edit config.js.</td></tr>`;
    return;
  }
  try {
    const rc = await initReadContract();
    const count = Number(await rc.getPaymentCount());
    if (count === 0) {
      els.ledgerBody.innerHTML = `<tr><td colspan="6" class="empty-row">No payments recorded yet.</td></tr>`;
      return;
    }
    const rows = [];
    // Show most recent first, cap at 50 rows for performance
    const start = Math.max(0, count - 50);
    for (let i = count - 1; i >= start; i--) {
      const p = await rc.getPayment(i);
      const [studentId, feeType, amount, timestamp, payer] = p;
      const date = new Date(Number(timestamp) * 1000).toLocaleString();
      rows.push(`
        <tr>
          <td>${i}</td>
          <td>${escapeHtml(studentId)}</td>
          <td>${escapeHtml(feeType)}</td>
          <td>${ethers.formatEther(amount)} ETH</td>
          <td>${shortAddr(payer)}</td>
          <td>${date}</td>
        </tr>`);
    }
    els.ledgerBody.innerHTML = rows.join("");
  } catch (err) {
    console.error(err);
    els.ledgerBody.innerHTML = `<tr><td colspan="6" class="empty-row">Could not load ledger. Check console for details.</td></tr>`;
  }
}

async function refreshOwnerPanel() {
  if (!isConfigured() || !connectedAddress) {
    els.ownerPanel.hidden = true;
    return;
  }
  try {
    const rc = await initReadContract();
    const owner = await rc.owner();
    els.ownerPanel.hidden = owner.toLowerCase() !== connectedAddress.toLowerCase();
  } catch (err) {
    els.ownerPanel.hidden = true;
  }
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// ---------- Pay fee ----------
els.payForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!isConfigured()) {
    setStatus(els.payStatus, "Contract address not set yet — edit config.js.", "err");
    return;
  }
  if (!signer || !contract) {
    setStatus(els.payStatus, "Connect your wallet first.", "err");
    return;
  }
  const studentId = document.getElementById("studentId").value.trim();
  const feeType = document.getElementById("feeType").value;
  const amount = document.getElementById("amount").value;

  if (!studentId || !feeType || !amount || Number(amount) <= 0) {
    setStatus(els.payStatus, "Fill in all fields with a valid amount.", "err");
    return;
  }

  try {
    els.payBtn.disabled = true;
    setStatus(els.payStatus, "Confirm the transaction in your wallet…", "pending");
    const tx = await contract.payFee(studentId, feeType, { value: ethers.parseEther(amount) });
    setStatus(els.payStatus, "Transaction sent. Waiting for confirmation…", "pending");
    await tx.wait();
    setStatus(els.payStatus, "Payment confirmed on-chain ✓", "ok");
    els.payForm.reset();
    await refreshAll();
  } catch (err) {
    console.error(err);
    setStatus(els.payStatus, parseError(err), "err");
  } finally {
    els.payBtn.disabled = false;
  }
});

// ---------- Lookup ----------
els.lookupForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!isConfigured()) {
    setStatus(els.lookupStatus, "Contract address not set yet — edit config.js.", "err");
    return;
  }
  const studentId = document.getElementById("lookupStudentId").value.trim();
  const feeType = document.getElementById("lookupFeeType").value;
  if (!studentId || !feeType) return;

  try {
    setStatus(els.lookupStatus, "Checking…", "pending");
    const rc = await initReadContract();
    const paid = await rc.hasPaid(studentId, feeType);
    setStatus(
      els.lookupStatus,
      paid ? `${studentId} has paid ${feeType} ✓` : `${studentId} has NOT paid ${feeType}`,
      paid ? "ok" : "err"
    );
  } catch (err) {
    console.error(err);
    setStatus(els.lookupStatus, parseError(err), "err");
  }
});

// ---------- Owner: withdraw ----------
els.withdrawBtn.addEventListener("click", async () => {
  if (!contract) return;
  try {
    els.withdrawBtn.disabled = true;
    setStatus(els.withdrawStatus, "Confirm withdrawal in your wallet…", "pending");
    const tx = await contract.withdraw();
    setStatus(els.withdrawStatus, "Withdrawing…", "pending");
    await tx.wait();
    setStatus(els.withdrawStatus, "Funds withdrawn ✓", "ok");
    await refreshAll();
  } catch (err) {
    console.error(err);
    setStatus(els.withdrawStatus, parseError(err), "err");
  } finally {
    els.withdrawBtn.disabled = false;
  }
});

els.refreshBtn.addEventListener("click", refreshAll);
els.connectBtn.addEventListener("click", connectWallet);

function parseError(err) {
  const msg = err?.reason || err?.shortMessage || err?.message || "Transaction failed.";
  return msg.length > 140 ? msg.slice(0, 140) + "…" : msg;
}

// React to wallet/network changes
if (window.ethereum) {
  window.ethereum.on?.("accountsChanged", () => window.location.reload());
  window.ethereum.on?.("chainChanged", () => window.location.reload());
}

// Kick off a read-only render immediately, before wallet connects
initReadContract().then(() => refreshAll());
