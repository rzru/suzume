import { Flex, Spinner, Text } from "@radix-ui/themes";
import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useHealthQuery } from "../../hooks/useHealthQuery";

const STATUS_ROUTE = "/status";

type HealthGateProps = {
  children: ReactNode;
};

export function HealthGate({ children }: HealthGateProps) {
  const location = useLocation();
  const { isPending, data: status } = useHealthQuery();

  const onStatusPage = location.pathname === STATUS_ROUTE;

  if (isPending) {
    return (
      <Flex height="100dvh" align="center" justify="center" gap="2">
        <Spinner size="3" />
        <Text color="gray">Checking system status...</Text>
      </Flex>
    );
  }

  const isHealthy = status?.ollama_connected === true && status?.anki_connected === true;

  if (!isHealthy && !onStatusPage) {
    return <Navigate to={STATUS_ROUTE} replace />;
  }

  if (isHealthy && onStatusPage) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
