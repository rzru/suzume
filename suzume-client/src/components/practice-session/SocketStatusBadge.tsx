import { Badge } from "@radix-ui/themes";
import type { SocketStatus } from "../../hooks/usePracticeSocket";

type SocketStatusBadgeProps = {
  status: SocketStatus;
};

export function SocketStatusBadge({ status }: SocketStatusBadgeProps) {
  switch (status) {
    case "connecting":
      return (
        <Badge color="gray" variant="surface">
          Connecting
        </Badge>
      );
    case "open":
      return (
        <Badge color="grass" variant="surface">
          Connected
        </Badge>
      );
    case "closed":
      return (
        <Badge color="gray" variant="surface">
          Disconnected
        </Badge>
      );
    case "error":
      return (
        <Badge color="red" variant="surface">
          Connection error
        </Badge>
      );
  }
}
