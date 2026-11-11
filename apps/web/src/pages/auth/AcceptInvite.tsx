import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ErrorText } from "@/components/ErrorText";
import { api } from "@/lib/api";
import { useSession } from "@/lib/auth";
import { AuthCard } from "./AuthCard";

export function AcceptInvite() {
  const { token } = useParams({ strict: false }) as { token: string };
  const { data: session, isPending } = useSession();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [error, setError] = useState<unknown>();
  const started = useRef(false);
  const here = `/invite/${token}`;

  useEffect(() => {
    if (!session || started.current) return;
    started.current = true;
    api<{ workspaceId: string }>("/api/invites/accept", { method: "POST", body: { token } })
      .then(async ({ workspaceId }) => {
        try {
          localStorage.setItem("peng-opa.workspace", workspaceId);
        } catch {
          /* not remembered */
        }
        await qc.invalidateQueries({ queryKey: ["workspaces"] });
        void navigate({ to: "/" });
      })
      .catch(setError);
  }, [session, token, navigate, qc]);

  if (isPending) return null;
  if (!session) {
    return (
      <AuthCard title="You're invited" description="Sign in or create an account with the email address the invite was sent to.">
        <Button asChild>
          <Link to="/sign-up" search={{ redirect: here }}>
            Create an account
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/sign-in" search={{ redirect: here }}>
            I already have an account
          </Link>
        </Button>
      </AuthCard>
    );
  }
  return (
    <AuthCard title="Joining workspace…">
      {error ? (
        <>
          <ErrorText error={error} />
          <Button asChild variant="outline">
            <Link to="/">Go to my workspaces</Link>
          </Button>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">One moment.</p>
      )}
    </AuthCard>
  );
}
