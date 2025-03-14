import { CKB_EXPLORER_URL } from "../../../utils/constants";

interface ExploreTransactionProps {
  txId: string;
}

const Transaction: React.FC<ExploreTransactionProps> = ({ txId }) => {
  return (
    <a
      href={`${CKB_EXPLORER_URL}/transaction/${txId}`}
      target="_blank"
      rel="noreferrer"
    >
      {txId}
    </a>
  );
};

interface ExploreAccountProps extends React.HTMLAttributes<HTMLAnchorElement> {
  address: string;
}

const Account: React.FC<ExploreAccountProps> = ({
  children,
  address,
  ...rest
}) => {
  return (
    <a
      href={`${CKB_EXPLORER_URL}/address/${address}`}
      target="_blank"
      rel="noreferrer"

      {...rest}
    >
      {children}
    </a>
  );
};

export const Explore = {
  Transaction,
  Account,
};
