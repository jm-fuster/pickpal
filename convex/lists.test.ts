/// <reference types="vite/client" />
// @vitest-environment edge-runtime

// «Mi lista» (docs/encargo-lista.md). La función se sostiene sobre una sola
// propiedad: el dueño nunca ve las marcas. Si eso falla, falla sin que nadie
// lo note hasta que alguien descubre su regalo, así que es lo primero que se
// prueba aquí. Después, quién ve la lista y quién no, qué pasa al perder el
// acceso, las marcas sobre elementos que cambian, los topes, compartir de
// vuelta, el borrado de cuenta, la exportación y la línea del email.

import { convexTest } from "convex-test";
import { afterEach, describe, expect, test, vi } from "vitest";
import { api, internal } from "./_generated/api";
import { INVITE_EMAIL_COOLDOWN_MS, MAX_ITEMS_PER_LIST, MAX_READERS_PER_LIST } from "./lists";
import { buildListInviteEmail } from "./emails";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

const ISSUER = "https://test.clerk.dev";
const LAURA = { subject: "user_laura", issuer: ISSUER, givenName: "Laura", email: "laura@example.com" };
const ALEX = { subject: "user_alex", issuer: ISSUER, givenName: "Alex", email: "alex@example.com" };
const MAMA = { subject: "user_mama", issuer: ISSUER, email: "mama@example.com" };
const SARA = { subject: "user_sara", issuer: ISSUER, givenName: "Sara", email: "sara@example.com" };
const OTRO = { subject: "user_otro", issuer: ISSUER, givenName: "Otro", email: "otro@example.com" };

type T = ReturnType<typeof convexTest>;

/**
 * Laura apunta dos cosas y comparte su lista con Alex, su pareja, que la
 * asocia a la ficha que ya tenía de ella.
 */
async function escenario(t: T) {
  const laura = t.withIdentity(LAURA);
  const vela = await laura.mutation(api.lists.addItem, {
    title: "Vela de cera",
    url: "https://www.amazon.es/dp/B0VELA",
    note: "La de higo",
  });
  const libro = await laura.mutation(api.lists.addItem, { title: "Libro de cerámica" });
  const { shareId: shareAlex } = await laura.mutation(api.lists.invite, { readerClerkUserId: ALEX.subject });

  const alex = t.withIdentity(ALEX);
  const fichaDeAlex = await alex.mutation(api.people.create, {
    name: "Laura",
    relationship: "partner",
    interests: [],
  });
  await alex.mutation(api.lists.associate, { shareId: shareAlex, personId: fichaDeAlex });
  return { laura, alex, vela, libro, shareAlex, fichaDeAlex };
}

/** La madre de Laura también recibe la lista y la asocia a su ficha. */
async function sumarMama(t: T) {
  const { shareId: shareMama } = await t
    .withIdentity(LAURA)
    .mutation(api.lists.invite, { readerClerkUserId: MAMA.subject });
  const mama = t.withIdentity(MAMA);
  const fichaDeMama = await mama.mutation(api.people.create, {
    name: "Laura",
    relationship: "family",
    interests: [],
  });
  await mama.mutation(api.lists.associate, { shareId: shareMama, personId: fichaDeMama });
  return { mama, shareMama, fichaDeMama };
}

afterEach(() => {
  vi.useRealTimers();
});

