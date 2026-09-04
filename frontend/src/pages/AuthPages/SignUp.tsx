import PageMeta from "../../components/common/PageMeta";
import AuthLayout from "./AuthPageLayout";
import SignUpForm from "../../components/auth/SignUpForm";

export default function SignUp() {
  return (
    <>
      <PageMeta
        title="Officer Registration | Samanvay-AI Indian Railways"
        description="Railway Officer Registration and Onboarding Portal for Samanvay-AI Tactical Dispatch."
      />
      <AuthLayout>
        <SignUpForm />
      </AuthLayout>
    </>
  );
}
