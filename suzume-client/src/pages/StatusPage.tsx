import { Box, Code, Flex, Heading, Text } from "@radix-ui/themes";
import { CheckCircledIcon, CrossCircledIcon, QuestionMarkCircledIcon } from "@radix-ui/react-icons";
import type { ReactNode } from "react";
import { useHealthQuery } from "../hooks/useHealthQuery";
import styles from "./StatusPage.module.css";

type Service = {
  name: string;
  connected?: boolean;
  instruction: ReactNode;
};

function StatusIcon({ connected }: Pick<Service, "connected">) {
  if (connected === undefined) {
    return <QuestionMarkCircledIcon className={`${styles.icon} ${styles.iconUnknown}`} />;
  }

  return connected ? (
    <CheckCircledIcon className={`${styles.icon} ${styles.iconConnected}`} />
  ) : (
    <CrossCircledIcon className={`${styles.icon} ${styles.iconDisconnected}`} />
  );
}

function ServiceRow({ service }: { service: Service }) {
  const connected = service.connected === true;

  return (
    <Flex align="center" gap="3">
      <StatusIcon connected={service.connected} />
      <Box flexGrow="1">
        <Text size="2" weight="medium">
          {service.name}
        </Text>
        {!connected && (
          <Text size="1" color="gray" as="div">
            {service.instruction}
          </Text>
        )}
      </Box>
    </Flex>
  );
}

export function StatusPage() {
  const { error, data: status, dataUpdatedAt } = useHealthQuery();

  const services: Service[] = [
    {
      name: "Ollama",
      connected: status?.ollama_connected,
      instruction: <Code size="1">ollama serve</Code>,
    },
    {
      name: "Anki",
      connected: status?.anki_connected,
      instruction: <>open Anki with AnkiConnect</>,
    },
  ];

  return (
    <Flex height="100vh" align="center" justify="center" p="6">
      <Flex direction="column" gap="4" width="320px">
        <Box>
          <Heading size="4">Setup required</Heading>
          {error && (
            <Text size="1" color="red">
              {error.message}
            </Text>
          )}
        </Box>

        <Flex direction="column" gap="2">
          {services.map((service) => (
            <ServiceRow key={service.name} service={service} />
          ))}
        </Flex>

        <Text size="1" color="gray">
          Last checked: {new Date(dataUpdatedAt).toLocaleTimeString()}
        </Text>
      </Flex>
    </Flex>
  );
}