describe("el dueño nunca ve las marcas", () => {
  test("sus elementos salen igual antes y después de que alguien marque", async () => {
    const t = convexTest(schema, modules);
    const { laura, alex, vela } = await escenario(t);

    const antes = await laura.query(api.lists.myItems, {});
    const claimId = await alex.mutation(api.lists.claim, { itemId: vela });
    const marcado = await laura.query(api.lists.myItems, {});
    await alex.mutation(api.lists.markGiven, { claimId });
    const regalado = await laura.query(api.lists.myItems, {});

    expect(marcado).toEqual(antes);
    expect(regalado).toEqual(antes);
    const permitidos = new Set(["_id", "_creationTime", "title", "url", "note"]);
    for (const item of antes) {
      for (const campo of Object.keys(item)) expect(permitidos).toContain(campo);
    }
  });

  test("ni un contador: la lista de quién la ve no cambia al marcar ni al asociar", async () => {
    const t = convexTest(schema, modules);
    const laura = t.withIdentity(LAURA);
    const vela = await laura.mutation(api.lists.addItem, { title: "Vela de cera" });
    const { shareId: shareAlex } = await laura.mutation(api.lists.invite, { readerClerkUserId: ALEX.subject });

    const antes = await laura.query(api.lists.myReaders, {});

    const alex = t.withIdentity(ALEX);
    const ficha = await alex.mutation(api.people.create, { name: "Laura", relationship: "partner", interests: [] });
    await alex.mutation(api.lists.associate, { shareId: shareAlex, personId: ficha });
    await alex.mutation(api.lists.claim, { itemId: vela });

    expect(await laura.query(api.lists.myReaders, {})).toEqual(antes);
  });

  test("su exportación de datos tampoco lleva marcas", async () => {
    const t = convexTest(schema, modules);
    const { laura, alex, vela, libro } = await escenario(t);
    await alex.mutation(api.lists.claim, { itemId: vela });
    await alex.mutation(api.lists.claim, { itemId: libro });

    const datos = await laura.query(api.exportData.mine, {});
    expect(datos.miLista.elementos.map((e) => e.titulo).sort()).toEqual([
      "Libro de cerámica",
      "Vela de cera",
    ]);
    expect(datos.marcasEnListasDeOtros).toEqual([]);
    const json = JSON.stringify(datos);
    expect(json).not.toContain("lo regalo yo");
    expect(json).not.toContain("regalado");
    expect(json).not.toContain("marked");
  });

  test("un lector no sabe quién más la lee ni quién ha marcado", async () => {
    const t = convexTest(schema, modules);
    const { alex, libro, fichaDeAlex } = await escenario(t);
    const { mama } = await sumarMama(t);
    await mama.mutation(api.lists.claim, { itemId: libro });

    const [lista] = await alex.query(api.lists.forPerson, { personId: fichaDeAlex });
    const elLibro = lista.items.find((i) => i._id === libro)!;
    expect(elLibro.state).toBe("taken");
    expect(elLibro.claimId).toBeNull();

    const json = JSON.stringify([lista, await alex.query(api.lists.sharedWithMe, {})]);
    expect(json).not.toContain(MAMA.subject);
    expect(json).not.toContain(MAMA.email);
  });
});

