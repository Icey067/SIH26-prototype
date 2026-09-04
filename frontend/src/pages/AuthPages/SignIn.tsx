import PageMeta from "../../components/common/PageMeta";
import AuthLayout from "./AuthPageLayout";
import SignInForm from "../../components/auth/SignInForm";

export default function SignIn() {
  return (
    <>
      <PageMeta
        title="Officer Sign In | Samanvay-AI Indian Railways"
        description="Official Railnet Authentication and Tactical Access Gateway for Indian Railways Samanvay-AI."
      />
      <AuthLayout>
        <SignInForm />
      </AuthLayout>
    </>
  );
}
