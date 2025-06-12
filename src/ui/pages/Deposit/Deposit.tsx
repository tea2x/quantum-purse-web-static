import { addressToScript } from "@nervosnetwork/ckb-sdk-utils";
import {
  Button,
  Flex,
  Form,
  Input,
  InputNumber,
  notification,
  Switch,
} from "antd";
import { useEffect, useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AccountSelect, Explore, Authentication, AuthenticationRef } from "../../components";
import { Dispatch, RootState } from "../../store";
import { CKB_DECIMALS, CKB_UNIT } from "../../utils/constants";
import { cx, formatError } from "../../utils/methods";
import styles from "./Deposit.module.scss";
import QuantumPurse from "../../../core/quantum_purse";

const Deposit: React.FC = () => {
  const [form] = Form.useForm();
  const values = Form.useWatch([], form);
  const [submittable, setSubmittable] = useState(false);
  const dispatch = useDispatch<Dispatch>();
  const wallet = useSelector((state: RootState) => state.wallet);
  const { deposit: loadingDeposit } = useSelector(
    (state: RootState) => state.loading.effects.wallet
  );
  const [fromAccountBalance, setFromAccountBalance] = useState<string | null>(null);
  const [passwordResolver, setPasswordResolver] = useState<{
    resolve: (password: string) => void;
    reject: () => void;
  } | null>(null);
  const authenticationRef = useRef<AuthenticationRef>(null);

  const quantumPurse = QuantumPurse.getInstance();

  // Validate form fields to enable/disable the Deposit button
  useEffect(() => {
    form
      .validateFields({ validateOnly: true })
      .then(() => setSubmittable(true))
      .catch(() => setSubmittable(false));
  }, [form, values]);

  // Set and clean up the requestPassword callback
  useEffect(() => {
    if (quantumPurse) {
      quantumPurse.requestPassword = (resolve, reject) => {
        setPasswordResolver({ resolve, reject });
        authenticationRef.current?.open();
      };
      // Cleanup when leaving deposit page
      return () => {
        quantumPurse.requestPassword = undefined;
      };
    }
  }, [quantumPurse]);

  // Fetch the account balance
  useEffect(() => {
    if (!wallet.current?.spxLockArgs) return;

    const getBalance = async () => {
      const balance = await dispatch.wallet.getAccountBalance({
        spxLockArgs: wallet.current!.spxLockArgs,
      });
      setFromAccountBalance(balance);
    };

    getBalance();
  }, [wallet, dispatch]);

  // Pre-validate fields when balance updates
  useEffect(() => {
    if (fromAccountBalance !== null) {
      form.validateFields(["from"]);
      if (values?.amount) {
        form.validateFields(["amount"]);
      }
    }
  }, [fromAccountBalance, form]);

  const handleDeposit = async () => {
    try {
      const txId = await dispatch.wallet.deposit({
        to: values.to,
        amount: values.amount
      });
      form.resetFields();
      notification.success({
        message: "Deposit transaction successfully",
        description: (
          <div>
            <p>Please check the transaction on the explorer</p>
            <p>
              <Explore.Transaction txId={txId as string} />
            </p>
          </div>
        ),
      });
    } catch (error) {
      notification.error({
        message: "Deposit transaction failed",
        description: formatError(error),
      });
    }
  };

  // Handle password submission and pass it to QPsigner::signOnlyTransaction
  const authenCallback = async (password: string) => {
    if (passwordResolver) {
      passwordResolver.resolve(password);
      setPasswordResolver(null);
    }
    authenticationRef.current?.close();
  };

  return (
    <section className={cx(styles.depositForm, "panel")}>
      <h1>Deposit</h1>
      <div>
        <Form layout="vertical" form={form}>
          <Form.Item
            name="to"
            label={
              <div className="label-container">
                To
                <div className="switch-container">
                  My Account
                  <Form.Item name="isDepositToMyAccount" style={{ marginBottom: 0 }}>
                    <Switch />
                  </Form.Item>
                </div>
              </div>
            }
            rules={[
              { required: true, message: "Address required" },
              {
                validator: (_, value) => {
                  if (!value) return Promise.resolve();
                  try {
                    addressToScript(value);
                    return Promise.resolve();
                  } catch (error) {
                    return Promise.reject("Invalid address");
                  }
                },
              },
            ]}
            className={cx("field-to", values?.isDepositToMyAccount && "select-my-account")}
          >
            {!values?.isDepositToMyAccount ? (
              <Input placeholder="Input the destination address" />
            ) : (
              <AccountSelect
                accounts={wallet.accounts}
                placeholder="Please select an account from your wallet"
              />
            )}
          </Form.Item>
          <Form.Item
            className="amount"
            name="amount"
            label="Amount"
            rules={[
              { required: true, message: "Please input amount" },
              { type: "number", min: 114, message: "Deposit amount must be at least 114 CKB" },
              {
                validator: (_, value) => {
                  if (
                    fromAccountBalance &&
                    value &&
                    BigInt(fromAccountBalance) / BigInt(CKB_DECIMALS) < BigInt(value)
                  ) {
                    return Promise.reject("Insufficient balance");
                  }
                  return Promise.resolve();
                },
              },
            ]}
          >
            <InputNumber
              step={1}
              addonAfter={CKB_UNIT}
              controls
              placeholder="Amount of tokens"
            />
          </Form.Item>
          <Form.Item>
            <Flex justify="end">
              <Button
                type="primary"
                onClick={handleDeposit}
                disabled={!submittable || loadingDeposit}
                loading={loadingDeposit}
              >
                Deposit
              </Button>
            </Flex>
          </Form.Item>
        </Form>
        <Authentication
          ref={authenticationRef}
          authenCallback={authenCallback}
          title="Deposit to Nervos DAO"
          afterClose={() => {
            if (passwordResolver) {
              passwordResolver.reject();
              setPasswordResolver(null);
            }
          }}
        />
      </div>
    </section>
  );
};

export default Deposit;