describe("quién ve la lista", () => {
  test("el lector la ve en la ficha a la que la asoció", async () => {
    const t = convexTest(schema, modules);
    const { alex, fichaDeAlex } = await escenario(t);

    const [lista] = await alex.query(api.lists.forPerson, { personId: fichaDeAlex });
    expect(lista.ownerName).toBe("Laura");
    expect(lista.ownerEmail).toBe(LAURA.email);
    expect(lista.items.map((i) => i.title)).toEqual(["Libro de cerámica", "Vela de cera"]);
    expect(lista.items.every((i) => i.state === "free")).toBe(true);
  });

  test("un tercero no la ve ni puede marcar nada", async () => {
    const t = convexTest(schema, modules);
    const { vela, fichaDeAlex } = await escenario(t);
    const otro = t.withIdentity(OTRO);

    expect(await otro.query(api.lists.forPerson, { personId: fichaDeAlex })).toEqual([]);
    expect(await otro.query(api.lists.sharedWithMe, {})).toEqual([]);
    await expect(otro.mutation(api.lists.claim, { itemId: vela })).rejects.toThrow(
      /Elemento no encontrado/,
    );
  });

  test("otro invitado de la ficha asociada no la ve sin permiso de la dueña", async () => {
    const t = convexTest(schema, modules);
    const { alex, vela, fichaDeAlex } = await escenario(t);
    await alex.mutation(api.personShares.invite, {
      personId: fichaDeAlex,
      clerkUserId: SARA.subject,
    });
    const sara = t.withIdentity(SARA);

    // Sara ve la ficha: es la misma. Pero la lista va por el permiso de Laura.
    expect(await sara.query(api.people.getById, { id: fichaDeAlex })).not.toBeNull();
    expect(await sara.query(api.lists.forPerson, { personId: fichaDeAlex })).toEqual([]);
    await expect(sara.mutation(api.lists.claim, { itemId: vela })).rejects.toThrow(
      /Elemento no encontrado/,
    );
  });

  test("hasta que la asocia, queda pendiente y no sale en ninguna ficha", async () => {
    const t = convexTest(schema, modules);
    const laura = t.withIdentity(LAURA);
    await laura.mutation(api.lists.addItem, { title: "Vela de cera" });
    const { shareId: share } = await laura.mutation(api.lists.invite, { readerClerkUserId: ALEX.subject });
    const alex = t.withIdentity(ALEX);
    const ficha = await alex.mutation(api.people.create, { name: "Laura", relationship: "partner", interests: [] });

    expect(await alex.query(api.lists.sharedWithMe, {})).toMatchObject([
      { shareId: share, personId: null, ownerName: "Laura" },
    ]);
    expect(await alex.query(api.lists.forPerson, { personId: ficha })).toEqual([]);

    await alex.mutation(api.lists.associate, { shareId: share, personId: ficha });
    expect(await alex.query(api.lists.sharedWithMe, {})).toMatchObject([{ personId: ficha }]);
  });

  test("no se puede asociar a una ficha que no ves", async () => {
    const t = convexTest(schema, modules);
    const { alex, shareAlex } = await escenario(t);
    const fichaAjena = await t
      .withIdentity(OTRO)
      .mutation(api.people.create, { name: "Nadie", relationship: "friend", interests: [] });

    await expect(
      alex.mutation(api.lists.associate, { shareId: shareAlex, personId: fichaAjena }),
    ).rejects.toThrow(/Persona no encontrada/);
  });

  test("si pierde el acceso a la ficha, la lista vuelve a quedar pendiente", async () => {
    const t = convexTest(schema, modules);
    const laura = t.withIdentity(LAURA);
    const { shareId: share } = await laura.mutation(api.lists.invite, { readerClerkUserId: ALEX.subject });

    // La ficha de Laura es de Sara, que se la comparte a Alex.
    const sara = t.withIdentity(SARA);
    const fichaDeSara = await sara.mutation(api.people.create, { name: "Laura", relationship: "family", interests: [] });
    await sara.mutation(api.personShares.invite, { personId: fichaDeSara, clerkUserId: ALEX.subject });

    const alex = t.withIdentity(ALEX);
    await alex.mutation(api.lists.associate, { shareId: share, personId: fichaDeSara });
    expect(await alex.query(api.lists.sharedWithMe, {})).toMatchObject([{ personId: fichaDeSara }]);

    await alex.mutation(api.personShares.leave, { personId: fichaDeSara });
    expect(await alex.query(api.lists.sharedWithMe, {})).toMatchObject([{ personId: null }]);
  });

  test("el dueño no puede marcar su propia lista", async () => {
    const t = convexTest(schema, modules);
    const { laura, vela } = await escenario(t);
    await expect(laura.mutation(api.lists.claim, { itemId: vela })).rejects.toThrow(
      /Elemento no encontrado/,
    );
  });
});

describe("perder el acceso", () => {
  test("quitar el acceso borra el permiso y sus marcas, y el elemento queda libre", async () => {
    const t = convexTest(schema, modules);
    const { laura, alex, vela, shareAlex } = await escenario(t);
    const { mama, fichaDeMama } = await sumarMama(t);
    await alex.mutation(api.lists.claim, { itemId: vela });

    await laura.mutation(api.lists.revoke, { shareId: shareAlex });

    expect(await alex.query(api.lists.sharedWithMe, {})).toEqual([]);
    await expect(alex.mutation(api.lists.claim, { itemId: vela })).rejects.toThrow(
      /Elemento no encontrado/,
    );
    const [lista] = await mama.query(api.lists.forPerson, { personId: fichaDeMama });
    expect(lista.items.find((i) => i._id === vela)!.state).toBe("free");
  });

  test("dejar la lista hace lo mismo", async () => {
    const t = convexTest(schema, modules);
    const { laura, alex, vela, shareAlex } = await escenario(t);
    const { mama, fichaDeMama } = await sumarMama(t);
    await alex.mutation(api.lists.claim, { itemId: vela });

    await alex.mutation(api.lists.leave, { shareId: shareAlex });

    expect((await laura.query(api.lists.myReaders, {})).map((r) => r.readerClerkUserId)).toEqual([
      MAMA.subject,
    ]);
    const [lista] = await mama.query(api.lists.forPerson, { personId: fichaDeMama });
    expect(lista.items.find((i) => i._id === vela)!.state).toBe("free");
  });

  test("solo el dueño quita accesos", async () => {
    const t = convexTest(schema, modules);
    const { alex, shareAlex } = await escenario(t);
    await expect(alex.mutation(api.lists.revoke, { shareId: shareAlex })).rejects.toThrow(
      /ya no tiene acceso/,
    );
  });
});

