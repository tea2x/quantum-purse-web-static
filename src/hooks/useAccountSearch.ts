import { useMemo, useState } from "react";
import { useDebounce } from "./useDebounce";

interface Account {
  address?: string | null;
  name: string;
  sphincsPlusPubKey: string;
  balance?: string;
  [key: string]: any;
}

export function useAccountSearch<T extends Account>(
  accounts: T[],
  debounceTime: number = 300,
  searchFields: string[] = ["name", "address", "sphincsPlusPubKey"]
) {
  const [searchTerm, setSearchTerm] = useState<string>("");
  const debouncedSearchTerm = useDebounce(searchTerm, debounceTime);

  const filteredAccounts = useMemo(() => {
    if (!debouncedSearchTerm.trim()) {
      return accounts;
    }

    const searchTermLower = debouncedSearchTerm.toLowerCase();
    return accounts.filter((account) => {
      return searchFields.some((field) => {
        const value = account[field];
        return value && String(value).toLowerCase().includes(searchTermLower);
      });
    });
  }, [accounts, debouncedSearchTerm, searchFields]);

  const handleSearch = (value: string) => {
    setSearchTerm(value);
  };

  return {
    searchTerm,
    debouncedSearchTerm,
    filteredAccounts,
    handleSearch,
  };
}

export default useAccountSearch;
