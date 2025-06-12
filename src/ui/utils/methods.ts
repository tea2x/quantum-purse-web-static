import { CKB_DECIMALS, CKB_UNIT } from "./constants";

export const cx = (...classes: (string | undefined | boolean)[]) => {
  return classes.filter(Boolean).join(" ");
};

export const shortenAddress = (
  address: string | undefined,
  sequenceStart = 6,
  sequenceEnd = 4
) => {
  if (!address) return "";
  return address.slice(0, sequenceStart) + "....." + address.slice(-sequenceEnd);
};

export const formatBalance = (balance: string | bigint | undefined) => {
  if (!balance) return "Unknown";
  let value;
  if (typeof balance === "string") {
    value = BigInt(balance);
  } else {
    value = balance;
  }
  const ckbValue = value / BigInt(CKB_DECIMALS);
  return `${ckbValue
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",")} ${CKB_UNIT}`;
};

export const formatError = (error: any) => {
  let description = "";

  if (String(error).includes("Decryption error: Error")) {
    description = "Invalid password";
  } else if (
    (String(error).includes("Error: Light client not initialized"))
    || String(error).includes("SharedArrayBuffer is not defined")
  ) {
    description = "Light client not available: Insecure context.";
  } else {
    description = error?.message || error?.toString() || "Something went wrong!";
  }

  return description;
};
