import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "@refinedev/react-hook-form";
import { useBack, type BaseRecord, type HttpError } from "@refinedev/core";

import { EditView } from "@/components/refine-ui/views/edit-view";
import { Breadcrumb } from "@/components/refine-ui/layout/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { departmentSchema, type DepartmentFormValues } from "@/lib/schema";
import type { Department } from "@/types";

import { DepartmentForm } from "./form";

const DepartmentsEdit = () => {
  const back = useBack();

  const form = useForm<BaseRecord, HttpError, DepartmentFormValues>({
    resolver: zodResolver(departmentSchema),
    refineCoreProps: {
      resource: "departments",
      action: "edit",
      redirect: "show",
      queryOptions: {
        // GET /departments/:id returns { department, totals }; the form only needs the department
        select: ({ data }) => {
          const department = data.department as Department;
          return {
            data: { ...department, description: department.description ?? "" },
          };
        },
      },
    },
    defaultValues: {
      code: "",
      name: "",
      description: "",
    },
  });

  return (
    <EditView className="class-view">
      <Breadcrumb />

      <h1 className="page-title">Edit Department</h1>
      <div className="intro-row">
        <p>Update the department details below.</p>
        <Button onClick={() => back()}>Go Back</Button>
      </div>

      <Separator />

      <div className="my-4 flex items-center">
        <Card className="class-form-card">
          <CardHeader className="relative z-10">
            <CardTitle className="text-2xl pb-0 font-bold text-gradient-orange">
              Edit form
            </CardTitle>
          </CardHeader>

          <Separator />

          <CardContent className="mt-7">
            <DepartmentForm
              form={form}
              submitLabel="Save Changes"
              submittingLabel="Saving..."
            />
          </CardContent>
        </Card>
      </div>
    </EditView>
  );
};

export default DepartmentsEdit;
