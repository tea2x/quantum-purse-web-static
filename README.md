# Quantum Purse

Quantum Purse is a quantum-safe wallet for the CKB blockchain, currently utilizing the SPHINCS+ signature scheme (now renamed to FIPS 205 by NIST) and the [CKB Quantum-Resistant Lock Script](https://github.com/cryptape/quantum-resistant-lock-script). This is a software solution to manage your quantum resistant private keys (SPHINCS+ now). It relies on AES256 to protect your seed phrase (the master private key) and SPHINCS+ private keys (child private keys). The CKB addresses generated by Quantum Purse are quantum-safe, ensuring that assets transferred to these addresses remain secure against quantum threats.

#### Overview
<img width="535" alt="overview" src="https://github.com/user-attachments/assets/476323b5-9c75-4fa6-9d96-e004d97e3018" />

#### Indexed DB store model

```
+---------------------------------+
|    seed_phrase_store(single)    |
+---------------------------------+
|  Key: "seed_phrase"             |
|  Value: CipherPayload           |
|        - salt: String           |
|        - iv: String             |
|        - cipher_text: String    |
+---------------------------------+


+---------------------------------+
|    child_keys_store(multiple)   |
+---------------------------------+
|  Key: pub_key (String)          |
|  Value: SphincsPlusKeyPair      |
|        - index: u32             |
|        - pub_key: String        |
|        - pri_enc: CipherPayload |
+---------------------------------+
```

## Dependencies(major)
1. Rust and Cargo.
2. wasm-pack.
3. Docker Engine/Desktop.
4. Node.

## Build

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

# Deploy the web app to your github page
npm run deploy
```

## How to use this software?

The following are the recommended ways to use this software, ranked from most to least preferred:
1. run locally with `npm run start` (recommended).
2. run `npm run deploy` to deploy it on your own GitHub page and allow others to use it.

## Connection

Quantum Purse does not use centralized RPC endpoints but it runs it's own ckb light client right in your browser. When you first use the wallet and create child accounts, Quantum Purse automatically sets your starting block (the starting point where ckb light client starts sampling). For whatever reason these info gets lost e.g. wallet recovery in a new device, your account's starting block will be reset to 0 which requires a longer time syncing (might be 4 hours). In such case, you have to check the explorer and set stating blocks yourself (starting block is usually the blocks where your accounts has first transaction).

## Wallet recovery

When you import your seed phrase into QuantumPurse, the app automatically restores your wallets by generating child keys sequentially, starting from index 0.

The recovery process continues until it encounters 10 consecutive empty accounts (i.e., accounts with no transaction history). At that point, it is decided that the total number of recovered wallets will be equal to the highest index of a non-empty wallet plus one.

## Notes

1. As of 2025, Quantum resistance is still experimental. Use this software at your own risk.
2. Back up your seed phrases. Losing them means losing access to your wallet.
3. Quantum Purse does NOT store your passwords. Passwords are used only temporarily to encrypt and decrypt your secret data.
4. IndexedDB stores only public data (e.g., SPHINCS+ public keys) and encrypted secret data. Your private keys remain protected.
5. Forgot your password? You can recover access by importing your seed phrase and setting a new password instantly.
6. Need help? If you encounter an issue, report it on GitHub or contact us on Telegram: @quantumpurse.
7. Nervos DAO are comming soon.

## Commentary

Quantum Purse is designed as a static web app that utilizes web browser's execution engine. This means there's no backend or server involved, only the software that runs in the browser. There're both pros and cons to this approach. The pros is that it shortens development time and can access multiple platforms as long as users have their browser installed. The cons is that it is vulnerable to browser-based threats, such as malicious extensions, script injection, and other web-based attacks.

Quantum Purse requires users to enter their password for each transaction or key-related function. While the application ensures that sensitive data is securely erased (zeroized) after processing, the password input remains a potential attack vector. This is inherently the weakest link in all password-based cryptocurrency wallets.

Until a proper SPHINCS+ hardware wallet is available for secure key management, consider the following best practices to maximize security:

1. Use a dedicated device with minimal software installed to run Quantum Purse.
2. Terminate the web browser after completing a transaction. Ideally, power off your computer to ensure any residual data in RAM is wiped.
3. For maximum security, use an air-gapped device (one with no internet connection) to run Quantum Purse. To sign a transaction:
  - Construct an unsigned transaction on a separate, internet-connected device.
  - Transfer it via a secure USB drive (free from malware please ^^) to the air-gapped device.
  - Sign the transaction on the air-gapped device.
  - Transfer the signed transaction back via USB and broadcast it using a tool like [this one](https://explorer.nervos.org/tools/broadcast-tx). You might want to try with joyID signed transactions first ^^!
  - This effectively turns your dedicated device into a quantum-safe offline signer!

While Quantum Purse is not yet fully optimized for 3) - air-gapped usage, implementing such functionality would require minimal effort. If you're interested, open an issue to let me know what you need!

Lastly, I'll be building on CKB for at least 5 years ahead <3. To help me build more stuff like this, you can buy me a coffee: ckb1qrgqep8saj8agswr30pls73hra28ry8jlnlc3ejzh3dl2ju7xxpjxqgqqxeu0ghthh9tw5lllkw7hajcv5r5gj094q8u7dpk
