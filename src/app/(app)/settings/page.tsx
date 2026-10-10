"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth, useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useConvex, useMutation, useQuery } from "convex/react";
import { useTheme } from "next-themes";
import Link from "next/link";
import { ArrowUpRight, Check, Download, Moon, Sun } from "lucide-react";
import { toast } from "sonner";
import { userErrorMessage } from "@/lib/errors";
import { api } from "../../../../convex/_generated/api";
import { geistMono } from "@/app/fonts";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { LoadingFallback } from "@/components/layout/LoadingFallback";
import {
  ALL_STORES,
  STORE_ICONS,
  STORE_LABELS,
  sanitizeFavoriteStores,
  type StoreId,
} from "@/lib/stores";

// Ventana de la campana. El servidor acepta de 1 a 365 (convex/settings.ts),
// pero un campo numérico libre para esto es más cuerda de la que nadie
// necesita: cinco presets cubren el uso real y no hay estado inválido posible.
const NOTIFY_WINDOW_OPTIONS: { value: number; label: string }[] = [
  { value: 7, label: "7 días" },
  { value: 15, label: "15 días" },
  { value: 30, label: "30 días" },
  { value: 60, label: "60 días" },
  { value: 90, label: "90 días" },
];

const EMAIL_LEAD_OPTIONS: { value: number; label: string }[] = [
  { value: 0, label: "El mismo día" },
  { value: 2, label: "2 días antes" },
  { value: 7, label: "7 días antes" },
  { value: 14, label: "2 semanas antes" },
];

