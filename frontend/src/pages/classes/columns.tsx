import { ColumnDef } from "@tanstack/react-table";

import { Badge } from "@/components/ui/badge";
import { ShowButton } from "@/components/refine-ui/buttons/show";
import type { ClassStatus } from "@/types";

export type ClassListItem = {
  id: number;
  name: string;
  status: ClassStatus;
  bannerUrl?: string;
  subject?: {
    name: string;
  };
  teacher?: {
    name: string;
  };
  capacity: number;
};

// Shared by the Classes list and My Classes pages
export const classColumns: ColumnDef<ClassListItem>[] = [
  {
    id: "banner",
    accessorKey: "bannerUrl",
    size: 120,
    header: () => <p className="column-title ml-2">Banner</p>,
    cell: ({ getValue }) => {
      const bannerUrl = getValue<string>();

      return bannerUrl ? (
        <img
          src={bannerUrl}
          alt="Class banner"
          className="ml-2 h-10 w-10 rounded-md object-cover"
          loading="lazy"
        />
      ) : (
        <span className="text-muted-foreground ml-2">No image</span>
      );
    },
  },
  {
    id: "name",
    accessorKey: "name",
    size: 220,
    header: () => <p className="column-title">Class Name</p>,
    cell: ({ getValue }) => {
      const className = getValue<string>();

      return <span className="text-foreground">{className}</span>;
    },
  },
  {
    id: "status",
    accessorKey: "status",
    size: 140,
    header: () => <p className="column-title">Status</p>,
    cell: ({ getValue }) => {
      const status = getValue<ClassStatus>();
      const variant =
        status === "active"
          ? "default"
          : status === "archived"
          ? "outline"
          : "secondary";

      return <Badge variant={variant}>{status}</Badge>;
    },
  },
  {
    id: "subject",
    accessorKey: "subject.name",
    size: 200,
    header: () => <p className="column-title">Subject</p>,
    cell: ({ getValue }) => {
      const subjectName = getValue<string>();

      return subjectName ? (
        <Badge variant="secondary">{subjectName}</Badge>
      ) : (
        <span className="text-muted-foreground">Not set</span>
      );
    },
  },
  {
    id: "teacher",
    accessorKey: "teacher.name",
    size: 200,
    header: () => <p className="column-title">Teacher</p>,
    cell: ({ getValue }) => {
      const teacherName = getValue<string>();

      return teacherName ? (
        <span className="text-foreground">{teacherName}</span>
      ) : (
        <span className="text-muted-foreground">Not assigned</span>
      );
    },
  },
  {
    id: "capacity",
    accessorKey: "capacity",
    size: 120,
    header: () => <p className="column-title">Capacity</p>,
    cell: ({ getValue }) => {
      const capacity = getValue<number>();

      return <span className="text-foreground">{capacity}</span>;
    },
  },
  {
    id: "details",
    size: 140,
    header: () => <p className="column-title">Details</p>,
    cell: ({ row }) => (
      <ShowButton
        resource="classes"
        recordItemId={row.original.id}
        variant="outline"
        size="sm"
      >
        View
      </ShowButton>
    ),
  },
];
