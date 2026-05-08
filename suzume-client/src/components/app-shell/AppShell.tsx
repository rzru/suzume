import { Box, Dialog, Flex, IconButton, VisuallyHidden } from "@radix-ui/themes";
import { HamburgerMenuIcon } from "@radix-ui/react-icons";
import { cloneElement, useState, type ReactElement, type ReactNode } from "react";
import styles from "./AppShell.module.css";

type SidebarInjectedProps = {
  onNavigate?: () => void;
};

type AppShellProps = {
  sidebar: ReactElement<SidebarInjectedProps>;
  header?: ReactNode;
  children: ReactNode;
};

export function AppShell({ sidebar, header, children }: AppShellProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const drawerSidebar = cloneElement(sidebar, {
    onNavigate: () => setDrawerOpen(false),
  });

  return (
    <Flex direction="column" height="100vh" width="100%" overflow="hidden">
      <Flex
        display={{ initial: "flex", md: "none" }}
        align="center"
        gap="3"
        className={styles.topBar}
        px="3"
        py="2"
      >
        <Dialog.Root open={drawerOpen} onOpenChange={setDrawerOpen}>
          <Dialog.Trigger>
            <IconButton variant="ghost" color="gray" size="3" aria-label="Open decks menu">
              <HamburgerMenuIcon />
            </IconButton>
          </Dialog.Trigger>
          <Dialog.Content className={styles.mobileDrawer}>
            <VisuallyHidden>
              <Dialog.Title>Decks</Dialog.Title>
            </VisuallyHidden>
            <Box p="3" className={styles.mobileDrawerInner}>
              {drawerSidebar}
            </Box>
          </Dialog.Content>
        </Dialog.Root>
      </Flex>
      <Flex flexGrow="1" minHeight="0" overflow="hidden">
        <Box
          display={{ initial: "none", md: "block" }}
          width="320px"
          p="3"
          flexShrink="0"
          className={styles.sidebar}
        >
          {sidebar}
        </Box>
        <Flex direction="column" flexGrow="1" minWidth="0" overflow="hidden">
          {header}
          <Box p={{ initial: "3", md: "5" }} flexGrow="1" overflow="auto">
            {children}
          </Box>
        </Flex>
      </Flex>
    </Flex>
  );
}
