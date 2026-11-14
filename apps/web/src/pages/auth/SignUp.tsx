import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ErrorText } from "@/components/ErrorText";
import { signIn, signUp } from "@/lib/auth";
import { useConfig } from "@/lib/config";
import { AuthCard, OrDivider } from "./AuthCard";

export function SignUp() {
  const { redirect } = useSearch({ strict: false }) as { redirect?: string };
  const navigate = useNavigate();
  const { data: config } = useConfig();
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const next = redirect && redirect.startsWith("/") ? redirect : "/onboarding";

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    setError(undefined);
    const res = await signUp.email({
      name: String(form.get("name")),
      email: String(form.get("email")),
      password: String(form.get("password")),
    });
    setBusy(false);
    if (res.error) return setError(res.error.message ?? "Could not create the account");
    void navigate({ to: next });
  }

  return (
    <AuthCard
      title="Create your account"
      description="Start free. You'll have a working policy in a few minutes."
      footer={
        <>
          Already have an account?{" "}
          <Link to="/sign-in" search={{ redirect }} className="font-medium text-foreground underline-offset-4 hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      {config?.googleEnabled && (
        <>
          <Button variant="outline" className="h-9" onClick={() => void signIn.social({ provider: "google", callbackURL: next })}>
            Continue with Google
          </Button>
          <OrDivider />
        </>
      )}
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="grid gap-2">
          <Label htmlFor="name">Your name</Label>
          <Input id="name" name="name" autoComplete="name" required />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="email">Work email</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="password">Password</Label>
          <Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
          <p className="text-xs text-muted-foreground">At least 8 characters.</p>
        </div>
        {error && <ErrorText error={new Error(error)} />}
        <Button type="submit" className="h-9" disabled={busy}>
          {busy ? "Creating account…" : "Create account"}
        </Button>
      </form>
    </AuthCard>
  );
}
