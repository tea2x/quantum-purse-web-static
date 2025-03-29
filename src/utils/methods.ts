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
  return address.slice(0, sequenceStart) + "..." + address.slice(-sequenceEnd);
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
  let description = "Something went wrong";

  if (String(error) === "Decryption error: Error") {
    description = "Invalid password";
  } else if (String(error) === "Error: Insufficient balance!") {
    description = "Insufficient balance";
  }

  return description;
};
