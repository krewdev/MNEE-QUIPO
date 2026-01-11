# How to Get WIF (Wallet Import Format) for BSV Transfers

## What is WIF?

**WIF (Wallet Import Format)** is a way to represent a Bitcoin/BSV private key as a string. It's used by the MNEE SDK to sign transactions.

**Format:**
- Starts with `K`, `L`, `5`, or `c` (depending on compression and network)
- 51-52 characters long
- Example: `L4rKjz4YgKZ7jVqL9mN2pQrT3sUvWxYzAbCdEfGhIjKlMnOpQrStUvWxY`

## ⚠️ Security Warning

**NEVER share your WIF or private key with anyone!**
- It gives full control over your Bitcoin/BSV address
- Store it securely (password manager, encrypted file)
- Never commit it to git or share publicly

---

## Option 1: From Bitcoin Wallet (Easiest) ✅

### Electrum Wallet

1. Open **Electrum** wallet
2. Go to **Wallet** → **Private Keys** → **Export**
3. Select your address
4. Copy the **WIF** format (not the hex private key)
5. Save it securely

### Other Wallets

Most Bitcoin wallets allow exporting private keys:
- **Electrum**: Wallet → Private Keys → Export
- **Bitcoin Core**: `dumpwallet` command
- **Exodus**: Settings → Wallet → Export Private Keys
- **Atomic Wallet**: Export wallet → Shows WIF

---

## Option 2: From Private Key (Conversion)

If you have a hex private key, convert it to WIF:

### Using Online Tool (⚠️ Use Offline for Security)

1. Use: https://www.bitaddress.org/ (download and run offline!)
2. Or: https://privatekeys.pw/converter
3. Enter your private key
4. Select **WIF Compressed** or **WIF Uncompressed**
5. Copy the WIF

### Using Python (Offline - Recommended)

```python
import hashlib
import base58

def private_key_to_wif(private_key_hex, compressed=True):
    # Add version byte (0x80 for mainnet, 0xef for testnet)
    version = b'\x80'
    
    # Convert hex to bytes
    private_key = bytes.fromhex(private_key_hex)
    
    # Add compression flag if needed
    if compressed:
        extended_key = version + private_key + b'\x01'
    else:
        extended_key = version + private_key
    
    # Double SHA256
    first_hash = hashlib.sha256(extended_key).digest()
    second_hash = hashlib.sha256(first_hash).digest()
    
    # Add checksum (first 4 bytes)
    checksum = second_hash[:4]
    extended_key_with_checksum = extended_key + checksum
    
    # Base58 encode
    wif = base58.b58encode(extended_key_with_checksum).decode('ascii')
    return wif

# Usage
private_key_hex = "your_private_key_hex_here"
wif = private_key_to_wif(private_key_hex, compressed=True)
print(f"WIF: {wif}")
```

---

## Option 3: From Mnemonic Seed Phrase

If you have a 12/24-word mnemonic seed phrase:

### Using BIP39 Tools

1. Use: https://iancoleman.io/bip39/ (download and run offline!)
2. Enter your mnemonic phrase
3. Select **BIP44** or **BIP32** derivation path
4. For Bitcoin/BSV, use path: `m/44'/0'/0'/0/0` (or `m/44'/236'/0'/0/0` for BSV)
5. Copy the **WIF** from the address row

### Using Script (Node.js)

```javascript
const { HDKey } = require('ed25519-hd-key');
const bip39 = require('bip39');
const bitcoin = require('bitcoinjs-lib');

// Your mnemonic
const mnemonic = 'your twelve word seed phrase here';

// Generate seed from mnemonic
const seed = bip39.mnemonicToSeedSync(mnemonic);

// Create HD wallet
const root = bitcoin.bip32.fromSeed(seed);

// Derive key for first address (m/44'/0'/0'/0/0)
const keyPair = root.derivePath("m/44'/0'/0'/0/0");

// Get WIF
const wif = keyPair.toWIF();
console.log('WIF:', wif);
```

---

## Option 4: Generate New WIF (For Testing)

### Using bitaddress.org (Offline - Recommended)

1. Download: https://github.com/pointbiz/bitaddress.org
2. Open `bitaddress.org.html` in browser (offline)
3. Move mouse randomly to generate entropy
4. Copy the **WIF Compressed** or **WIF** from the generated wallet
5. **Important**: Save both the address and WIF securely!

### Using Python

```python
from bitcoinlib.wallets import Wallet

# Generate new wallet
wallet = Wallet.create('MyWallet')
wif = wallet.get_key().wif()
print(f"WIF: {wif}")
print(f"Address: {wallet.get_key().address}")
```

---

## For BSV Specifically

BSV uses the same WIF format as Bitcoin. However, note:
- Mainnet WIF starts with `K` or `L` (compressed) or `5` (uncompressed)
- Testnet WIF starts with `c` (compressed)
- BSV addresses can be different format (usually starts with `1` or `3`)

---

## Adding WIF to .env File

Once you have your WIF:

1. Open `.env` file in project root
2. Add:

```env
BITCOIN_WIF=L4rKjz4YgKZ7jVqL9mN2pQrT3sUvWxYzAbCdEfGhIjKlMnOpQrStUvWxY
```

3. Save the file
4. The CLI will use it automatically (no prompting)

---

## Using WIF in CLI

### Option A: Set in .env (Recommended)

```env
MNEE_API_KEY=your_mnee_api_key
BITCOIN_WIF=L4rKjz4YgKZ7jVqL9mN2pQrT3sUvWxYzAbCdEfGhIjKlMnOpQrStUvWxY
```

### Option B: Enter When Prompted

If `BITCOIN_WIF` is not set, the CLI will prompt you:

```
🔑 MNEE SDK requires Bitcoin WIF (Wallet Import Format) for BSV transfers
   WIF is your private key in Wallet Import Format
   You can also set BITCOIN_WIF in .env to avoid this prompt

✔ Bitcoin WIF (Wallet Import Format) - Required for MNEE SDK: ****
```

---

## Security Best Practices

1. **Never share your WIF** - It's like your private key
2. **Store securely** - Use password manager or encrypted file
3. **Use offline tools** - Don't enter WIF on untrusted websites
4. **Test with small amounts first** - Verify everything works
5. **Backup safely** - Store WIF in multiple secure locations

---

## Troubleshooting

### "Invalid WIF format" Error

- WIF should be 51-52 characters
- Should start with `K`, `L`, `5`, or `c`
- Check for extra spaces or characters
- Make sure it's WIF, not hex private key

### WIF Not Working

- Verify it's the WIF for the correct address
- Check if it's mainnet vs testnet WIF
- Ensure you're using compressed WIF (usually starts with `K` or `L`)
- Try exporting from wallet again

### Need Help?

- Check your wallet's documentation for WIF export
- Use offline tools (bitaddress.org, iancoleman.io/bip39)
- Test with small amounts first
- Verify address matches WIF before using

---

**Remember**: Your WIF is your private key. Keep it secure! 🔒
