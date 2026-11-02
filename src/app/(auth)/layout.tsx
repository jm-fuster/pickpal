import { PlainShell } from "@/components/layout/PlainShell";
import { StashPendingShare } from "@/components/lista/StashPendingShare";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <StashPendingShare />
      <PlainShell>{children}</PlainShell>
    </>
  );
}