export default function SettingsPage() {
  const { isLoaded, isSignedIn } = useAuth();
  const { signOut } = useClerk();
  const router = useRouter();
  const ready = isLoaded && isSignedIn;
  const settings = useQuery(api.settings.getMine, ready ? {} : "skip");
  const setMine = useMutation(api.settings.setMine);
  const convex = useConvex();
  const { resolvedTheme, setTheme } = useTheme();

  const [notifyDays, setNotifyDays] = useState(30);
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [emailDays, setEmailDays] = useState<number[]>([]);
  const [favoriteStores, setFavoriteStores] = useState<StoreId[]>([]);
  const [mounted, setMounted] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);
  // Tras la primera carga, ignoramos cambios externos en `settings` para no
  // pisar actualizaciones optimistas que aún están viajando al servidor.
  const initializedRef = useRef(false);
  // Pill flotante "Guardado" — mismo patrón que /people/[id]/page.tsx
  const [savedRecently, setSavedRecently] = useState(false);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  useEffect(() => {
    return () => {
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    };
  }, []);

  const isDark = mounted ? resolvedTheme === "dark" : false;

  useEffect(() => {
    if (settings && !initializedRef.current) {
      setNotifyDays(settings.notifyDaysBefore);
      setEmailEnabled(settings.emailNotificationsEnabled);
      // Defensive: el backend puede devolver número (legacy) o array (nuevo)
      // mientras se propagan los despliegues. Normalizamos siempre a array.
      const raw = settings.emailNotifyDaysBefore as number | number[];
      setEmailDays(typeof raw === "number" ? [raw] : Array.isArray(raw) ? raw : []);
      setFavoriteStores(sanitizeFavoriteStores(settings.favoriteStores));
      initializedRef.current = true;
    }
  }, [settings]);

  if (!ready || settings === undefined) {
    return <LoadingFallback />;
  }

  // Helper: aplica patch optimista, llama al servidor, dispara el pill
  // "Guardado" en éxito y revierte + toast.error en fallo. Mismo patrón que
  // el autosave de la ficha de persona (silencio en éxito, toast en error).
  const save = async (
    patch: Parameters<typeof setMine>[0],
    revert: () => void,
  ) => {
    try {
      await setMine(patch);
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      setSavedRecently(true);
      savedTimerRef.current = setTimeout(() => setSavedRecently(false), 2000);
    } catch (err) {
      revert();
      toast.error(userErrorMessage(err, "No se pudo guardar"));
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const datos = await convex.query(api.exportData.mine, {});
      // La marca de tiempo se pone aquí y no en el servidor: una query de
      // Convex debe ser determinista, y el reloj del usuario es el que importa
      // para nombrar el archivo.
      const ahora = new Date();
      const contenido = JSON.stringify(
        { exportadoEl: ahora.toISOString(), ...datos },
        null,
        2,
      );
      const url = URL.createObjectURL(
        new Blob([contenido], { type: "application/json" }),
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = `pickpal-${ahora.toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(userErrorMessage(err, "No se pudo preparar la descarga"));
    } finally {
      setExporting(false);
    }
  };

  const handleNotifyWindow = (value: number) => {
    const previous = notifyDays;
    setNotifyDays(value);
    save({ notifyDaysBefore: value }, () => setNotifyDays(previous));
  };

  const handleEmailToggle = (checked: boolean) => {
    if (checked && !settings.email) {
      toast.error(
        "No encontramos tu email. Verifícalo en tu cuenta para activar las notificaciones.",
      );
      return;
    }
    const previous = emailEnabled;
    setEmailEnabled(checked);
    save(
      { emailNotificationsEnabled: checked },
      () => setEmailEnabled(previous),
    );
  };

  const handleEmailDayToggle = (day: number) => {
    const willCheck = !emailDays.includes(day);
    const next = willCheck
      ? [...emailDays, day].sort((a, b) => a - b)
      : emailDays.filter((d) => d !== day);
    if (next.length === 0) {
      toast.error("Selecciona al menos una antelación.");
      return;
    }
    const previous = emailDays;
    setEmailDays(next);
    save(
      { emailNotifyDaysBefore: next },
      () => setEmailDays(previous),
    );
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    let res: Response;
    try {
      res = await fetch("/api/account/delete", { method: "POST" });
    } catch {
      toast.error("No se pudo eliminar la cuenta");
      setDeleting(false);
      return;
    }
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "No se pudo eliminar la cuenta");
      setDeleting(false);
      return;
    }
    // Tras un OK la cuenta ya no existe: nunca mostramos un error falso.
    // signOut puede lanzar si Clerk ya invalidó la sesión al borrar el
    // usuario; en ese caso basta con volver a la landing.
    try {
      await signOut({ redirectUrl: "/" });
    } catch {
      // sesión ya invalidada
    }
    router.push("/");
  };

  const handleStoreToggle = (store: StoreId) => {
    const willCheck = !favoriteStores.includes(store);
    const next = willCheck
      ? ALL_STORES.filter((s) => [...favoriteStores, store].includes(s))
      : favoriteStores.filter((s) => s !== store);

    if (next.length === 0) {
      toast.error("Selecciona al menos una tienda.");
      return;
    }
    const previous = favoriteStores;
    setFavoriteStores(next);
    save({ favoriteStores: next }, () => setFavoriteStores(previous));
  };

  return (
    <main className="flex flex-1 flex-col gap-8 p-4 sm:p-6 lg:p-8 max-w-xl">
      <div>
        <h1 className="text-4xl font-medium">Ajustes</h1>
        <p className="text-muted-foreground">
          Los cambios se guardan automáticamente.
        </p>
      </div>

      <section className="space-y-3 rounded-xl border p-5">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label htmlFor="theme-toggle">Modo oscuro</Label>
            <p className="text-xs text-muted-foreground">
              Cambia entre tema claro y oscuro.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Sun className="size-4 text-muted-foreground" aria-hidden />
            <Switch
              id="theme-toggle"
              checked={isDark}
              onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
              suppressHydrationWarning
            />
            <Moon className="size-4 text-muted-foreground" aria-hidden />
          </div>
        </div>
      </section>

      <section className="space-y-3 rounded-xl border p-5">
        <div className="space-y-1">
          <Label id="notify-window-label">Qué te enseña la campana</Label>
          <p className="text-xs text-muted-foreground">
            Cuánto tiempo hacia delante mira el aviso de la cabecera. No afecta a
            la agenda, que siempre muestra los próximos cuatro meses.
          </p>
        </div>
        <div
          role="radiogroup"
          aria-labelledby="notify-window-label"
          className="flex flex-wrap gap-2"
        >
          {NOTIFY_WINDOW_OPTIONS.map((opt) => {
            const checked = notifyDays === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={checked}
                onClick={() => handleNotifyWindow(opt.value)}
                className={[
                  "rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                  checked
                    ? "border-border bg-muted text-foreground"
                    : "border-border/50 text-muted-foreground hover:border-border hover:bg-muted/40 hover:text-foreground",
                ].join(" ")}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </section>

      <section className="space-y-4 rounded-xl border p-5">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="email-toggle">Notificaciones por correo</Label>
              <p className="text-xs text-muted-foreground">
                Recibe un email cuando se acerquen tus eventos importantes.
              </p>
            </div>
            <Switch
              id="email-toggle"
              checked={emailEnabled}
              onCheckedChange={handleEmailToggle}
            />
          </div>

          {emailEnabled && (
            <div className="space-y-3 pt-1">
              {settings.email ? (
                <p className="text-xs text-muted-foreground">
                  Los avisos llegarán a{" "}
                  <span className="font-medium text-foreground">
                    {settings.email}
                  </span>
                  .
                </p>
              ) : (
                <p className="text-xs text-destructive">
                  No encontramos tu email. Verifícalo en tu cuenta para activar
                  las notificaciones.
                </p>
              )}
              <div className="space-y-2">
                <Label>Cuándo enviarte el correo</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {EMAIL_LEAD_OPTIONS.map((opt) => {
                    const checked = emailDays.includes(opt.value);
                    return (
                      <label
                        key={opt.value}
                        htmlFor={`email-day-${opt.value}`}
                        className={[
                          "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer transition-colors",
                          checked
                            ? "border-border bg-muted"
                            : "border-border/50 hover:border-border hover:bg-muted/40",
                        ].join(" ")}
                      >
                        <input
                          id={`email-day-${opt.value}`}
                          type="checkbox"
                          checked={checked}
                          onChange={() => handleEmailDayToggle(opt.value)}
                          className="size-4 rounded border-input accent-primary"
                        />
                        <span className="font-medium">{opt.label}</span>
                      </label>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground">
                  Recibirás un correo cada vez que se cumpla una de las
                  antelaciones marcadas. Puedes elegir varias.
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="space-y-3 rounded-xl border p-5">
        <div className="space-y-1">
          <Label>Tiendas para recomendaciones</Label>
          <p className="text-xs text-muted-foreground">
            Elige en qué tiendas quieres buscar regalos físicos. Los enlaces se
            generan como búsquedas en cada tienda.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
          {ALL_STORES.map((store) => {
            const checked = favoriteStores.includes(store);
            return (
              <label
                key={store}
                htmlFor={`store-${store}`}
                className={[
                  "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer transition-colors",
                  checked
                    ? "border-border bg-muted"
                    : "border-border/50 hover:border-border",
                ].join(" ")}
              >
                <input
                  id={`store-${store}`}
                  type="checkbox"
                  checked={checked}
                  onChange={() => handleStoreToggle(store)}
                  className="size-4 rounded border-input accent-primary"
                />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={STORE_ICONS[store]} alt="" className="size-4 rounded-sm object-contain bg-white p-px" aria-hidden />
                <span className="font-medium">{STORE_LABELS[store]}</span>
              </label>
            );
          })}
        </div>
      </section>

      <section className="space-y-3 rounded-xl border p-5">
        <div className="space-y-1">
          <Label>Legal</Label>
          <p className="text-xs text-muted-foreground">
            Cómo tratamos tus datos en PickPal.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <Link
            href="/privacidad"
            className="inline-flex items-center gap-2 text-sm font-medium text-foreground hover:text-muted-foreground"
          >
            Política de privacidad
            <ArrowUpRight className="size-4" aria-hidden />
          </Link>
          <Link
            href="/terminos"
            className="inline-flex items-center gap-2 text-sm font-medium text-foreground hover:text-muted-foreground"
          >
            Términos y condiciones de uso
            <ArrowUpRight className="size-4" aria-hidden />
          </Link>
        </div>
      </section>

      <section className="space-y-3 rounded-xl border p-5">
        <div className="space-y-1">
          <Label>Descargar mis datos</Label>
          <p className="text-xs text-muted-foreground">
            Un archivo JSON con todo lo que PickPal guarda de ti: tus seres
            queridos con sus fechas, notas e historial, tus ideas guardadas y
            tus ajustes. Los datos de acceso (nombre, correo, contraseña) los
            gestiona Clerk y se piden allí.
          </p>
        </div>
        <Button variant="outline" onClick={handleExport} disabled={exporting}>
          <Download className="size-4" aria-hidden />
          {exporting ? "Preparando…" : "Descargar JSON"}
        </Button>
      </section>

      <section className="space-y-3 rounded-xl border border-destructive/30 p-5">
        <div className="space-y-1">
          <Label className="text-destructive">Eliminar cuenta</Label>
          <p className="text-xs text-muted-foreground">
            Borra tu cuenta y tus datos en PickPal: seres queridos, eventos,
            historial de regalos y ajustes. Cada ficha que compartiste pasa a
            la primera persona que invitaste, y lo que añadiste a fichas de
            otros se queda en ellas. Esta acción no se puede deshacer.
          </p>
        </div>
        <Button
          variant="destructive"
          onClick={() => {
            setDeleteConfirmText("");
            setDeleteOpen(true);
          }}
        >
          Eliminar mi cuenta
        </Button>
      </section>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Seguro que quieres borrar tu cuenta?</DialogTitle>
            <DialogDescription>
              Se borrarán de forma permanente tus datos en PickPal y tu cuenta
              de acceso. No se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="delete-confirm">
              Escribe <span className={`${geistMono.variable} font-mono font-semibold`}>ELIMINAR</span>{" "}
              para confirmar
            </Label>
            <Input
              id="delete-confirm"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="ELIMINAR"
              autoComplete="off"
              disabled={deleting}
            />
          </div>
          <DialogFooter>
            <DialogClose
              render={
                <Button variant="outline" disabled={deleting}>
                  Cancelar
                </Button>
              }
            />
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={deleting || deleteConfirmText !== "ELIMINAR"}
            >
              {deleting ? "Eliminando…" : "Eliminar cuenta"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pill flotante "Guardado" — mismo patrón que la ficha de persona.
          El texto va condicional DENTRO de la región aria-live: un cambio de
          opacidad no se anuncia; la inserción de contenido sí. */}
      <div
        aria-live="polite"
        className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-primary px-3 py-2 text-xs font-medium text-primary-foreground shadow-md transition-all duration-300 ${
          savedRecently
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-2 pointer-events-none"
        }`}
      >
        {savedRecently ? (
          <>
            <Check className="size-3" aria-hidden />
            Guardado
          </>
        ) : null}
      </div>
    </main>
  );
}
