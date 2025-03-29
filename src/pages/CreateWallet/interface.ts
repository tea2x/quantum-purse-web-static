import { WalletStepEnum } from "../../utils/constants";

export interface CreateWalletContextType {
  currentStep?: WalletStepEnum;
  setCurrentStep: (step: WalletStepEnum) => void;
  next: () => void;
  prev: () => void;
  done: () => void;
  steps: {
    key: WalletStepEnum;
    title: string;
    description: string;
    content: React.ReactNode;
  }[];
}
