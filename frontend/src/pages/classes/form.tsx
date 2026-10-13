import { useList, type BaseRecord, type HttpError } from "@refinedev/core";
import type { UseFormReturnType } from "@refinedev/react-hook-form";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import UploadWidget from "@/components/upload-widget";
import type { ClassFormValues } from "@/lib/schema";
import type { Subject, User } from "@/types";

// Radix Select calls onValueChange("") when its value goes from undefined to
// a real one (as when the edit page loads), wiping the field. Users can't pick "".
const ignoreEmpty =
  (onChange: (value: string) => void) => (value: string) => {
    if (value !== "") onChange(value);
  };

type ClassFormProps = {
  form: UseFormReturnType<BaseRecord, HttpError, ClassFormValues>;
  submitLabel: string;
  submittingLabel: string;
  // Teachers can't pick (or change) a class's teacher; the API enforces this too
  lockTeacher: boolean;
};

// Shared by the create and edit pages.
export const ClassForm = ({
  form,
  submitLabel,
  submittingLabel,
  lockTeacher,
}: ClassFormProps) => {
  const {
    refineCore: { onFinish, formLoading },
    handleSubmit,
    formState: { isSubmitting },
    control,
  } = form;

  const bannerPublicId = form.watch("bannerCldPubId");

  const onSubmit = async (values: ClassFormValues) => {
    try {
      await onFinish(values);
    } catch (error) {
      console.error("Error saving class:", error);
    }
  };

  // Fetch subjects list
  const { query: subjectsQuery } = useList<Subject>({
    resource: "subjects",
    pagination: {
      pageSize: 100,
    },
  });

  // Fetch teachers list
  const { query: teachersQuery } = useList<User>({
    resource: "users",
    filters: [
      {
        field: "role",
        operator: "eq",
        value: "teacher",
      },
    ],
    pagination: {
      pageSize: 100,
    },
  });

  const teachers = teachersQuery.data?.data || [];
  const teachersLoading = teachersQuery.isLoading;

  const subjects = subjectsQuery.data?.data || [];
  const subjectsLoading = subjectsQuery.isLoading;

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <FormField
          control={control}
          name="bannerUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Banner Image <span className="text-orange-600">*</span>
              </FormLabel>
              <FormControl>
                <UploadWidget
                  value={
                    field.value
                      ? {
                          url: field.value,
                          publicId: bannerPublicId ?? "",
                        }
                      : null
                  }
                  onChange={(file) => {
                    if (file) {
                      field.onChange(file.url);
                      form.setValue("bannerCldPubId", file.publicId, {
                        shouldValidate: true,
                        shouldDirty: true,
                      });
                    } else {
                      field.onChange("");
                      form.setValue("bannerCldPubId", "", {
                        shouldValidate: true,
                        shouldDirty: true,
                      });
                    }
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Class Name <span className="text-orange-600">*</span>
              </FormLabel>
              <FormControl>
                <Input
                  placeholder="Introduction to Biology - Section A"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid sm:grid-cols-2 gap-4">
          <FormField
            control={control}
            name="subjectId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Subject <span className="text-orange-600">*</span>
                </FormLabel>
                <Select
                  onValueChange={ignoreEmpty((value) =>
                    field.onChange(Number(value))
                  )}
                  value={field.value?.toString()}
                  disabled={subjectsLoading}
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a subject" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {subjects.map((subject) => (
                      <SelectItem
                        key={subject.id}
                        value={subject.id.toString()}
                      >
                        {subject.name} ({subject.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="teacherId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Teacher <span className="text-orange-600">*</span>
                </FormLabel>
                <Select
                  onValueChange={ignoreEmpty(field.onChange)}
                  value={field.value?.toString()}
                  disabled={teachersLoading || lockTeacher}
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a teacher" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {teachers.map((teacher) => (
                      <SelectItem key={teacher.id} value={teacher.id}>
                        {teacher.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <FormField
            control={control}
            name="capacity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Capacity <span className="text-orange-600">*</span>
                </FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={1}
                    placeholder="30"
                    onChange={(e) => {
                      const value = e.target.value;
                      field.onChange(value ? Number(value) : undefined);
                    }}
                    value={(field.value as number | undefined) ?? ""}
                    name={field.name}
                    ref={field.ref}
                    onBlur={field.onBlur}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Status <span className="text-orange-600">*</span>
                </FormLabel>
                <Select
                  onValueChange={ignoreEmpty(field.onChange)}
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    {field.value === "archived" && (
                      <SelectItem value="archived">Archived</SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Description <span className="text-orange-600">*</span>
              </FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Brief description about the class"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Separator />

        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={isSubmitting || formLoading}
        >
          {isSubmitting ? (
            <div className="flex gap-1">
              <span>{submittingLabel}</span>
              <Loader2 className="inline-block ml-2 animate-spin" />
            </div>
          ) : (
            submitLabel
          )}
        </Button>
      </form>
    </Form>
  );
};
