# Getting the site live

Your repo (`Smart-Contract-`) currently contains only the Solidity contract
and Remix boilerplate — that's the whole reason Vercel returns `404: NOT_FOUND`.
There was nothing for it to serve. These new files fix that.

## 1. Add these files to the repo root

Copy every file from this folder straight into the root of
`mwebidouglas08-netizen/Smart-Contract-` (same level as `README.md`):

```
index.html
style.css
app.js
abi.json
config.js
vercel.json
StudentFees.sol      (correctly-named copy of udentFees.sol — optional but recommended)
```

You can keep `udentFees.sol` and the `artifacts/` folder as-is; they don't
interfere with the static site.

## 2. Deploy the contract itself (if you haven't yet)

The repo only has the *source* of `StudentFees.sol` — Vercel/GitHub can't
deploy a smart contract for you. Deploy it yourself first:

1. Open [Remix IDE](https://remix.ethereum.org), load `udentFees.sol`.
2. Compile with Solidity `^0.8.20`.
3. In **Deploy & Run Transactions**, set environment to **Injected Provider — MetaMask**,
   pick a testnet in MetaMask (Sepolia is set as the default here), and deploy.
4. Copy the deployed contract address.

## 3. Point the frontend at your deployed contract

Open `config.js` and edit:

```js
CONTRACT_ADDRESS: "0xYourDeployedAddressHere",
```

If you deployed to a different network than Sepolia, also update the
`NETWORK` block (chainIdHex, chainName, rpcUrls, blockExplorerUrls) to match.

## 4. Push and redeploy

```bash
git add index.html style.css app.js abi.json config.js vercel.json StudentFees.sol SETUP.md
git commit -m "Add frontend for StudentFees dApp"
git push
```

Vercel will auto-redeploy on push. `smart-contract-flax.vercel.app` should
then load the payment ledger UI instead of 404.

## 5. Test it

- Open the site, click **Connect Wallet** (needs MetaMask installed).
- Make sure MetaMask is on the same network as `config.js` (Sepolia by default) —
  the pill in the top bar will flag it if not.
- Get free Sepolia test ETH from a faucet (e.g. sepoliafaucet.com) if needed.
- Submit a test payment, then refresh the ledger to see it recorded.