describe("marcas en elementos que cambian", () => {
  test("un elemento borrado después de marcarlo solo lo sigue viendo quien lo marcó", async () => {
    const t = convexTest(schema, modules);
    const { laura, alex, vela, fichaDeAlex } = await escenario(t);
    const { mama, fichaDeMama } = await sumarMama(t);
    await alex.mutation(api.lists.claim, { itemId: vela });

    await laura.mutation(api.lists.removeItem, { id: vela });

    const [deAlex] = await alex.query(api.lists.forPerson, { personId: fichaDeAlex });
    expect(deAlex.items.map((i) => i._id)).not.toContain(vela);
    expect(deAlex.removed).toMatchObject([
      { title: "Vela de cera", url: "https://www.amazon.es/dp/B0VELA", note: "La de higo" },
    ]);

    const [deMama] = await mama.query(api.lists.forPerson, { personId: fichaDeMama });
    expect(deMama.items.map((i) => i._id)).not.toContain(vela);
    expect(deMama.removed).toEqual([]);

    // Quitar la marca lo quita del todo.
    await alex.mutation(api.lists.unclaim, { claimId: deAlex.removed[0].claimId });
    const [despues] = await alex.query(api.lists.forPerson, { personId: fichaDeAlex });
    expect(despues.removed).toEqual([]);
  });

  test("el aviso de edición sale al editar y se va con «Entendido»", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-10T10:00:00Z"));
    const t = convexTest(schema, modules);
    const { laura, alex, vela, fichaDeAlex } = await escenario(t);
    await alex.mutation(api.lists.claim, { itemId: vela });

    const vista = async () =>
      (await alex.query(api.lists.forPerson, { personId: fichaDeAlex }))[0].items.find(
        (i) => i._id === vela,
      )!;

    // Guardar sin cambiar nada no es una edición.
    vi.setSystemTime(new Date("2026-10-10T10:05:00Z"));
    await laura.mutation(api.lists.updateItem, {
      id: vela,
      title: "Vela de cera",
      url: "https://www.amazon.es/dp/B0VELA",
      note: "La de higo",
    });
    expect((await vista()).editedSinceMark).toBe(false);

    vi.setSystemTime(new Date("2026-10-10T10:10:00Z"));
    await laura.mutation(api.lists.updateItem, {
      id: vela,
      title: "Vela de cera",
      url: "https://www.amazon.es/dp/B0VELA",
      note: "Mejor la de vainilla",
    });
    const editada = await vista();
    expect(editada.editedSinceMark).toBe(true);
    expect(editada.note).toBe("Mejor la de vainilla");

    vi.setSystemTime(new Date("2026-10-10T10:15:00Z"));
    await alex.mutation(api.lists.acknowledgeEdit, { claimId: editada.claimId! });
    expect((await vista()).editedSinceMark).toBe(false);
  });

  test("una marca de regalado sigue bloqueando el elemento para los demás", async () => {
    const t = convexTest(schema, modules);
    const { laura, alex, vela, fichaDeAlex } = await escenario(t);
    const { mama, fichaDeMama } = await sumarMama(t);
    const claimId = await alex.mutation(api.lists.claim, { itemId: vela });

    await alex.mutation(api.lists.markGiven, { claimId });

    const [deAlex] = await alex.query(api.lists.forPerson, { personId: fichaDeAlex });
    expect(deAlex.items.find((i) => i._id === vela)!.state).toBe("given");
    const [deMama] = await mama.query(api.lists.forPerson, { personId: fichaDeMama });
    expect(deMama.items.find((i) => i._id === vela)!.state).toBe("taken");
    await expect(mama.mutation(api.lists.claim, { itemId: vela })).rejects.toThrow(
      /Ya lo regala otra persona/,
    );

    // Cuando la dueña lo borra, la marca de regalado se va sin aviso.
    await laura.mutation(api.lists.removeItem, { id: vela });
    const [despues] = await alex.query(api.lists.forPerson, { personId: fichaDeAlex });
    expect(despues.removed).toEqual([]);
  });
});

