import { useList, type BaseRecord, type HttpError } from "@refinedev/core";
import type { UseFormReturnType } from "@refinedev/react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import type { SubjectFormValues } from "@/lib/schema";
import type { Department } from "@/types";

type SubjectFormProps = {
  form: UseFormReturnType<BaseRecord, HttpError, SubjectFormValues>;
  submitLabel: string;
  submittingLabel: string;
};

// Shared by the create and edit pages.
export const SubjectForm = ({
  form,
  submitLabel,
  submittingLabel,
}: SubjectFormProps) => {
  const {
    refineCore: { onFinish, formLoading },
    handleSubmit,
    formState: { isSubmitting },
    control,
  } = form;

  const { query: departmentsQuery } = useList<Department>({
    resource: "departments",
    pagination: {
      pageSize: 100,
    },
  });

  const departments = departmentsQuery.data?.data ?? [];
  const departmentsLoading = departmentsQuery.isLoading;

  const onSubmit = async (values: SubjectFormValues) => {
    try {
      await onFinish(values);
    } catch (error) {
      console.error("Error saving subject:", error);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <FormField
          control={control}
          name="departmentId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Department <span className="text-orange-600">*</span>
              </FormLabel>
              <Select
                onValueChange={(value) => field.onChange(Number(value))}
                value={field.value ? String(field.value) : ""}
                disabled={departmentsLoading}
              >
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a department" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {departments.map((department) => (
                    <SelectItem
                      key={department.id}
                      value={String(department.id)}
                    >
                      {department.name}
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
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Subject Name <span className="text-orange-600">*</span>
              </FormLabel>
              <FormControl>
                <Input placeholder="Intro to Programming" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="code"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Subject Code <span className="text-orange-600">*</span>
              </FormLabel>
              <FormControl>
                <Input placeholder="CS101" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

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
                  placeholder="Describe the subject focus..."
                  className="min-h-28"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          size="lg"
          disabled={isSubmitting || formLoading}
        >
          {isSubmitting ? submittingLabel : submitLabel}
        </Button>
      </form>
    </Form>
  );
};
