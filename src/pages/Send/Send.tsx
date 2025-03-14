import {
  Button,
  Flex,
  Form,
  Input,
  InputNumber,
  notification,
  Select,
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
import { CKB_UNIT } from "../../utils/constants";
import { cx } from "../../utils/methods";
import { AccountItem } from "../Wallet/Wallet";
import styles from "./Send.module.scss";
import { addressToScript } from "@nervosnetwork/ckb-sdk-utils";

const Send: React.FC = () => {
  const [form] = Form.useForm();
  const values = Form.useWatch([], form);
  const [submittable, setSubmittable] = useState(false);
  const [api, contextHolder] = notification.useNotification();
  const dispatch = useDispatch<Dispatch>();
  const authenticationRef = useRef<AuthenticationRef>(null);
  const wallet = useSelector((state: RootState) => state.wallet);
  const { send: loadingSend } = useSelector(
    (state: RootState) => state.loading.effects.wallet
  );

  const customOptionRender = (account: any) => {
    return (
      <AccountItem
        address={account.data.address!}
        name={account.data.name}
        sphincsPlusPubKey={account.data.sphincsPlusPubKey}
        hasTools={false}
        copyable={false}
      />
    );
  };

  const customLabelRender = (account: any) => {
    return (
      <AccountItem
        address={account?.address!}
        name={account?.name}
        sphincsPlusPubKey={account?.sphincsPlusPubKey}
        hasTools={false}
        copyable={false}
        showBalance={true}
      />
    );
  };

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
      api.success({
        message: "Create account successfully",
        description: (
          <div>
            <p>Send transaction successfully</p>
            <p>
              <Explore.Transaction txId={txId as string} />
            </p>
          </div>
        ),
        placement: "bottomRight",
        duration: 0,
      });
    } catch (error) {
      console.info("Send transaction failed", error);
      api.error({
        message: "Send transaction failed",
        description: "Something went wrong",
        placement: "bottomRight",
        duration: 0,
      });
    } finally {
      authenticationRef.current?.close();
    }
  };

  console.log(values);

  return (
    <section className={cx(styles.wallet, "panel")}>
      <h1>Send</h1>
      <div>
        <Form layout="vertical" form={form} className={styles.sendForm}>
          <Form.Item
            name="from"
            label="From"
            rules={[{ required: true, message: "Please input an account" }]}
            className={"field-from select-my-account"}
          >
            <AccountSelect
              accounts={wallet.accounts}
              customOptionRender={customOptionRender}
              customLabelRender={customLabelRender}
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
                customOptionRender={customOptionRender}
                customLabelRender={customLabelRender}
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
            ]}
          >
            <InputNumber
              min={73}
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
          authenCallback={(password) => {
            onFinish({ ...values, password });
          }}
        />
      </div>
      {contextHolder}
    </section>
  );
};

export default Send;
