import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "@refinedev/react-hook-form";
import { useBack, type BaseRecord, type HttpError } from "@refinedev/core";

import { CreateView } from "@/components/refine-ui/views/create-view";
import { Breadcrumb } from "@/components/refine-ui/layout/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { departmentSchema, type DepartmentFormValues } from "@/lib/schema";

import { DepartmentForm } from "./form";

const DepartmentsCreate = () => {
  const back = useBack();

  const form = useForm<BaseRecord, HttpError, DepartmentFormValues>({
    resolver: zodResolver(departmentSchema),
    refineCoreProps: {
      resource: "departments",
      action: "create",
    },
    defaultValues: {
      code: "",
      name: "",
      description: "",
    },
  });

  return (
    <CreateView className="class-view">
      <Breadcrumb />

      <h1 className="page-title">Create a Department</h1>
      <div className="intro-row">
        <p>Provide the required information below to add a department.</p>
        <Button onClick={() => back()}>Go Back</Button>
      </div>

      <Separator />

      <div className="my-4 flex items-center">
        <Card className="class-form-card">
          <CardHeader className="relative z-10">
            <CardTitle className="text-2xl pb-0 font-bold text-gradient-orange">
              Fill out form
            </CardTitle>
          </CardHeader>

          <Separator />

          <CardContent className="mt-7">
            <DepartmentForm
              form={form}
              submitLabel="Create Department"
              submittingLabel="Creating..."
            />
          </CardContent>
        </Card>
      </div>
    </CreateView>
  );
};

export default DepartmentsCreate;
