import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const metadata = { title: "Live desk sign-in", robots: { index: false } };

type Params = Promise<{ error?: string }>;

// Reads the URL, so it renders at request time inside Suspense; the rest of the page is static.
async function WrongPassword({ searchParams }: { searchParams: Params }) {
  const { error } = await searchParams;
  return error ? <p role="alert" className="text-sm text-alert">Wrong password. Try again.</p> : null;
}

export default function Login({ searchParams }: { searchParams: Params }) {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <form method="post" action="/api/login" className="w-full max-w-sm space-y-3 rounded-lg border bg-card p-6">
        <h1 className="text-base font-semibold">Live sales desk</h1>
        <p className="text-sm text-muted-foreground">Real WhatsApp conversations. Enter the desk password.</p>
        <Input type="password" name="password" placeholder="Desk password" autoComplete="current-password" autoFocus required aria-label="Desk password" />
        <Suspense fallback={null}>
          <WrongPassword searchParams={searchParams} />
        </Suspense>
        <Button type="submit" className="w-full">Sign in</Button>
      </form>
    </main>
  );
}
