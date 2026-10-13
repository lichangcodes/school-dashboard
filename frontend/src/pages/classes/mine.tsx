import { useGetIdentity } from "@refinedev/core";
import { useTable } from "@refinedev/react-table";

import { ListView } from "@/components/refine-ui/views/list-view";
import { CreateButton } from "@/components/refine-ui/buttons/create";
import { Breadcrumb } from "@/components/refine-ui/layout/breadcrumb";
import { DataTable } from "@/components/refine-ui/data-table/data-table";

import { User, UserRole } from "@/types";
import { ClassListItem, classColumns } from "./columns";

const MyClasses = () => {
  const { data: currentUser } = useGetIdentity<User>();
  const isTeacher = currentUser?.role === UserRole.TEACHER;

  const classesTable = useTable<ClassListItem>({
    columns: classColumns,
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
