import {
  CopyOutlined,
  GlobalOutlined,
  MoreOutlined,
  QrcodeOutlined,
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
import React, { useMemo, useRef, useState } from "react";
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
import { cx, formatError, shortenAddress } from "../../utils/methods";
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

  const createAccountHandler = async (password: string) => {
    try {
      const newAccount = await dispatch.wallet.createAccount({ password });
      notification.success({
        message: "Create account successfully",
        description: (
          <div>
            <p>{newAccount.name} has been created successfully</p>
            <Explore.Account address={newAccount.address}>
              {shortenAddress(newAccount.address!, 10, 10)}
            </Explore.Account>
          </div>
        ),
      });
      authenticationRef.current?.close();
    } catch (error) {
      notification.error({
        message: "Failed to create account",
        description: formatError(error),
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
        {filteredAccounts.map(({ address, name, sphincsPlusPubKey }, index) => (
          <React.Fragment key={sphincsPlusPubKey}>
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
          </React.Fragment>
        ))}
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
  const [isSwitchAccountModalOpen, setIsSwitchAccountModalOpen] =
    useState(false);
  const menuOptions = useMemo(
    () => [
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
    ],
    [isActive, sphincsPlusPubKey, address, isLoading, dispatch]
  );

  return (
    <>
      <li {...props} className={cx(styles.accountItem)}>
        <div
          className="account-info"
          onClick={() => setIsSwitchAccountModalOpen(true)}
        >
          <p className="name">
            {name}{" "}
            {isActive && (
              <Tag color="var(--teal-2)" className="current">
                Current
              </Tag>
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
      </li>
      <Modal
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
        centered
      >
        <AccountDetail account={{ name, address, sphincsPlusPubKey }} />
      </Modal>
      {hasTools && (
        <Modal
          open={isSwitchAccountModalOpen}
          onCancel={() => setIsSwitchAccountModalOpen(false)}
          onOk={() => {
            dispatch.wallet.switchAccount({ sphincsPlusPubKey });
            setIsSwitchAccountModalOpen(false);
          }}
          title="Switch Account"
          centered
        >
          <p>
            Are you sure want to set <b>{name}</b> as current account?
          </p>
        </Modal>
      )}
    </>
  );
};

export default Wallet;
