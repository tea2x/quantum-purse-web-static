import { createContext } from "react";

interface LayoutCtxProps {
  showSidebar: boolean;
  setShowSidebar: (showSidebar: boolean) => void;
}

const LayoutCtx = createContext<LayoutCtxProps>({
  showSidebar: false,
  setShowSidebar: () => {},
});

export default LayoutCtx;
