import { expect } from "chai";
import QuantumPurse, { SphincsVariant } from "../src/core/quantum_purse";
import { utf8ToBytes, bytesToUtf8 } from "../src/core/utils";
import __wbg_init from "quantum-purse-key-vault";
import { dummyTx } from "./dummy_tx";

describe("Quantum Purse Basics", () => {
  let wallet: QuantumPurse;
  let passwordStr: string = "my pa$sword is easy to crack. D0n't use this!";
  let seedPhrase36: string =
    "stand hospital survey mixed lucky inject swing robust swamp dress off cotton biology announce atom job oak glance silent frame creek dose antenna cable crater improve make identify adult acquire cargo cruel lava wave lonely remind";
  let seedPhrase54: string =
    "track adapt organ custom ladder save modify essence dawn idea main basic prison drill chef bronze virus betray zebra govern kitchen auction art task olive fabric horror extend galaxy spider near west rent large roof conduct swamp virus sugar seat addict decorate east wall ginger isolate lumber author meadow exile elbow sugar tennis other";
  let seedPhraseInvalidChecksum: string =
    "stand hospital survey mixed lucky inject swing robust swamp dress off cotton biology announce atom job oak glance silent frame creek dose antenna cable crater improve make identify adult acquire cargo cruel lava wave lonely improve";
  let seedPhraseContainInvalidWords: string =
    "stand hospital survey mixed lucky inject swing robust swamp dress off cotton biology announce atom job oak glance silent frame creek dose antenna cable crater improve make identify adult acquire cargo cruel lava wave lonely thisisnotaword";

  before(async () => {
    // Manually initialize Wasm with Karma-served file
    const wasmResponse = await fetch("/base/node_modules/quantum-purse-key-vault/quantum_purse_key_vault_bg.wasm");
    const wasmBuffer = await wasmResponse.arrayBuffer();
    await __wbg_init(wasmBuffer);
    wallet = await QuantumPurse.getInstance();
    wallet.initKeyVault(SphincsVariant.Shake128F);
  });

  afterEach(async () => {
    await wallet.deleteWallet();
  });

  it("Should export the exact seed imported", async () => {
    await wallet.importSeedPhrase(
      utf8ToBytes(seedPhrase36),
      utf8ToBytes(passwordStr)
    );
    const exportedSeedPhrase = await wallet.exportSeedPhrase(
      utf8ToBytes(passwordStr)
    );
    expect(bytesToUtf8(exportedSeedPhrase)).to.eq(seedPhrase36);
  });

  it("Should zeroize password after wallet init", async () => {
    let passwordStrHandler = utf8ToBytes(passwordStr);
    await wallet.generateMasterSeed(passwordStrHandler);
    expect(passwordStrHandler.every((byte) => byte === 0)).to.be.true;
  });

  it("Should zeroize password after generating an account", async () => {
    let passwordStrHandler = utf8ToBytes(passwordStr);
    await wallet.generateMasterSeed(passwordStrHandler);

    passwordStrHandler = utf8ToBytes(passwordStr);
    await wallet.genAccount(passwordStrHandler);
    expect(passwordStrHandler.every((byte) => byte === 0)).to.be.true;
  });

  it("Should zeroize seed phrase and password after importing a new seed phrase", async () => {
    const seedPhraseHandler = utf8ToBytes(seedPhrase36);
    const passwordStrHandler = utf8ToBytes(passwordStr);
    await wallet.importSeedPhrase(seedPhraseHandler, passwordStrHandler);
    expect(seedPhraseHandler.every((byte) => byte === 0)).to.be.true;
    expect(passwordStrHandler.every((byte) => byte === 0)).to.be.true;
  });

  it("Should zeroize password after exporting seed phrase", async () => {
    let passwordStrHandler = utf8ToBytes(passwordStr);
    await wallet.generateMasterSeed(passwordStrHandler);

    passwordStrHandler = utf8ToBytes(passwordStr);
    await wallet.exportSeedPhrase(passwordStrHandler);
    expect(passwordStrHandler.every((byte) => byte === 0)).to.be.true;
  });

  // it.skip("Should zeroize password after signing a transaction", async () => {
  //   let passwordStrHandler = utf8ToBytes(passwordStr);
  //   const seedPhraseHandler = utf8ToBytes(seedPhrase36);
  //   await wallet.importSeedPhrase(seedPhraseHandler, passwordStrHandler);

  //   passwordStrHandler = utf8ToBytes(passwordStr);
  //   await wallet.genAccount(passwordStrHandler);
  //   const accountList = await wallet.getAllLockScriptArgs();

  //   passwordStrHandler = utf8ToBytes(passwordStr);
  //   await wallet.setAccountPointer(accountList[0]);
  //   const signedTx = await wallet.sign(dummyTx, passwordStrHandler);
  //   expect(passwordStrHandler.every((byte) => byte === 0)).to.be.true;
  // });

  it("Should zeroize password after generating account batch", async () => {
    let passwordStrHandler = utf8ToBytes(passwordStr);
    await wallet.generateMasterSeed(passwordStrHandler);

    passwordStrHandler = utf8ToBytes(passwordStr);
    await wallet.genAccountInBatch(passwordStrHandler, 0, 3);
    expect(passwordStrHandler.every((byte) => byte === 0)).to.be.true;
  });

  it("Should zeroize password after recovering accounts", async () => {
    const seedPhraseHandler = utf8ToBytes(seedPhrase36);
    let passwordStrHandler = utf8ToBytes(passwordStr);
    await wallet.importSeedPhrase(seedPhraseHandler, passwordStrHandler);

    passwordStrHandler = utf8ToBytes(passwordStr);
    await wallet.recoverAccounts(passwordStrHandler, 3);
    expect(passwordStrHandler.every((byte) => byte === 0)).to.be.true;
  });

  it("Should zeroize password after checking password", async () => {
    let passwordStrHandler = utf8ToBytes(passwordStr);
    await QuantumPurse.checkPassword(passwordStrHandler, 128);
    expect(passwordStrHandler.every((byte) => byte === 0)).to.be.true;
  });

  it("Should throw when importing seedphrase with invalid check sum", async () => {
    const seedPhraseHandler = utf8ToBytes(seedPhraseInvalidChecksum);
    const passwordStrHandler = utf8ToBytes(passwordStr);
    try {
      await wallet.importSeedPhrase(seedPhraseHandler, passwordStrHandler);
      expect.fail("Expected an error to be thrown");
    } catch (error) {
      console.error(error)
      expect(error).to.contain("the mnemonic has an invalid checksum");
    }
  });

  it("Should throw when importing seedphrase with invalid words", async () => {
    const seedPhraseHandler = utf8ToBytes(seedPhraseContainInvalidWords);
    const passwordStrHandler = utf8ToBytes(passwordStr);
    try {
      await wallet.importSeedPhrase(seedPhraseHandler, passwordStrHandler);
      expect.fail("Expected an error to be thrown");
    } catch (error) {
      console.error(error)
      expect(error).to.contain("mnemonic contains an unknown word");
    }
  });

  it("Should throw when use 48 word seed phrase for 256/(same 192) sphincs+ variants", async () => {
    wallet.initKeyVault(SphincsVariant.Sha2256S);
    const seedPhraseHandler = utf8ToBytes(seedPhrase54);
    const passwordStrHandler = utf8ToBytes(passwordStr);
    try {
      await wallet.importSeedPhrase(seedPhraseHandler, passwordStrHandler);
      expect.fail("Expected an error to be thrown");
    } catch (error) {
      console.error(error)
      expect(error).to.contain("Mismatch: The chosen SPHINCS+ parameter set");
    }
  });
});