import { AuthFrame, tenantBranding } from "../AuthFrame";
import { ForgotForm } from "./ForgotForm";

// Not drawn in the mockups: password reset request, same layout as app/login.html.
export default async function ForgotPage() {
  return (
    <AuthFrame tenant={await tenantBranding()}>
      <ForgotForm />
    </AuthFrame>
  );
}
