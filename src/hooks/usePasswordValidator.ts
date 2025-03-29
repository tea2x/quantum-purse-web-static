import QuantumPurse from "../core/quantum_purse";
import { utf8ToBytes } from "../core/utils";

const usePasswordValidator = () => {
  const entropyValidator = (password: string) => {
    if (!password) {
      return Promise.resolve();
    }
    const passwordBytes = utf8ToBytes(password);
    try {
      QuantumPurse.checkPassword(passwordBytes);
      return Promise.resolve();
    } catch (error) {
      return Promise.reject(new Error(error as string));
    }
  };

  const rules = [
    { required: true, message: "Please input your password!" },
    {
      validator: (_: any, value: string) => {
        return entropyValidator(value);
      },
    },
  ];
  return { rules };
};

export default usePasswordValidator;
