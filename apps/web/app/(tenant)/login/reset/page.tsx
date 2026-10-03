import { AuthFrame, tenantBranding } from "../AuthFrame";
import { ResetForm } from "./ResetForm";

// Target of the reset mail: better-auth redirects here with ?token=… (or ?error=INVALID_TOKEN).
export default async function ResetPage({ searchParams }: { searchParams: Promise<{ token?: string; error?: string }> }) {
  const { token, error } = await searchParams;
  return (
    <AuthFrame tenant={await tenantBranding()}>
      <ResetForm token={token && !error ? token : null} />
    </AuthFrame>
  );
}
