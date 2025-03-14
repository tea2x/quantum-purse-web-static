export interface CreateWalletContextType {
  currentStep: number;
  setCurrentStep: (step: number) => void;
  next: () => void;
  prev: () => void;
  done: () => void;
  steps: {
    key: string;
    title: string;
    description: string;
    content: React.ReactNode;
  }[];
  srp: string;
  setSRP: (srp: string) => void;
}
