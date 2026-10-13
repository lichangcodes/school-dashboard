import { useForm } from "@refinedev/react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  useBack,
  useGetIdentity,
  type BaseRecord,
  type HttpError,
} from "@refinedev/core";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CreateView } from "@/components/refine-ui/views/create-view";
import { Breadcrumb } from "@/components/refine-ui/layout/breadcrumb";
import { classSchema, type ClassFormValues } from "@/lib/schema";
import { User, UserRole } from "@/types";

import { ClassForm } from "./form";

const ClassesCreate = () => {
  const back = useBack();

  const form = useForm<BaseRecord, HttpError, ClassFormValues>({
    resolver: zodResolver(classSchema),
    refineCoreProps: {
      resource: "classes",
      action: "create",
    },
    defaultValues: {
      status: "active",
    },
  });

  // Teachers can only create classes they teach (enforced by the API), so lock the field to them
  const { data: currentUser } = useGetIdentity<User>();
  const isTeacher = currentUser?.role === UserRole.TEACHER;

  useEffect(() => {
    if (isTeacher && currentUser) {
      form.setValue("teacherId", currentUser.id);
    }
  }, [isTeacher, currentUser, form]);

  return (
    <CreateView className="class-view">
      <Breadcrumb />

      <h1 className="page-title">Create a Class</h1>
      <div className="intro-row">
        <p>Provide the required information below to add a class.</p>
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
            <ClassForm
              form={form}
              submitLabel="Create Class"
              submittingLabel="Creating Class..."
              lockTeacher={isTeacher}
            />
          </CardContent>
        </Card>
      </div>
    </CreateView>
  );
};

export default ClassesCreate;
