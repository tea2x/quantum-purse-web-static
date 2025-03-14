import { Select, SelectProps } from "antd";
import type { DefaultOptionType } from "antd/es/select";
import { useAccountSearch } from "../../hooks/useAccountSearch";

export interface AccountOption {
  address?: string | null;
  name: string;
  sphincsPlusPubKey: string;
  [key: string]: any;
}

interface CustomSelectProps {
  accounts: AccountOption[];
  customOptionRender?: (option: AccountOption) => React.ReactNode;
  customLabelRender?: (option: AccountOption) => React.ReactNode;
  onAccountChange?: (value: string, option: AccountOption) => void;
  debounceTime?: number;
  searchFields?: string[];
}

export type AccountSelectProps = CustomSelectProps &
  Omit<SelectProps, "options" | "onChange" | "optionRender" | "labelRender">;

const AccountSelect: React.FC<AccountSelectProps> = ({
  accounts,
  customOptionRender,
  customLabelRender,
  onAccountChange,
  debounceTime = 300,
  searchFields,
  ...restProps
}) => {
  const { searchTerm, filteredAccounts, handleSearch } = useAccountSearch(
    accounts,
    debounceTime,
    searchFields
  );

  const options = filteredAccounts.map((account) => ({
    label: JSON.stringify(account),
    value: account.address,
    data: account,
  }));

  const optionRender = customOptionRender
    ? (option: DefaultOptionType) => {
        const accountData = option.data as AccountOption;
        return customOptionRender(accountData);
      }
    : undefined;

  const labelRender = customLabelRender
    ? (option: DefaultOptionType) => {
        const accountData = JSON.parse(option.label as string) as AccountOption;
        return customLabelRender(accountData);
      }
    : undefined;

  const handleChange = (value: string, option: any) => {
    if (onAccountChange) {
      const accountData = option.data || option;
      onAccountChange(value, accountData);
    }
  };

  return (
    <Select
      showSearch
      filterOption={false}
      options={options}
      onSearch={handleSearch}
      searchValue={searchTerm}
      optionRender={optionRender}
      labelRender={labelRender}
      onChange={handleChange}
      allowClear
      placeholder="Please select account from your wallet"
      {...restProps}
    />
  );
};

export default AccountSelect;
