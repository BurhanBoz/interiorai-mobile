import { createContext, useContext, useState, useCallback } from "react";
import type { ReactNode } from "react";
import { SideDrawer } from "@/components/layout/SideDrawer";

interface DrawerContextValue {
  openDrawer: () => void;
  closeDrawer: () => void;
}

const DrawerContext = createContext<DrawerContextValue>({
  openDrawer: () => {},
  closeDrawer: () => {},
});

export function useDrawer() {
  return useContext(DrawerContext);
}

export function DrawerProvider({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(false);

  const openDrawer = useCallback(() => setVisible(true), []);
  const closeDrawer = useCallback(() => setVisible(false), []);

  return (
    <DrawerContext.Provider value={{ openDrawer, closeDrawer }}>
      {children}
      <SideDrawer visible={visible} onClose={closeDrawer} />
    </DrawerContext.Provider>
  );
}
