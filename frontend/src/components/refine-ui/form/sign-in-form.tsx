"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

import { InputPassword } from "@/components/refine-ui/form/input-password";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useLink, useLogin } from "@refinedev/core";

const signInSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().optional(),
});

type SignInFormValues = z.infer<typeof signInSchema>;

// Seeded accounts (backend/seed/data.json). The public demo database is
// reset from the seed every night, so visitors can change anything.
const DEMO_ACCOUNTS = [
  { label: "Admin", email: "ava.admin@example.com", password: "Admin#1234" },
  { label: "Teacher", email: "liam.patel@example.com", password: "Teach#1234" },
  { label: "Student", email: "arjun.singh@example.com", password: "Student#123" },
];

export const SignInForm = () => {
  const Link = useLink();

  const { mutate: login, isPending: isLoggingIn } = useLogin();

  const form = useForm<SignInFormValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false,
    },
  });

  const handleSignIn = async (values: SignInFormValues) => {
    login({
      email: values.email,
      password: values.password,
    });
  };

  return (
    <div className="sign-in">
      <div className="logo">
        <img src="/logo.svg" alt="Logo" />
      </div>

      <Card className="card">
        <CardHeader className="header">
          <CardTitle className="title">Sign in</CardTitle>
          <CardDescription className="description">
            Welcome back
          </CardDescription>
        </CardHeader>

        <CardContent className="content">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSignIn)} className="form">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem className="field">
                    <FormLabel htmlFor="email">Email</FormLabel>
                    <FormControl>
                      <Input
                        id="email"
                        type="email"
                        placeholder=""
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem className="field">
                    <FormLabel htmlFor="password">Password</FormLabel>
                    <FormControl>
                      <InputPassword id="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="row">
                <FormField
                  control={form.control}
                  name="rememberMe"
                  render={({ field }) => (
                    <FormItem className="remember">
                      <FormControl>
                        <Checkbox
                          id="remember"
                          checked={field.value}
                          onCheckedChange={(checked) =>
                            field.onChange(
                              checked === "indeterminate" ? false : checked
                            )
                          }
                        />
                      </FormControl>
                      <FormLabel htmlFor="remember">Remember me</FormLabel>
                    </FormItem>
                  )}
                />
              </div>

              <Button
                type="submit"
                size="lg"
                className="submit"
                disabled={isLoggingIn}
              >
                {isLoggingIn ? "Signing in..." : "Sign in"}
              </Button>

              <div className="split">
                <Separator />
                <span>or</span>
                <Separator />
              </div>

              <div className="social">
                <p>Try the demo as</p>
                <div className="grid grid-cols-3 gap-2">
                  {DEMO_ACCOUNTS.map((account) => (
                    <Button
                      key={account.label}
                      variant="outline"
                      type="button"
                      disabled={isLoggingIn}
                      onClick={() =>
                        login({ email: account.email, password: account.password })
                      }
                    >
                      {account.label}
                    </Button>
                  ))}
                </div>
              </div>
            </form>
          </Form>
        </CardContent>

        <Separator className="divider" />

        <CardFooter className="footer">
          <span>No account?</span>
          <Link to="/register"> Sign up</Link>
        </CardFooter>
      </Card>
    </div>
  );
};

SignInForm.displayName = "SignInForm";
