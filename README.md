# Quantum Purse

> ⚠️ **Warning:**  
> <span style="background-color:yellow; padding:3px; border-radius:3px;">For the moment, please be sure to see your PEERS value > 0 (your light node connections) before creating your wallet! See more details in the [Light Client](#light-client) section.</span>


Quantum Purse is a quantum-safe wallet for CKB in the form of a static web application. There's only code that runs in the browser. Any deployment mentioned after this only means serving Quantum Purse code for your browser remotely!

CKB addresses generated by Quantum Purse are quantum-safe, so assets transferred to these addresses remain secure against quantum threats.

Currently using an **under development** [CKB quantum resistant lockscript](https://github.com/cryptape/quantum-resistant-lock-script).

###### <u>Feature list</u>:

| Feature            | Details |
|--------------------|---------|
| **Signature type** | SPHINCS+ SHAKE128F SIMPLE |
| **Store model**    | Indexed DB |
| **Mnemonic standard**| BIP39 24 words - 256 bit secure |
| **Local encryption** | AES256 |
| **Key derivation** | Scrypt |
| **Authentication** | Password |
| **Password hashing** | Scrypt |
| **Lock script** | [CKB Quantum-Resistant Lock Script](https://github.com/cryptape/quantum-resistant-lock-script) |
| **RPC endpoint** | No |
| **Light Client** | Chrome based, Safari |
| **Nervos DAO** | is coming! |

###### Overview
<img width="628" alt="overview" src="https://github.com/user-attachments/assets/433a25dd-2845-4384-b9a3-e2374aac3227" />

###### Indexed DB store model
```
- Single encrypted master seed phrase
- Multiple encrypted SPHINCS+ key pairs
```

## Wallet recovery

When you import your seed phrase into Quantum Purse, it automatically restores your wallets by generating child keys sequentially, starting from index 1. The recovery process continues until it encounters 10 consecutive empty accounts (i.e., accounts with no transaction history). At that point, the total number of recovered wallets will be equal to the highest index of a non-empty wallet.

## Light client

Quantum Purse runs its own [CKB light client node](https://github.com/nervosnetwork/ckb-light-client) directly in your browser. The light client sync status is displayed on the right side of the app's header:

<img width="258" alt="header-right" src="https://github.com/user-attachments/assets/3a53afb8-2f38-43cd-866b-15ef603fa89e" />

**Important:** Ensure your PEERS value is greater than 0 before creating your wallet. This will be improved in the next release!

## How to use

The following are the recommended ways to use this software, ranked from most to least preferred:
1. Serve locally with webpack via `npm run start` (**recommended**). You can find other ways to serve the built `dist/` folder locally too.
2. Though you can deploy this app on remote servers for example using `npm run deploy` for github pages, this is **not recommended** due to security reasons.

###### <u>Restrictions</u>
GitHub Pages [does not support custom headers for cross-origin isolation](https://github.com/orgs/community/discussions/13309), which the light client depends on. Therefore, the light client will not work if deployed on GitHub Pages. You have two options:
1. Deploy to Vercel.
2. Stick with GitHub Pages but use a version that utilizes an RPC endpoint, like [this one](https://github.com/tea2x/quantum-purse-web-static/releases/tag/v1.0.0-rc1).

## Give a try?
I deployed 2 versions of this app and serve in 2 links below. Github pages' or Vercel role here is only to serve the app build(source code, instructions) for the app to intepret data from your local browser's indexedDB. You can definitely serve it on your github/vercel account (refer to command list) or best, serve it locally via `npm run start`!

###### <u>Gh-pages</u>:
- https://tea2x.github.io/quantum-purse-web-static/welcome
**Notes:** <span style="background-color:yellow; padding:3px; border-radius:3px;">NO Light Client</span>

###### <u>Vercel</u>:
- https://quantum-purse-vercel.vercel.app/
**Notes:** <span style="background-color:yellow; padding:3px; border-radius:3px;">With Light Client but only Chrome based, Safari are supported. Check [Light Client](#light-client) section for details.</span>

## Contribute
###### <u>Dependencies</u>
1. Rust and Cargo.
2. wasm-pack.
3. Docker Engine/Desktop (currently skipped).
4. Node ^20.

###### <u>Command list</u>
```shell
# Init git submodule
git submodule update --init

# Install all dependencies
npm install

# Run test
npm run test

# Run in development env
npm run start

# Build a production package
npm run build

# Deploy the web app to your GitHub Page
npm run deploy
```

## Notes

1. As of 2025, quantum resistance is still experimental. Use this software at your own risk.
2. Back up your seed phrases. Losing them means losing access to your wallet.
3. Quantum Purse does NOT store your passwords. Passwords are used only temporarily to encrypt and decrypt your secret data.
4. IndexedDB stores only public data (e.g., SPHINCS+ public keys) and encrypted secret data. Your SPHINCS+ private keys remain protected.
5. Forgot your password? Recover access by importing your seed phrase and setting a new password instantly.
6. Need help? Report issues on GitHub or contact us on Telegram: @quantumpurse.
7. Nervos DAO is coming!

## Commentary

Quantum Purse is designed as a static web app that runs entirely in the browser, with no backend or server involvement. This approach has both pros and cons:
- **Pros:** Shorter development time, cross-platform accessibility as long as a web browser is available.
- **Cons:** Vulnerable to browser-based threats such as malicious extensions, script injection, and other web-based attacks.

Quantum Purse requires users to enter their password for each transaction or key-related function. While the application securely erases (zeroizes) sensitive data after processing, **password input in JS environment doesn't offer complete zeroization over passwords/seed phrases**. So password/seed phrase input (seed phrase exporting included) remains a potential attack vector—this is in fact the weakest link in all password-based cryptocurrency wallets.

Until a proper SPHINCS+ hardware wallet is available for secure key management, follow these best practices to maximize security:

1. Use a dedicated device with minimal software (including web extensions) installed to run Quantum Purse.
2. Terminate the web browser after completing a transaction. Ideally, power off your computer to wipe residual password-related data from RAM.
3. For maximum security, use an air-gapped device (one with no internet connection) to run Quantum Purse. To sign a transaction:
   - Construct an unsigned transaction on an internet-connected device using your public address.
   - Transfer it via a secure USB drive (ensure it's malware-free) to the air-gapped device.
   - Sign the transaction on the air-gapped device.
   - Transfer the signed transaction back via USB and broadcast it using a tool like [this one](https://explorer.nervos.org/tools/broadcast-tx). You might want to test the broadcaster with JoyID signed transactions first!
   - This effectively turns your dedicated device into a quantum-safe offline signer.

While Quantum Purse is not yet optimized for air-gapped usage, implementing this functionality would require minimal effort. If you're interested, open an issue to let me know what you need!

Lastly, if you'd like to support my work and help me create more projects like this, consider buying me a coffee—every contribution counts!

<u>**Address**(to be a quantum-safe address soon!):</u> **_ckb1qrgqep8saj8agswr30pls73hra28ry8jlnlc3ejzh3dl2ju7xxpjxqgqqxeu0ghthh9tw5lllkw7hajcv5r5gj094q8u7dpk_**

<img width="200" alt="tungpham bit" src="https://github.com/user-attachments/assets/269fe4f6-827d-41b4-9806-1c962a439517" />

