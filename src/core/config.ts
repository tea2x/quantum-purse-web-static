export const IS_MAIN_NET = false;
export const FEE_RATE = BigInt(1500);

// Currently use a binary from the following commit:
// https://github.com/cryptape/quantum-resistant-lock-script/pull/14/commits/bd5f76e877327052146aaf4dc9fe741989d52713
// The cell containing this binary will properly have a dead lock script with a codehash of all zeros to be Quantum Safe
// when the lockscript goes main-net. TODO replace smart contract info when deployed
export const SPHINCSPLUS_LOCK = {
  codeHash:
    "0x52ee8e71396abd2997f7f02697dd4c30c34d751ba7541db1817922b7add4a4a0",
  hashType: "data1",
  outPoint: {
    txHash:
      "0x4300037e02b79d50000fea127ff8f1ca620eb28ddb333f76437f9fb8fbfaacb3",
    index: "0x0",
  },
  depType: "code",
};

// Nervos DAO contract
export const NERVOS_DAO = IS_MAIN_NET
  ? {
    codeHash:
      "0x82d76d1b75fe2fd9a27dfbaa65a039221a380d76c926f378d3f81cf3e7e13f2e",
    hashType: "type",
    outPoint: {
      txHash:
        "0xe2fb199810d49a4d8beec56718ba2593b665db9d52299a0f9e6e75416d73ff5c",
      index: "0x2",
    },
    depType: "code",
  } : {
    codeHash:
      "0x82d76d1b75fe2fd9a27dfbaa65a039221a380d76c926f378d3f81cf3e7e13f2e",
    hashType: "type",
    outPoint: {
      txHash:
        "0x8f8c79eb6671709633fe6a46de93c0fedc9c1b8a6527a18d3983879542635c9f",
      index: "0x2",
    },
    depType: "code",
  };