describe("validación y topes", () => {
  test("solo enlaces http y https", async () => {
    const t = convexTest(schema, modules);
    const laura = t.withIdentity(LAURA);
    for (const url of ["javascript:alert(1)", "ftp://ejemplo.com/x", "data:text/html,hola", "amazon.es"]) {
      await expect(laura.mutation(api.lists.addItem, { title: "X", url })).rejects.toThrow(
        /http/,
      );
    }
    await laura.mutation(api.lists.addItem, { title: "Bien", url: "https://www.ikea.com/es/es/p/x" });
    expect(await laura.query(api.lists.myItems, {})).toHaveLength(1);
  });

  test(`hasta ${MAX_ITEMS_PER_LIST} elementos por lista`, async () => {
    const t = convexTest(schema, modules);
    const laura = t.withIdentity(LAURA);
    for (let i = 0; i < MAX_ITEMS_PER_LIST; i++) {
      await laura.mutation(api.lists.addItem, { title: `Cosa ${i}` });
    }
    await expect(laura.mutation(api.lists.addItem, { title: "Una más" })).rejects.toThrow(
      /máximo/,
    );
  });

  test(`hasta ${MAX_READERS_PER_LIST} lectores por lista`, async () => {
    const t = convexTest(schema, modules);
    const laura = t.withIdentity(LAURA);
    for (let i = 0; i < MAX_READERS_PER_LIST; i++) {
      await laura.mutation(api.lists.invite, { readerClerkUserId: `user_lector_${i}` });
    }
    await expect(
      laura.mutation(api.lists.invite, { readerClerkUserId: "user_uno_mas" }),
    ).rejects.toThrow(/máximo/);
  });

  test("invitar dos veces a la misma persona no crea dos accesos", async () => {
    const t = convexTest(schema, modules);
    const laura = t.withIdentity(LAURA);
    const a = await laura.mutation(api.lists.invite, { readerClerkUserId: ALEX.subject });
    const b = await laura.mutation(api.lists.invite, { readerClerkUserId: ALEX.subject });
    expect(b.shareId).toBe(a.shareId);
    expect(b.emailed).toBe(false);
    expect(await laura.query(api.lists.myReaders, {})).toHaveLength(1);
  });
});

describe("compartir de vuelta", () => {
  test("Alex comparte su lista con Laura sin escribir su email", async () => {
    const t = convexTest(schema, modules);
    const { laura, alex, shareAlex } = await escenario(t);
    expect((await alex.query(api.lists.sharedWithMe, {}))[0].sharedBack).toBe(false);

    await alex.mutation(api.lists.shareBack, { shareId: shareAlex });

    expect((await alex.query(api.lists.sharedWithMe, {}))[0].sharedBack).toBe(true);
    expect(await laura.query(api.lists.sharedWithMe, {})).toMatchObject([
      { ownerName: "Alex", ownerEmail: ALEX.email, personId: null },
    ]);
  });

  test("sin nombre en la cuenta, la tarjeta se queda con el email", async () => {
    const t = convexTest(schema, modules);
    await t.withIdentity(MAMA).mutation(api.lists.invite, { readerClerkUserId: LAURA.subject });
    expect(await t.withIdentity(LAURA).query(api.lists.sharedWithMe, {})).toMatchObject([
      { ownerName: null, ownerEmail: MAMA.email },
    ]);
  });
});

