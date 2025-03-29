import { addressToScript } from "@nervosnetwork/ckb-sdk-utils";
import {
  Button,
  Flex,
  Form,
  Input,
  InputNumber,
  notification,
  Spin,
  Switch,
} from "antd";
import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  AccountSelect,
  Authentication,
  AuthenticationRef,
  Explore,
} from "../../components";
import { Dispatch, RootState } from "../../store";
import { CKB_DECIMALS, CKB_UNIT } from "../../utils/constants";
import { cx, formatBalance, formatError } from "../../utils/methods";
import styles from "./Send.module.scss";
import { quantum } from "../../store/models/wallet";

const Send: React.FC = () => {
  const [form] = Form.useForm();
  const values = Form.useWatch([], form);
  const [submittable, setSubmittable] = useState(false);
  const dispatch = useDispatch<Dispatch>();
  const authenticationRef = useRef<AuthenticationRef>(null);
  const { wallet, loading } = useSelector((state: RootState) => state);
  const { getAccountBalance: loadingGetAccountBalance } =
    loading.effects.wallet;
  const { send: loadingSend } = useSelector(
    (state: RootState) => state.loading.effects.wallet
  );
  const [fromAccountBalance, setFromAccountBalance] = useState<string | null>(
    null
  );

  useEffect(() => {
    form
      .validateFields({ validateOnly: true })
      .then(() => setSubmittable(true))
      .catch(() => setSubmittable(false));
  }, [form, values]);

  const onFinish = async ({ from, to, amount, password }: any) => {
    try {
      const txId = await dispatch.wallet.send({ from, to, amount, password });
      form.resetFields();
      notification.success({
        message: "Send transaction successfully",
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
        message: "Send transaction failed",
        description: formatError(error),
      });
    } finally {
      authenticationRef.current?.close();
    }
  };

  useEffect(() => {
    form.setFieldsValue({
      from: wallet.current.address,
    });
  }, [wallet.current.address]);

  useEffect(() => {
    const findFromAccountBalance = async () => {
      const fromAccount = wallet.accounts.find(
        (account) => account.address === values?.from
      );

      if (fromAccount?.sphincsPlusPubKey) {
        const balance = await dispatch.wallet.getAccountBalance({
          sphincsPlusPubKey: fromAccount.sphincsPlusPubKey,
        });
        setFromAccountBalance(balance);
      }
    };

    if (values?.from) {
      findFromAccountBalance();
    }
  }, [values?.from, wallet.accounts, dispatch.wallet]);

  useEffect(() => {
    if (fromAccountBalance !== null) {
      form.validateFields(["from"]);
      if (values?.amount) {
        form.validateFields(["amount"]);
      }
    }
  }, [fromAccountBalance, form]);

  return (
    <section className={cx(styles.wallet, "panel")}>
      <h1>Send</h1>
      <div>
        <Form layout="vertical" form={form} className={styles.sendForm}>
          <Form.Item
            name="from"
            label={
              <div className="from-label">
                From{" "}
                {fromAccountBalance && (
                  <Spin spinning={loadingGetAccountBalance}>
                    <p className="from-balance">
                      Balance: {formatBalance(fromAccountBalance)}
                    </p>
                  </Spin>
                )}
              </div>
            }
            rules={[
              { required: true, message: "Please input an account" },
              {
                validator: (_, value) => {
                  if (
                    fromAccountBalance &&
                    BigInt(fromAccountBalance) < BigInt(73 * 100000000)
                  ) {
                    return Promise.reject(
                      "This account has insufficient balance. The balance must be greater than 73 CKB"
                    );
                  }
                  return Promise.resolve();
                },
              },
            ]}
            dependencies={["from"]}
            className={"field-from select-my-account"}
          >
            <AccountSelect
              accounts={wallet.accounts}
              placeholder="Please select account from your wallet"
            />
          </Form.Item>

          <Form.Item
            name="to"
            label={
              <div className="label-container">
                To
                <div className="switch-container">
                  Send To My Account
                  <Form.Item
                    name="isSendToMyAccount"
                    style={{ marginBottom: 0 }}
                  >
                    <Switch />
                  </Form.Item>
                </div>
              </div>
            }
            rules={[
              { required: true, message: "Please enter a destination address" },
              {
                validator: (_, value) => {
                  if (!value) {
                    return Promise.resolve();
                  }
                  try {
                    addressToScript(value);
                    return Promise.resolve();
                  } catch (error) {
                    return Promise.reject("Please input a valid address");
                  }
                },
              },
            ]}
            className={cx(
              "field-to",
              values?.isSendToMyAccount && "select-my-account"
            )}
          >
            {!values?.isSendToMyAccount ? (
              <Input placeholder="Input the destination address" />
            ) : (
              <AccountSelect
                accounts={wallet.accounts}
                placeholder="Please select account from your wallet"
              />
            )}
          </Form.Item>
          <Form.Item
            name="amount"
            label="Amount"
            rules={[
              { required: true, message: "Please input amount" },
              {
                type: "number",
                min: 73,
                message: "Amount must be at least 73 CKB",
              },
              {
                validator: (_, value) => {
                  if (
                    fromAccountBalance &&
                    value &&
                    BigInt(fromAccountBalance) / BigInt(CKB_DECIMALS) <
                      BigInt(value)
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
                onClick={() => authenticationRef.current?.open()}
                disabled={!submittable || loadingSend}
                loading={loadingSend}
              >
                Send
              </Button>
            </Flex>
          </Form.Item>
        </Form>
        <Authentication
          ref={authenticationRef}
          loading={loadingSend}
          authenCallback={async (password) => {
            await onFinish({ ...values, password });
          }}
        />
      </div>
    </section>
  );
};

export default Send;
