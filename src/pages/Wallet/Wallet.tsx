import {
  CopyOutlined,
  GlobalOutlined,
  MoreOutlined,
  QrcodeOutlined,
  SwapOutlined,
} from "@ant-design/icons";
import {
  Button,
  Divider,
  Dropdown,
  Empty,
  Flex,
  Input,
  Modal,
  notification,
  Spin,
  Tag,
} from "antd";
import { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  AccountDetail,
  Authentication,
  AuthenticationRef,
  Copy,
  Explore,
} from "../../components";
import { useAccountSearch } from "../../hooks/useAccountSearch";
import { Dispatch, RootState } from "../../store";
import { cx, shortenAddress } from "../../utils/methods";
import styles from "./Wallet.module.scss";

const Wallet: React.FC = () => {
  const dispatch = useDispatch<Dispatch>();
  const wallet = useSelector((state: RootState) => state.wallet);
  const {
    createAccount: loadingCreateAccount,
    loadAccounts: loadingLoadAccounts,
    switchAccount: loadingSwitchAccount,
  } = useSelector((state: RootState) => state.loading.effects.wallet);

  const { searchTerm, debouncedSearchTerm, filteredAccounts, handleSearch } =
    useAccountSearch(wallet.accounts);

  const authenticationRef = useRef<AuthenticationRef>(null);
  const [api, contextHolder] = notification.useNotification();

  useEffect(() => {
    dispatch.wallet.loadAccounts();
  }, [dispatch.wallet]);

  const createAccountHandler = async (password: string) => {
    try {
      const newAccount = await dispatch.wallet.createAccount({ password });
      api.success({
        message: "Create account successfully",
        description: (
          <div>
            <p>{newAccount.name} has been created successfully</p>
            <Explore.Account address={newAccount.address}>
              {shortenAddress(newAccount.address!, 10, 10)}
            </Explore.Account>
          </div>
        ),
        placement: "bottomRight",
        duration: 0,
      });
      authenticationRef.current?.close();
    } catch (error) {
      api.error({
        message: "Failed to create account",
        description: error instanceof Error ? error.message : "Unknown error",
        placement: "bottomRight",
      });
    }
  };

  const renderAccountList = () => {
    if (filteredAccounts.length === 0 && debouncedSearchTerm) {
      return (
        <Empty
          description="No accounts found matching your search"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      );
    }

    return (
      <ul className="account-list">
        {filteredAccounts.map(
          ({ address, name, sphincsPlusPubKey, balance }, index) => (
            <>
              {index > 0 && (
                <Divider className="divider" key={`divider-${index}`} />
              )}
              <AccountItem
                key={sphincsPlusPubKey}
                address={address!}
                name={name}
                sphincsPlusPubKey={sphincsPlusPubKey}
                isLoading={loadingSwitchAccount}
              />
            </>
          )
        )}
      </ul>
    );
  };

  return (
    <section className={cx(styles.wallet, "panel")}>
      <h1>Wallet</h1>

      <Flex
        justify="space-between"
        align="center"
        gap={8}
        style={{ marginBottom: 16 }}
      >
        <Input.Search
          placeholder="Search by name or address"
          onSearch={handleSearch}
          onChange={(e) => handleSearch(e.target.value)}
          allowClear
          style={{ width: "100%" }}
          value={searchTerm}
        />
        <Button
          type="primary"
          onClick={() => authenticationRef.current?.open()}
          loading={loadingCreateAccount}
          disabled={loadingCreateAccount || loadingLoadAccounts}
        >
          Add account
        </Button>
      </Flex>
      <div className={styles.accountList}>
        <Spin size="large" spinning={loadingLoadAccounts}>
          {renderAccountList()}
        </Spin>
      </div>
      <Authentication
        ref={authenticationRef}
        loading={loadingCreateAccount}
        authenCallback={createAccountHandler}
      />
      {contextHolder}
    </section>
  );
};

interface AccountItemProps extends React.HTMLAttributes<HTMLLIElement> {
  address: string;
  name: string;
  sphincsPlusPubKey: string;
  hasTools?: boolean;
  copyable?: boolean;
  showBalance?: boolean;
  isLoading?: boolean;
}

export const AccountItem: React.FC<AccountItemProps> = ({
  address,
  name,
  sphincsPlusPubKey,
  hasTools = true,
  copyable = true,
  showBalance = false,
  isLoading = false,
  ...props
}) => {
  const dispatch = useDispatch<Dispatch>();
  const wallet = useSelector((state: RootState) => state.wallet);
  const isActive = sphincsPlusPubKey === wallet.current.sphincsPlusPubKey;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const menuOptions = useMemo(
    () =>
      [
        {
          key: "switch-account",
          label: (
            <p className="menu-item">
              <SwapOutlined />
              Switch Account
            </p>
          ),
          onClick: () => {
            dispatch.wallet.switchAccount({ sphincsPlusPubKey });
          },
          hidden: isActive,
          disabled: isLoading,
        },
        {
          key: "view-details",
          label: (
            <p className="menu-item">
              <QrcodeOutlined />
              View Details
            </p>
          ),
          onClick: () => setIsModalOpen(true),
        },
        {
          key: "explore",
          label: (
            <Explore.Account address={address} className="menu-item">
              <GlobalOutlined />
              Explore
            </Explore.Account>
          ),
        },
      ].filter((item) => !item.hidden),
    [isActive, sphincsPlusPubKey, address, isLoading, dispatch]
  );

  return (
    <li {...props} className={cx(styles.accountItem)}>
      <div className="account-info">
        <p className="name">
          {name}{" "}
          {isActive && (
            <Tag color="var(--teal-2)" className="current">
              Current
            </Tag>
          )}
          {isLoading &&
            sphincsPlusPubKey === wallet.current.sphincsPlusPubKey && (
              <Spin size="small" style={{ marginLeft: "8px" }} />
            )}
        </p>
        {copyable ? (
          <Copy value={address} className="address copyable">
            <span>{shortenAddress(address, 10, 20)}</span>
            <CopyOutlined />
          </Copy>
        ) : (
          <div className="address">{shortenAddress(address, 10, 20)}</div>
        )}
      </div>
      <Flex gap={8} align="center">
        {hasTools && (
          <Dropdown
            rootClassName={styles.accountUtils}
            menu={{
              items: menuOptions,
            }}
          >
            <Button type="text" className="more-btn" disabled={isLoading}>
              <MoreOutlined />
            </Button>
          </Dropdown>
        )}
      </Flex>
      <Modal
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
      >
        <AccountDetail account={{ name, address, sphincsPlusPubKey }} />
      </Modal>
    </li>
  );
};

export default Wallet;