describe("borrar la cuenta", () => {
  test("la del dueño se lleva todo lo de su lista, pero no el historial de quien regaló", async () => {
    const t = convexTest(schema, modules);
    const { laura, alex, vela, fichaDeAlex } = await escenario(t);
    const claimId = await alex.mutation(api.lists.claim, { itemId: vela });
    await alex.mutation(api.giftHistory.create, {
      personId: fichaDeAlex,
      giftName: "Vela de cera",
      occasionLabel: "Cumpleaños",
      reaction: "loved",
    });
    await alex.mutation(api.lists.markGiven, { claimId });

    await laura.mutation(api.account.deleteMyAccount, {});

    expect(await alex.query(api.lists.sharedWithMe, {})).toEqual([]);
    expect(await alex.query(api.lists.forPerson, { personId: fichaDeAlex })).toEqual([]);
    const quedan = await t.run(async (ctx) => ({
      items: await ctx.db.query("listItems").collect(),
      shares: await ctx.db.query("listShares").collect(),
      claims: await ctx.db.query("listClaims").collect(),
    }));
    expect(quedan).toEqual({ items: [], shares: [], claims: [] });
    expect(await alex.query(api.giftHistory.getByPerson, { personId: fichaDeAlex })).toHaveLength(1);
  });

  test("la de un lector se lleva sus permisos y sus marcas", async () => {
    const t = convexTest(schema, modules);
    const { laura, alex, vela } = await escenario(t);
    const { mama, fichaDeMama } = await sumarMama(t);
    await alex.mutation(api.lists.claim, { itemId: vela });

    await alex.mutation(api.account.deleteMyAccount, {});

    expect((await laura.query(api.lists.myReaders, {})).map((r) => r.readerClerkUserId)).toEqual([
      MAMA.subject,
    ]);
    const [lista] = await mama.query(api.lists.forPerson, { personId: fichaDeMama });
    expect(lista.items.find((i) => i._id === vela)!.state).toBe("free");
    expect(await laura.query(api.lists.myItems, {})).toHaveLength(2);
  });
});

describe("exportación del lector", () => {
  test("lleva sus marcas y las listas que le comparten", async () => {
    const t = convexTest(schema, modules);
    const { alex, vela } = await escenario(t);
    await alex.mutation(api.lists.claim, { itemId: vela });

    const datos = await alex.query(api.exportData.mine, {});
    expect(datos.marcasEnListasDeOtros).toMatchObject([
      { elemento: "Vela de cera", estado: "lo regalo yo", sigueEnSuLista: true },
    ]);
    expect(datos.listasQueTeComparten).toMatchObject([
      { de: "Laura", email: LAURA.email, fichaAsociada: "Laura" },
    ]);
    expect(datos.miLista).toEqual({ elementos: [], compartidaCon: [] });
  });
});

describe("email de recordatorio", () => {
  test("cuenta lo que nadie ha marcado en la lista asociada a la persona", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-10T08:00:00Z"));
    const t = convexTest(schema, modules);
    const { alex, vela, fichaDeAlex } = await escenario(t);
    // Cumpleaños dentro de 7 días y avisos a 7 días.
    await alex.mutation(api.importantDates.create, {
      personId: fichaDeAlex,
      label: "Cumpleaños",
      month: 10,
      day: 17,
      recurring: true,
    });
    await alex.mutation(api.settings.setMine, {
      emailNotificationsEnabled: true,
      emailNotifyDaysBefore: [7],
    });

    const evento = async () =>
      (await t.query(internal.notifications.findEventsNeedingEmail, {}))[0].events[0];

    expect((await evento()).listUnclaimed).toBe(2);
    await alex.mutation(api.lists.claim, { itemId: vela });
    expect((await evento()).listUnclaimed).toBe(1);
  });
});

