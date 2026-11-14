import type { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Logo } from "@/components/Logo";
import { DecisionPreview } from "@/pages/landing/DecisionPreview";

/** Frame shared by sign-in, sign-up, invite and onboarding screens: a split panel from lg up, single column below. */
export function AuthCard({ title, description, children, footer }: { title: string; description?: ReactNode; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col items-center justify-center gap-6 bg-canvas px-4 py-10">
        <Logo className="lg:hidden" />
        <Card className="w-full max-w-sm">
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
      <div className="hidden flex-col items-center justify-center gap-8 bg-sidebar p-10 lg:flex">
        <Logo />
        <p className="max-w-sm text-center text-lg text-muted-foreground">Write the rules once. Every system that calls PengOPA gets the same answer, in milliseconds.</p>
        <DecisionPreview className="w-full max-w-sm" />
      </div>
    </div>
  );
}
