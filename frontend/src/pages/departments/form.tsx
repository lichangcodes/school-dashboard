import type { BaseRecord, HttpError } from "@refinedev/core";
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
import type { DepartmentFormValues } from "@/lib/schema";

type DepartmentFormProps = {
  form: UseFormReturnType<BaseRecord, HttpError, DepartmentFormValues>;
  submitLabel: string;
  submittingLabel: string;
};

// Shared by the create and edit pages.
export const DepartmentForm = ({
  form,
  submitLabel,
  submittingLabel,
}: DepartmentFormProps) => {
  const {
    refineCore: { onFinish, formLoading },
    handleSubmit,
    formState: { isSubmitting },
    control,
  } = form;

  const onSubmit = async (values: DepartmentFormValues) => {
    try {
      await onFinish(values);
    } catch (error) {
      console.error("Error saving department:", error);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <FormField
          control={control}
          name="code"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Department Code <span className="text-orange-600">*</span>
              </FormLabel>
              <FormControl>
                <Input placeholder="CS" {...field} />
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
                Department Name <span className="text-orange-600">*</span>
              </FormLabel>
              <FormControl>
                <Input placeholder="Computer Science" {...field} />
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
                  placeholder="Describe the department focus..."
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
