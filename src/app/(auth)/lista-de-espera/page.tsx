import { Waitlist } from "@clerk/nextjs";

// Destino de «Unirte a la lista de espera» (waitlistUrl en el layout raíz).
// Sin afterJoinWaitlistUrl: tras apuntarse se queda en el aviso de éxito.
export default function WaitlistPage() {
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <Waitlist signInUrl="/sign-in" />
    </div>
  );
}
