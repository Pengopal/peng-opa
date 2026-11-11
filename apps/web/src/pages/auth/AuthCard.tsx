import type { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Logo } from "@/components/Logo";

/** Frame shared by sign-in, sign-up, invite and onboarding screens. */
export function AuthCard({ title, description, children, footer }: { title: string; description?: ReactNode; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-canvas px-4 py-10">
      <Logo />
      <Card className="w-full max-w-sm border-t-4 border-t-gold">
        <CardHeader>
          <CardTitle className="text-xl">
            <h1>{title}</h1>
          </CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent className="flex flex-col gap-4">{children}</CardContent>
      </Card>
      {footer && <div className="text-sm text-muted-foreground">{footer}</div>}
    </div>
  );
}
