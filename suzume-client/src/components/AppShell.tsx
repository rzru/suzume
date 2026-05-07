import { Box, Flex } from "@radix-ui/themes";
import type { ReactNode } from "react";
import styles from "./AppShell.module.css";

type AppShellProps = {
  sidebar: ReactNode;
  header?: ReactNode;
  children: ReactNode;
};

export default function AppShell({ sidebar, header, children }: AppShellProps) {
  return (
    <Flex height="100vh" width="100%" overflow="hidden">
      <Box width="320px" p="3" flexShrink="0" className={styles.sidebar}>
        {sidebar}
      </Box>
      <Flex direction="column" flexGrow="1" overflow="hidden">
        {header}
        <Box p="5" flexGrow="1" overflow="auto">
          {children}
        </Box>
      </Flex>
    </Flex>
  );
}
