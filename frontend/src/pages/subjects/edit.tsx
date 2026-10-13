import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "@refinedev/react-hook-form";
import { useBack, type BaseRecord, type HttpError } from "@refinedev/core";

import { EditView } from "@/components/refine-ui/views/edit-view";
import { Breadcrumb } from "@/components/refine-ui/layout/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { subjectSchema, type SubjectFormValues } from "@/lib/schema";

import { SubjectForm } from "./form";

type SubjectRecord = {
  departmentId: number;
  name: string;
  code: string;
  description: string | null;
};

const SubjectsEdit = () => {
  const back = useBack();

  const form = useForm<BaseRecord, HttpError, SubjectFormValues>({
    resolver: zodResolver(subjectSchema),
    refineCoreProps: {
      resource: "subjects",
      action: "edit",
      redirect: "show",
      queryOptions: {
        // GET /subjects/:id returns { subject, totals }; the form only needs the subject fields
        select: ({ data }) => {
          const subject = data.subject as SubjectRecord;
          return {
            data: {
              departmentId: subject.departmentId,
              name: subject.name,
              code: subject.code,
              description: subject.description ?? "",
            },
          };
        },
      },
    },
    defaultValues: {
      departmentId: 0,
      name: "",
      code: "",
      description: "",
    },
  });

  return (
    <EditView className="class-view">
      <Breadcrumb />

      <h1 className="page-title">Edit Subject</h1>
      <div className="intro-row">
        <p>Update the subject details below.</p>
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
            <SubjectForm
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

export default SubjectsEdit;
