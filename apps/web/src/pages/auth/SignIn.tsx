import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ErrorText } from "@/components/ErrorText";
import { signIn } from "@/lib/auth";
import { useConfig } from "@/lib/config";
import { openPublicDemo } from "@/lib/demo";
import { AuthCard, OrDivider } from "./AuthCard";

export function SignIn() {
  const { redirect } = useSearch({ strict: false }) as { redirect?: string };
  const navigate = useNavigate();
  const { data: config } = useConfig();
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const next = redirect && redirect.startsWith("/") && redirect !== "/" ? redirect : "/home";

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    setError(undefined);
    const res = await signIn.email({ email: String(form.get("email")), password: String(form.get("password")) });
    setBusy(false);
    if (res.error) return setError(res.error.message ?? "Email or password is incorrect");
    void navigate({ to: next });
  }

  return (
    <AuthCard
      title="Sign in"
      description="Welcome back. Sign in to manage your policies."
      footer={
        <>
          New here?{" "}
          <Link to="/sign-up" search={{ redirect }} className="font-medium text-foreground underline-offset-4 hover:underline">
            Create an account
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
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="password">Password</Label>
          <Input id="password" name="password" type="password" autoComplete="current-password" required />
        </div>
        {error && <ErrorText error={new Error(error)} />}
        <Button type="submit" className="h-9" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </Button>
      </form>
      {config?.demoPublic && (
        <Button variant="ghost" className="text-muted-foreground" onClick={() => void openPublicDemo()}>
          Try the live demo
        </Button>
      )}
    </AuthCard>
  );
}