describe("aviso por correo al compartir", () => {
  // Las acciones programadas se quedan en `_scheduled_functions` sin ejecutarse
  // mientras los temporizadores estén falseados: así se cuenta qué se programó
  // sin llamar a Resend.
  const avisos = (t: T) =>
    t.run(async (ctx) =>
      (await ctx.db.system.query("_scheduled_functions").collect()).filter((f) =>
        f.name.includes("sendListInviteEmail"),
      ),
    );
  const conEmail = (t: T, quien: typeof ALEX | typeof MAMA) =>
    t.withIdentity(quien).mutation(api.settings.ensureDefaults, {});

  test("avisa una vez al lector, con el nombre y el email de quien comparte", async () => {
    vi.useFakeTimers();
    const t = convexTest(schema, modules);
    await conEmail(t, ALEX);

    const r = await t.withIdentity(LAURA).mutation(api.lists.invite, { readerClerkUserId: ALEX.subject });
    expect(r.emailed).toBe(true);

    const programados = await avisos(t);
    expect(programados).toHaveLength(1);
    expect(programados[0].args[0]).toEqual({
      to: ALEX.email,
      ownerName: "Laura",
      ownerEmail: LAURA.email,
    });
  });

  test("volver a invitar a quien ya tiene acceso no manda otro", async () => {
    vi.useFakeTimers();
    const t = convexTest(schema, modules);
    await conEmail(t, ALEX);
    const laura = t.withIdentity(LAURA);
    await laura.mutation(api.lists.invite, { readerClerkUserId: ALEX.subject });
    const otra = await laura.mutation(api.lists.invite, { readerClerkUserId: ALEX.subject });
    expect(otra.emailed).toBe(false);
    expect(await avisos(t)).toHaveLength(1);
  });

  test("tras «No me interesa», reinvitar no vuelve a escribir hasta pasados 30 días", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-10T10:00:00Z"));
    const t = convexTest(schema, modules);
    await conEmail(t, ALEX);
    const laura = t.withIdentity(LAURA);
    const alex = t.withIdentity(ALEX);

    const primera = await laura.mutation(api.lists.invite, { readerClerkUserId: ALEX.subject });
    await alex.mutation(api.lists.leave, { shareId: primera.shareId });
    const segunda = await laura.mutation(api.lists.invite, { readerClerkUserId: ALEX.subject });
    expect(segunda.emailed).toBe(false);
    expect(await avisos(t)).toHaveLength(1);

    vi.setSystemTime(new Date(Date.now() + INVITE_EMAIL_COOLDOWN_MS + 60_000));
    await alex.mutation(api.lists.leave, { shareId: segunda.shareId });
    const tercera = await laura.mutation(api.lists.invite, { readerClerkUserId: ALEX.subject });
    expect(tercera.emailed).toBe(true);
    expect(await avisos(t)).toHaveLength(2);
  });

  test("compartir de vuelta también avisa", async () => {
    vi.useFakeTimers();
    const t = convexTest(schema, modules);
    await conEmail(t, LAURA);
    const { shareId } = await t.withIdentity(LAURA).mutation(api.lists.invite, { readerClerkUserId: ALEX.subject });

    const r = await t.withIdentity(ALEX).mutation(api.lists.shareBack, { shareId });
    expect(r.emailed).toBe(true);
    const programados = await avisos(t);
    expect(programados.map((p) => p.args[0].to)).toEqual([LAURA.email]);
  });

  test("sin email guardado del lector no se intenta", async () => {
    vi.useFakeTimers();
    const t = convexTest(schema, modules);
    const r = await t.withIdentity(LAURA).mutation(api.lists.invite, { readerClerkUserId: ALEX.subject });
    expect(r.emailed).toBe(false);
    expect(await avisos(t)).toHaveLength(0);
  });

  test("borrar la cuenta se lleva los registros de avisos", async () => {
    vi.useFakeTimers();
    const t = convexTest(schema, modules);
    await conEmail(t, ALEX);
    await t.withIdentity(LAURA).mutation(api.lists.invite, { readerClerkUserId: ALEX.subject });
    expect((await t.withIdentity(LAURA).query(api.exportData.mine, {})).avisosDeListaPorCorreo.enviados).toHaveLength(1);
    expect((await t.withIdentity(ALEX).query(api.exportData.mine, {})).avisosDeListaPorCorreo.recibidos).toHaveLength(1);

    await t.withIdentity(LAURA).mutation(api.account.deleteMyAccount, {});
    const quedan = await t.run((ctx) => ctx.db.query("listInviteEmails").collect());
    expect(quedan).toEqual([]);
  });
});

describe("plantilla del aviso", () => {
  test("lleva el nombre escapado y el email verificado, y nada de la lista", () => {
    const { subject, html } = buildListInviteEmail({
      ownerName: "<b>Laura</b>",
      ownerEmail: "laura@example.com",
    });
    expect(subject).toBe("PickPal · <b>Laura</b> te ha compartido su lista");
    expect(html).toContain("&lt;b&gt;Laura&lt;/b&gt; te ha compartido su lista");
    expect(html).not.toContain("<b>Laura</b>");
    expect(html).toContain("laura@example.com");
    expect(html).toContain('href="https://pickpal.jorgemolinafuster.com/agenda"');
  });

  test("sin nombre usa el email y no lo repite", () => {
    const { subject, html } = buildListInviteEmail({ ownerEmail: "mama@example.com" });
    expect(subject).toBe("PickPal · mama@example.com te ha compartido su lista");
    expect(html.split("mama@example.com")).toHaveLength(3); // título y pie, no una línea aparte
  });

  test("un salto de línea en el nombre no llega al asunto", () => {
    const { subject } = buildListInviteEmail({ ownerName: "Laura\r\nBcc: x@y.z", ownerEmail: "l@x.es" });
    expect(subject).not.toMatch(/[\r\n]/);
  });
});
