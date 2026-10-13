import { useUpdate } from "@refinedev/core";
import { Archive, ArchiveRestore, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { ClassStatus } from "@/types";

type ArchiveButtonProps = {
  classId: number;
  status: ClassStatus;
};

// Archiving is how a class is retired: it disappears from the class list and
// stops accepting enrollments, but its roster is kept and it can be restored.
export const ArchiveButton = ({ classId, status }: ArchiveButtonProps) => {
  const {
    mutate,
    mutation: { isPending },
  } = useUpdate();
  const isArchived = status === "archived";

  const toggle = () =>
    mutate({
      resource: "classes",
      id: classId,
      values: { status: isArchived ? "active" : "archived" },
      successNotification: () => ({
        message: isArchived ? "Class restored" : "Class archived",
        type: "success",
      }),
    });

  return (
    <Button variant="outline" onClick={toggle} disabled={isPending}>
      {isPending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : isArchived ? (
        <ArchiveRestore className="h-4 w-4" />
      ) : (
        <Archive className="h-4 w-4" />
      )}
      <span className="font-semibold">{isArchived ? "Restore" : "Archive"}</span>
    </Button>
  );
};
