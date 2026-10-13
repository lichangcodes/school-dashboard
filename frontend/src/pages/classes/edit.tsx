import { useForm } from "@refinedev/react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  useBack,
  useGetIdentity,
  type BaseRecord,
  type HttpError,
} from "@refinedev/core";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { EditView } from "@/components/refine-ui/views/edit-view";
import { Breadcrumb } from "@/components/refine-ui/layout/breadcrumb";
import { classSchema, type ClassFormValues } from "@/lib/schema";
import { ClassDetails, User, UserRole } from "@/types";

import { ClassForm } from "./form";

const ClassesEdit = () => {
  const back = useBack();
  const { data: currentUser } = useGetIdentity<User>();
  const isTeacher = currentUser?.role === UserRole.TEACHER;

  const form = useForm<BaseRecord, HttpError, ClassFormValues>({
    resolver: zodResolver(classSchema),
    refineCoreProps: {
      resource: "classes",
      action: "edit",
      redirect: "show",
      queryOptions: {
        // Keep only editable fields; the response also has joined subject/teacher/department
        select: ({ data }) => {
          const details = data as ClassDetails;
          return {
            data: {
              name: details.name,
              description: details.description ?? "",
              subjectId: details.subject?.id,
              teacherId: details.teacherId,
              capacity: details.capacity,
              status: details.status,
              bannerUrl: details.bannerUrl ?? "",
              bannerCldPubId: details.bannerCldPubId ?? "",
            },
          };
        },
      },
    },
  });

  const classTeacherId = form.refineCore.query?.data?.data?.teacherId;
  // The API answers 404 for another teacher's class; say so up front instead of after submit
  const notOwner =
    isTeacher && classTeacherId !== undefined && classTeacherId !== currentUser?.id;

  return (
    <EditView className="class-view">
      <Breadcrumb />

      <h1 className="page-title">Edit Class</h1>
      <div className="intro-row">
        <p>Update the class details below.</p>
        <Button onClick={() => back()}>Go Back</Button>
      </div>

      <Separator />

      {notOwner ? (
        <p className="state-message">You can only edit classes you teach.</p>
      ) : (
        <div className="my-4 flex items-center">
          <Card className="class-form-card">
            <CardHeader className="relative z-10">
              <CardTitle className="text-2xl pb-0 font-bold text-gradient-orange">
                Edit form
              </CardTitle>
            </CardHeader>

            <Separator />

            <CardContent className="mt-7">
              <ClassForm
                form={form}
                submitLabel="Save Changes"
                submittingLabel="Saving..."
                lockTeacher={isTeacher}
              />
            </CardContent>
          </Card>
        </div>
      )}
    </EditView>
  );
};

export default ClassesEdit;
