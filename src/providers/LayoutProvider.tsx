import { useState, useEffect } from "react";
import LayoutCtx from "../context/LayoutCtx";
import { Grid } from "antd";

const { useBreakpoint } = Grid;

const LayoutProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [showSidebar, setShowSidebar] = useState(false);
  const screens = useBreakpoint();

  useEffect(() => {
    setShowSidebar(!!screens.md);
  }, [screens.md]);

  return (
    <LayoutCtx.Provider value={{ showSidebar, setShowSidebar }}>
      {children}
    </LayoutCtx.Provider>
  );
};

export default LayoutProvider;
