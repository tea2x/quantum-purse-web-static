import blake2b, { Blake2b } from "blake2b";
import { bytes, BytesLike } from "@ckb-lumos/codec";
const { bytify, hexify, bytifyRawString } = bytes;

export type HexString = string;
export type Hexadecimal = string;
export type Hash = HexString;
export type HexNumber = Hexadecimal;
export type PackedSince = string;
export type PackedDao = string;
export type Address = string;
export type HexadecimalRange = [Hexadecimal, Hexadecimal];

type CKBHasherOptions = {
  outLength?: number;
};

class CKBSphincsPlusHasher {
  hasher: Blake2b;
  outLength: number;

  // Aligning with onchain hasher: https://github.com/xxuejie/quantum-resistant-lock-script/blob/bf2ab2a7a01a21c48d1151e0c488c66e0e4199c9/crates/ckb-fips205-utils/src/lib.rs#L104
  constructor(options: CKBHasherOptions = {}) {
    const { outLength = 32 } = options;
    this.outLength = outLength;
    this.hasher = blake2b(
      outLength,
      undefined,
      undefined,
      bytifyRawString("ckb-sphincs+-sct")
    );
  }

  update(data: string | ArrayBuffer): this {
    this.hasher.update(bytify(data));
    return this;
  }

  digestHex(): Hash {
    const out = new Uint8Array(this.outLength);
    this.hasher.digest(out);
    return hexify(out.buffer);
  }
}

// function ckbSpxHash(data: BytesLike): Hash {
//   const hasher = new CKBSphincsPlusHasher();
//   hasher.update(bytes.bytify(data));
//   return hasher.digestHex();
// }

export { CKBSphincsPlusHasher };
