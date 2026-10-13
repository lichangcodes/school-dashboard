import { useGetIdentity, useInvalidate } from "@refinedev/core";
import { useTable } from "@refinedev/react-table";
import { ColumnDef } from "@tanstack/react-table";
import { useMemo } from "react";

import { ListView } from "@/components/refine-ui/views/list-view";
import { CreateButton } from "@/components/refine-ui/buttons/create";
import { DeleteButton } from "@/components/refine-ui/buttons/delete";
import { Breadcrumb } from "@/components/refine-ui/layout/breadcrumb";
import { DataTable } from "@/components/refine-ui/data-table/data-table";

import { User, UserRole } from "@/types";
import { ClassListItem, classColumns } from "./columns";

const MyClasses = () => {
  const { data: currentUser } = useGetIdentity<User>();
  const isTeacher = currentUser?.role === UserRole.TEACHER;
  const isStudent = currentUser?.role === UserRole.STUDENT;
  const invalidate = useInvalidate();

  // Students get a Drop button per row. It calls DELETE /classes/:id/students/:studentId,
  // and the backend only lets a student remove themselves.
  const columns = useMemo<ColumnDef<ClassListItem>[]>(() => {
    if (!isStudent || !currentUser) return classColumns;

    return [
      ...classColumns,
      {
        id: "drop",
        size: 120,
        header: () => <p className="column-title">Enrollment</p>,
        cell: ({ row }) => (
          <DeleteButton
            resource={`classes/${row.original.id}/students`}
            recordItemId={currentUser.id}
            accessControl={{ enabled: false }}
            size="sm"
            confirmTitle={`Drop ${row.original.name}?`}
            confirmOkText="Drop"
            successNotification={{
              message: `Dropped ${row.original.name}`,
              type: "success",
            }}
            onSuccess={() =>
              invalidate({ resource: "classes/mine", invalidates: ["list"] })
            }
          >
            Drop
          </DeleteButton>
        ),
      },
    ];
  }, [isStudent, currentUser, invalidate]);

  const classesTable = useTable<ClassListItem>({
    columns,
    refineCoreProps: {
      resource: "classes/mine",
      pagination: {
        pageSize: 10,
        mode: "server",
      },
    },
  });

  return (
    <ListView>
      <Breadcrumb />
      <h1 className="page-title">My Classes</h1>

      <div className="intro-row">
        <p>
          {isTeacher
            ? "Classes you are teaching."
            : "Classes you have joined."}
        </p>

        <div className="actions-row">
          {/* Access control hides whichever button doesn't apply to the current role */}
          <CreateButton resource="enrollments">Enroll in a class</CreateButton>
          <CreateButton resource="classes">Create a class</CreateButton>
        </div>
      </div>

      <DataTable table={classesTable} />
    </ListView>
  );
};

export default MyClasses;
