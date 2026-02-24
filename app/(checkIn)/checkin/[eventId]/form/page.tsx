import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function CheckInFormPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const cookieStore = await cookies();
  const dest = cookieStore.get("checkin_dest")?.value;

  if (!dest) {
    // Cookie missing or expired — send them to dashboard rather than exposing an error
    redirect("/dashboard");
  }

  return (
    <iframe
      src={dest}
      title="Check-in form"
      style={{ position: "fixed", inset: 0, width: "100%", height: "100%", border: "none" }}
    />
  );
}
