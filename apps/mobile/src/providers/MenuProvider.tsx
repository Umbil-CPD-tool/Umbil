import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

/**
 * Shared chat-shell state that isn't owned by the Drawer navigator itself
 * (open/close is handled natively by `@react-navigation/drawer` — see
 * `AppHeader`'s hamburger button and `SideMenu`'s `navigation.closeDrawer()`).
 */
type MenuContextValue = {
  /** Optional callback when user picks a conversation from the drawer. */
  onOpenConversation: ((id: string) => void) | null;
  setOnOpenConversation: (fn: ((id: string) => void) | null) => void;
  requestNewChat: () => void;
  newChatToken: number;
};

const MenuContext = createContext<MenuContextValue | null>(null);

export const MenuProvider = ({ children }: { children: ReactNode }) => {
  const [onOpenConversation, setOnOpenConversation] = useState<
    ((id: string) => void) | null
  >(null);
  const [newChatToken, setNewChatToken] = useState(0);

  const requestNewChat = useCallback(() => {
    setNewChatToken(Date.now());
  }, []);

  const value = useMemo(
    () => ({
      onOpenConversation,
      setOnOpenConversation,
      requestNewChat,
      newChatToken,
    }),
    [onOpenConversation, requestNewChat, newChatToken]
  );

  return <MenuContext.Provider value={value}>{children}</MenuContext.Provider>;
};

export const useMenu = () => {
  const ctx = useContext(MenuContext);
  if (!ctx) throw new Error("useMenu must be used within MenuProvider");
  return ctx;
};
