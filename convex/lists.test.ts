/// <reference types="vite/client" />
// @vitest-environment edge-runtime

// «Mi lista» (docs/encargo-lista.md). La función se sostiene sobre una sola
// propiedad: el dueño nunca ve las marcas. Si eso falla, falla sin que nadie
// lo note hasta que alguien descubre su regalo, así que es lo primero que se
// prueba aquí. Después, quién ve la lista y quién no, qué pasa al perder el
// acceso, las marcas sobre elementos que cambian, los topes, pegar una lista,
// «Lo que más ilusión te haría», «Ya lo tengo», compartir de vuelta, el
// borrado de cuenta, la exportación y las líneas del email. Al final, la fase
// 2: el precio, la nota para quien te regala, «Nuevo» y «Lo que vas a regalar».
// Y la fase 3: la foto de cada cosa, el orden a mano, el cumpleaños de quien
// comparte, bloquear a quien te comparte su lista sin que lo sepa y «Lo regalo
// yo · para…».

import { convexTest } from "convex-test";
import { afterEach, describe, expect, test, vi } from "vitest";
import fs from "node:fs";
import { api, internal } from "./_generated/api";
import {
  CREATE_MANAGED_LIST_DAILY_LIMIT,
  IMPORT_DAILY_LIMIT,
  INVITE_EMAIL_COOLDOWN_MS,
  MAX_ABOUT_LENGTH,
  MAX_FAVORITES,
  MAX_ITEMS_PER_LIST,
  MAX_MANAGED_LISTS,
  MAX_READERS_PER_LIST,
  PHOTO_UPLOAD_DAILY_LIMIT,
} from "./lists";
import { buildListInviteEmail } from "./emails";
import type { Id } from "./_generated/dataModel";
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
    const permitidos = new Set(["_id", "_creationTime", "title", "url", "note", "favorite", "priceCents", "photoUrl"]);
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

  // Los tests de arriba miran lo que sale; este mira lo que se lee, que es lo
  // que se rompe sin que cambie ninguna salida hasta que alguien añade una
  // rama nueva. Tosco, como el de la exportación, pero salta en cuanto una
  // función del dueño nombra las marcas. `removeItem` no está: tiene que
  // tocarlas para dejar la copia, y su test compara lo que recibe la dueña.
  test("ninguna función del dueño lee las marcas, y lists.ts no sale a la red", () => {
    const fuente = fs.readFileSync("convex/lists.ts", "utf8");
    const sinComentarios = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    for (const nombre of [
      "myItems", "myAbout", "setAbout", "myBirthday", "setBirthday", "myReaders", "addItem",
      "importItems", "updateItem", "setFavorite", "moveItem", "generatePhotoUploadUrl",
      "setItemPhoto", "removeItemPhoto",
    ]) {
      const inicio = fuente.indexOf(`export const ${nombre} = `);
      expect(inicio, `${nombre} no está en convex/lists.ts`).toBeGreaterThan(-1);
      const fin = fuente.indexOf("\nexport ", inicio + 1);
      const cuerpo = sinComentarios(fuente.slice(inicio, fin === -1 ? undefined : fin));
      expect(cuerpo, nombre).not.toMatch(/listClaims|claimOf|deleteClaimsBetween/);
    }
    expect(sinComentarios(fuente)).not.toMatch(/\bfetch\s*\(/);
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

describe("pegar una lista", () => {
  const filas = (...titulos: string[]) => titulos.map((title) => ({ title }));
  /** Unidades gastadas en un cubo, sumando todos los días. */
  const unidades = (t: T, bucket: string) =>
    t.run(async (ctx) =>
      (await ctx.db.query("rateLimitBuckets").collect())
        .filter((b) => b.bucket === bucket)
        .reduce((n, b) => n + b.count, 0),
    );
  /** Llena la lista de Laura sin pasar por `addItem`, que gastaría su cupo. */
  const llenar = (t: T, n: number) =>
    t.run(async (ctx) => {
      for (let i = 0; i < n; i++) {
        await ctx.db.insert("listItems", { ownerClerkUserId: LAURA.subject, title: `Ya estaba ${i}` });
      }
    });

  test("la primera línea pegada sale la primera, encima de lo que ya había", async () => {
    const t = convexTest(schema, modules);
    const laura = t.withIdentity(LAURA);
    await laura.mutation(api.lists.addItem, { title: "Vela de cera" });

    const r = await laura.mutation(api.lists.importItems, {
      items: [
        { title: "Libro de cerámica", url: "https://www.casadellibro.com/libro" },
        { title: "Taza", note: "La azul" },
        { title: "Bufanda" },
      ],
    });

    expect(r).toEqual({ inserted: 3 });
    expect((await laura.query(api.lists.myItems, {})).map((i) => i.title)).toEqual([
      "Libro de cerámica",
      "Taza",
      "Bufanda",
      "Vela de cera",
    ]);
  });

  test("normaliza como addItem y llega sin estado", async () => {
    const t = convexTest(schema, modules);
    const laura = t.withIdentity(LAURA);
    await laura.mutation(api.lists.importItems, {
      items: [{ title: "  Taza  ", url: "  https://www.ikea.com/es/es/p/taza  ", note: "   " }],
    });

    const [taza] = await laura.query(api.lists.myItems, {});
    expect(taza).toMatchObject({ title: "Taza", url: "https://www.ikea.com/es/es/p/taza", favorite: false });
    expect(taza.note).toBeUndefined();
    const [fila] = await t.run((ctx) => ctx.db.query("listItems").collect());
    expect(fila.editedAt).toBeUndefined();
    expect(fila.favorite).toBeUndefined();
  });

  test("una fila inválida no apunta nada ni gasta cupo, y el error dice cuál", async () => {
    const t = convexTest(schema, modules);
    const laura = t.withIdentity(LAURA);
    const casos: [Array<{ title: string; url?: string; note?: string }>, string][] = [
      [[{ title: "Taza" }, { title: "Truco", url: "javascript:alert(1)" }, { title: "Bufanda" }],
        "Fila 2: El enlace tiene que empezar por http:// o https://."],
      [[{ title: "   " }, { title: "Taza" }], "Fila 1: El título es obligatorio."],
      [[{ title: "Taza" }, { title: "Bufanda" }, { title: "x".repeat(121) }], "Fila 3: Título demasiado largo."],
      [[{ title: "Taza", note: "x".repeat(501) }], "Fila 1: Nota demasiado larga."],
    ];
    for (const [items, error] of casos) {
      // `data` es el texto tal cual: es lo que enseña `userErrorMessage`.
      await expect(laura.mutation(api.lists.importItems, { items })).rejects.toMatchObject({ data: error });
    }

    expect(await laura.query(api.lists.myItems, {})).toEqual([]);
    expect(await unidades(t, "import_list")).toBe(0);
  });

  test("ni vacía ni más de las que caben en una lista", async () => {
    const t = convexTest(schema, modules);
    const laura = t.withIdentity(LAURA);
    await expect(laura.mutation(api.lists.importItems, { items: [] })).rejects.toThrow(
      "No hay nada que apuntar.",
    );
    const demasiadas = Array.from({ length: MAX_ITEMS_PER_LIST + 1 }, (_, i) => ({ title: `Cosa ${i}` }));
    await expect(laura.mutation(api.lists.importItems, { items: demasiadas })).rejects.toThrow(
      "Son demasiadas cosas de una vez.",
    );
    expect(await unidades(t, "import_list")).toBe(0);
  });

  test(`el tope de ${MAX_ITEMS_PER_LIST} cuenta lo que ya había, y pasarse no gasta cupo`, async () => {
    const t = convexTest(schema, modules);
    const laura = t.withIdentity(LAURA);
    await llenar(t, MAX_ITEMS_PER_LIST - 3);

    await expect(
      laura.mutation(api.lists.importItems, { items: filas("A", "B", "C", "D") }),
    ).rejects.toThrow("Caben 3 más. Quítale la casilla a alguna o quita algo de tu lista.");
    expect(await laura.query(api.lists.myItems, {})).toHaveLength(MAX_ITEMS_PER_LIST - 3);
    expect(await unidades(t, "import_list")).toBe(0);

    await laura.mutation(api.lists.importItems, { items: filas("A", "B") });
    await expect(
      laura.mutation(api.lists.importItems, { items: filas("C", "D") }),
    ).rejects.toThrow("Cabe 1 más.");
    await laura.mutation(api.lists.importItems, { items: filas("C") });
    expect(await laura.query(api.lists.myItems, {})).toHaveLength(MAX_ITEMS_PER_LIST);

    await expect(laura.mutation(api.lists.importItems, { items: filas("D") })).rejects.toThrow(
      `Tu lista ya tiene ${MAX_ITEMS_PER_LIST} cosas, el máximo. Quita alguna para apuntar otra.`,
    );
    expect(await unidades(t, "import_list")).toBe(2);
  });

  test(`${IMPORT_DAILY_LIMIT} importaciones al día, una unidad cada una y no por fila`, async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-11T10:00:00Z"));
    const t = convexTest(schema, modules);
    const laura = t.withIdentity(LAURA);

    for (let i = 0; i < IMPORT_DAILY_LIMIT; i++) {
      await laura.mutation(api.lists.importItems, { items: filas(`${i}a`, `${i}b`, `${i}c`) });
    }
    await expect(laura.mutation(api.lists.importItems, { items: filas("Una más") })).rejects.toThrow(
      /Límite diario/,
    );

    expect(await laura.query(api.lists.myItems, {})).toHaveLength(IMPORT_DAILY_LIMIT * 3);
    expect(await unidades(t, "import_list")).toBe(IMPORT_DAILY_LIMIT);
    // Ni gasta el cupo de apuntar de una en una ni depende de él.
    expect(await unidades(t, "create_list_item")).toBe(0);
    await laura.mutation(api.lists.addItem, { title: "A mano" });

    // Al día siguiente vuelve a poder.
    vi.setSystemTime(new Date("2026-10-12T10:00:00Z"));
    await laura.mutation(api.lists.importItems, { items: filas("Mañana") });
  });

  test("comprueba en orden: primero las filas, después el tope y por último el cupo", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-11T10:00:00Z"));
    const t = convexTest(schema, modules);
    const laura = t.withIdentity(LAURA);
    // Cabe una sola cosa más y el cupo del día ya está gastado: fallan las tres.
    await llenar(t, MAX_ITEMS_PER_LIST - 1);
    await t.run((ctx) =>
      ctx.db.insert("rateLimitBuckets", {
        clerkUserId: LAURA.subject,
        day: "2026-10-11",
        bucket: "import_list",
        count: IMPORT_DAILY_LIMIT,
      }),
    );

    // Una fila mala manda sobre todo lo demás, para que la página la señale.
    await expect(
      laura.mutation(api.lists.importItems, { items: [{ title: "A" }, { title: "B", url: "ftp://b.es" }] }),
    ).rejects.toMatchObject({ data: "Fila 2: El enlace tiene que empezar por http:// o https://." });
    // Con todas bien, el tope va antes que el cupo: dice cuántas quitar.
    await expect(laura.mutation(api.lists.importItems, { items: filas("A", "B") })).rejects.toMatchObject({
      data: "Cabe 1 más. Quítale la casilla a alguna o quita algo de tu lista.",
    });
    // Solo si todo cabe se mira el cupo.
    await expect(laura.mutation(api.lists.importItems, { items: filas("A") })).rejects.toThrow(/Límite diario/);

    expect(await laura.query(api.lists.myItems, {})).toHaveLength(MAX_ITEMS_PER_LIST - 1);
    expect(await unidades(t, "import_list")).toBe(IMPORT_DAILY_LIMIT);
  });

  test("sin sesión no se apunta nada", async () => {
    const t = convexTest(schema, modules);
    await expect(t.mutation(api.lists.importItems, { items: filas("Taza") })).rejects.toThrow(
      /Sesión no encontrada/,
    );
    expect(await t.run((ctx) => ctx.db.query("listItems").collect())).toEqual([]);
  });

  test("quien lee ve lo importado libre y sin aviso de cambio", async () => {
    const t = convexTest(schema, modules);
    const { laura, alex, vela, fichaDeAlex } = await escenario(t);
    await alex.mutation(api.lists.claim, { itemId: vela });

    await laura.mutation(api.lists.importItems, { items: filas("Taza", "Bufanda") });

    const [lista] = await alex.query(api.lists.forPerson, { personId: fichaDeAlex });
    expect(lista.items.slice(0, 2)).toMatchObject([
      { title: "Taza", state: "free", claimId: null, editedSinceMark: false, favorite: false },
      { title: "Bufanda", state: "free", claimId: null, editedSinceMark: false, favorite: false },
    ]);
    // Y lo que Alex ya había marcado sigue igual.
    expect(lista.items.find((i) => i._id === vela)).toMatchObject({ state: "mine", editedSinceMark: false });
  });
});

describe("lo que más ilusión te haría", () => {
  test(`como mucho ${MAX_FAVORITES}`, async () => {
    const t = convexTest(schema, modules);
    const laura = t.withIdentity(LAURA);
    const ids = [];
    for (let i = 0; i <= MAX_FAVORITES; i++) {
      ids.push(await laura.mutation(api.lists.addItem, { title: `Cosa ${i}` }));
    }
    for (const id of ids.slice(0, MAX_FAVORITES)) {
      await laura.mutation(api.lists.setFavorite, { id, favorite: true });
    }

    await expect(
      laura.mutation(api.lists.setFavorite, { id: ids[MAX_FAVORITES], favorite: true }),
    ).rejects.toThrow(`Ya tienes ${MAX_FAVORITES}. Saca una para pasar esta.`);
    // Volver a pasar una que ya lo es no cuenta como otra.
    await laura.mutation(api.lists.setFavorite, { id: ids[0], favorite: true });

    // Sacando una, cabe la que faltaba.
    await laura.mutation(api.lists.setFavorite, { id: ids[0], favorite: false });
    await laura.mutation(api.lists.setFavorite, { id: ids[MAX_FAVORITES], favorite: true });
    const favoritas = (await laura.query(api.lists.myItems, {})).filter((i) => i.favorite);
    expect(favoritas.map((i) => i._id).sort()).toEqual(ids.slice(1).sort());
  });

  test("pasarla dos veces o sacar una que no lo es no cambia nada", async () => {
    const t = convexTest(schema, modules);
    const laura = t.withIdentity(LAURA);
    const id = await laura.mutation(api.lists.addItem, { title: "Vela de cera" });

    await laura.mutation(api.lists.setFavorite, { id, favorite: false });
    expect((await laura.query(api.lists.myItems, {}))[0].favorite).toBe(false);
    await laura.mutation(api.lists.setFavorite, { id, favorite: true });
    await laura.mutation(api.lists.setFavorite, { id, favorite: true });
    expect((await laura.query(api.lists.myItems, {}))[0].favorite).toBe(true);
    await laura.mutation(api.lists.setFavorite, { id, favorite: false });
    await laura.mutation(api.lists.setFavorite, { id, favorite: false });
    expect((await laura.query(api.lists.myItems, {}))[0].favorite).toBe(false);
    // Sacarla borra el campo, no guarda `false`.
    expect(await t.run(async (ctx) => "favorite" in (await ctx.db.get(id))!)).toBe(false);
  });

  test("solo la dueña la cambia", async () => {
    const t = convexTest(schema, modules);
    const { alex, vela } = await escenario(t);
    await expect(alex.mutation(api.lists.setFavorite, { id: vela, favorite: true })).rejects.toThrow(
      /Elemento no encontrado/,
    );
    await expect(
      t.withIdentity(OTRO).mutation(api.lists.setFavorite, { id: vela, favorite: true }),
    ).rejects.toThrow(/Elemento no encontrado/);
    await expect(t.mutation(api.lists.setFavorite, { id: vela, favorite: true })).rejects.toThrow(
      /Sesión no encontrada/,
    );
  });

  test("quien lee la ve, y no le salta «lo ha cambiado»", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-10T10:00:00Z"));
    const t = convexTest(schema, modules);
    const { laura, alex, vela, libro, fichaDeAlex } = await escenario(t);
    await alex.mutation(api.lists.claim, { itemId: vela });
    const vista = async () =>
      (await alex.query(api.lists.forPerson, { personId: fichaDeAlex }))[0].items;

    vi.setSystemTime(new Date("2026-10-10T10:05:00Z"));
    await laura.mutation(api.lists.setFavorite, { id: vela, favorite: true });

    const items = await vista();
    expect(items.find((i) => i._id === vela)).toMatchObject({
      favorite: true,
      state: "mine",
      editedSinceMark: false,
    });
    expect(items.find((i) => i._id === libro)!.favorite).toBe(false);
    expect((await laura.query(api.lists.myItems, {})).find((i) => i._id === vela)!.favorite).toBe(true);
    expect(await t.run(async (ctx) => "editedAt" in (await ctx.db.get(vela))!)).toBe(false);

    vi.setSystemTime(new Date("2026-10-10T10:10:00Z"));
    await laura.mutation(api.lists.setFavorite, { id: vela, favorite: false });
    expect((await vista()).find((i) => i._id === vela)).toMatchObject({
      favorite: false,
      editedSinceMark: false,
    });
  });

  test("editar el elemento no lo saca del grupo", async () => {
    const t = convexTest(schema, modules);
    const laura = t.withIdentity(LAURA);
    const id = await laura.mutation(api.lists.addItem, { title: "Vela de cera", note: "La de higo" });
    await laura.mutation(api.lists.setFavorite, { id, favorite: true });

    await laura.mutation(api.lists.updateItem, { id, title: "Vela de cera", note: "Mejor la de vainilla" });

    expect(await laura.query(api.lists.myItems, {})).toMatchObject([
      { title: "Vela de cera", note: "Mejor la de vainilla", favorite: true },
    ]);
  });
});

describe("ya lo tengo", () => {
  test("quien lo había marcado ve «Ya lo tiene»; sin motivo, como antes", async () => {
    const t = convexTest(schema, modules);
    const { laura, alex, vela, libro, fichaDeAlex } = await escenario(t);
    const { mama, fichaDeMama } = await sumarMama(t);
    await alex.mutation(api.lists.claim, { itemId: vela });
    await mama.mutation(api.lists.claim, { itemId: libro });

    await laura.mutation(api.lists.removeItem, { id: vela, reason: "got" });
    await laura.mutation(api.lists.removeItem, { id: libro });

    const [deAlex] = await alex.query(api.lists.forPerson, { personId: fichaDeAlex });
    expect(deAlex.items).toEqual([]);
    expect(deAlex.removed).toMatchObject([{ title: "Vela de cera", reason: "got" }]);
    const [deMama] = await mama.query(api.lists.forPerson, { personId: fichaDeMama });
    expect(deMama.removed).toMatchObject([{ title: "Libro de cerámica", reason: null }]);

    // Sin motivo, la copia no lleva el campo.
    const copias = await t.run(async (ctx) =>
      (await ctx.db.query("listClaims").collect()).map((c) => c.snapshot!),
    );
    expect(copias.find((s) => s.title === "Libro de cerámica")).not.toHaveProperty("reason");
  });

  test("una marca de regalado se va igual, con motivo o sin él", async () => {
    const t = convexTest(schema, modules);
    const { laura, alex, vela, fichaDeAlex } = await escenario(t);
    const claimId = await alex.mutation(api.lists.claim, { itemId: vela });
    await alex.mutation(api.lists.markGiven, { claimId });

    await laura.mutation(api.lists.removeItem, { id: vela, reason: "got" });

    const [deAlex] = await alex.query(api.lists.forPerson, { personId: fichaDeAlex });
    expect(deAlex.removed).toEqual([]);
    expect(await t.run((ctx) => ctx.db.query("listClaims").collect())).toEqual([]);
  });

  test("la dueña recibe lo mismo haya marcas o no, con motivo o sin él", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-11T10:00:00Z"));
    // Fuera los ids y las horas, que cambian de una base de datos a otra
    // aunque nadie haga nada distinto. Lo demás tiene que coincidir entero:
    // lo que devuelve, su lista, quién la ve y su exportación completa.
    const IDS_Y_HORAS = new Set(["_id", "shareId", "_creationTime", "since", "desde", "enviado"]);
    const sinIdsNiHoras = (v: unknown): unknown =>
      Array.isArray(v)
        ? v.map(sinIdsNiHoras)
        : v !== null && typeof v === "object"
          ? Object.fromEntries(
              Object.entries(v)
                .filter(([k]) => !IDS_Y_HORAS.has(k))
                .map(([k, x]) => [k, sinIdsNiHoras(x)]),
            )
          : v;
    const quitar = async (marca: "ninguna" | "marcada" | "regalada", reason?: "got") => {
      const t = convexTest(schema, modules);
      const { laura, alex, vela } = await escenario(t);
      if (marca !== "ninguna") {
        const claimId = await alex.mutation(api.lists.claim, { itemId: vela });
        if (marca === "regalada") await alex.mutation(api.lists.markGiven, { claimId });
      }
      const devuelve = await laura.mutation(
        api.lists.removeItem,
        reason ? { id: vela, reason } : { id: vela },
      );
      return sinIdsNiHoras({
        devuelve: devuelve ?? null,
        items: await laura.query(api.lists.myItems, {}),
        lectores: await laura.query(api.lists.myReaders, {}),
        exportacion: await laura.query(api.exportData.mine, {}),
      });
    };

    const base = (await quitar("ninguna")) as {
      devuelve: unknown;
      items: unknown;
      exportacion: { marcasEnListasDeOtros: unknown };
    };
    expect(base.devuelve).toBeNull();
    expect(base.items).toEqual([{ title: "Libro de cerámica", favorite: false, priceCents: null, photoUrl: null }]);
    expect(base.exportacion.marcasEnListasDeOtros).toEqual([]);
    for (const marca of ["ninguna", "marcada", "regalada"] as const) {
      for (const reason of [undefined, "got"] as const) {
        expect(await quitar(marca, reason), `${marca}, ${reason ?? "sin motivo"}`).toEqual(base);
      }
    }
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
    expect(datos.miLista).toEqual({
      elementos: [],
      compartidaCon: [],
      notaParaQuienTeRegala: null,
      miCumpleanos: null,
    });
  });

  test("lleva si la dueña quitó lo que había marcado porque ya lo tenía", async () => {
    const t = convexTest(schema, modules);
    const { laura, alex, vela, libro } = await escenario(t);
    await alex.mutation(api.lists.claim, { itemId: vela });
    await alex.mutation(api.lists.claim, { itemId: libro });
    await laura.mutation(api.lists.removeItem, { id: vela, reason: "got" });
    await laura.mutation(api.lists.removeItem, { id: libro });

    const { marcasEnListasDeOtros } = await alex.query(api.exportData.mine, {});
    const porTitulo = [...marcasEnListasDeOtros].sort((a, b) =>
      (a.elemento ?? "").localeCompare(b.elemento ?? ""),
    );
    expect(porTitulo).toMatchObject([
      { elemento: "Libro de cerámica", sigueEnSuLista: false, yaLoTiene: false },
      { elemento: "Vela de cera", sigueEnSuLista: false, yaLoTiene: true },
    ]);
  });
});

describe("exportación de la dueña", () => {
  test("lleva qué puso en «Lo que más ilusión te haría»", async () => {
    const t = convexTest(schema, modules);
    const { laura, alex, vela, libro } = await escenario(t);
    await laura.mutation(api.lists.setFavorite, { id: vela, favorite: true });
    await alex.mutation(api.lists.claim, { itemId: libro });

    const datos = await laura.query(api.exportData.mine, {});
    const porTitulo = [...datos.miLista.elementos].sort((a, b) => a.titulo.localeCompare(b.titulo));
    expect(porTitulo).toMatchObject([
      { titulo: "Libro de cerámica", loQueMasIlusionTeHaria: false },
      { titulo: "Vela de cera", loQueMasIlusionTeHaria: true },
    ]);
    expect(datos.marcasEnListasDeOtros).toEqual([]);
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

  test("la segunda cifra cuenta solo lo que tiene marcado quien lo recibe", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-10T08:00:00Z"));
    const t = convexTest(schema, modules);
    const { laura, alex, vela, libro, fichaDeAlex } = await escenario(t);
    const { mama } = await sumarMama(t);
    const taza = await laura.mutation(api.lists.addItem, { title: "Taza" });
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

    // Sin marcas, ni el campo.
    expect(await evento()).not.toHaveProperty("listMine");

    // Lo que marca otra lectora quita una cosa libre, pero no es de Alex.
    await mama.mutation(api.lists.claim, { itemId: libro });
    expect(await evento()).toMatchObject({ listUnclaimed: 2 });
    expect(await evento()).not.toHaveProperty("listMine");

    const deVela = await alex.mutation(api.lists.claim, { itemId: vela });
    await alex.mutation(api.lists.claim, { itemId: taza });
    expect(await evento()).toMatchObject({ listMine: 2 });
    expect(await evento()).not.toHaveProperty("listUnclaimed");

    // Lo ya regalado y lo que la dueña quitó no cuentan.
    await alex.mutation(api.lists.markGiven, { claimId: deVela });
    expect(await evento()).toMatchObject({ listMine: 1 });
    await laura.mutation(api.lists.removeItem, { id: taza });
    expect(await evento()).not.toHaveProperty("listMine");
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

describe("precio aproximado", () => {
  test("se apunta en céntimos, sale a la dueña y a quien lee, y se valida", async () => {
    const t = convexTest(schema, modules);
    const { laura, alex, vela, fichaDeAlex } = await escenario(t);
    const taza = await laura.mutation(api.lists.addItem, { title: "Taza", priceCents: 4000 });

    const mios = await laura.query(api.lists.myItems, {});
    expect(mios.find((i) => i._id === taza)!.priceCents).toBe(4000);
    expect(mios.find((i) => i._id === vela)!.priceCents).toBeNull();

    const [lista] = await alex.query(api.lists.forPerson, { personId: fichaDeAlex });
    expect(lista.items.find((i) => i._id === taza)!.priceCents).toBe(4000);
    expect(lista.items.find((i) => i._id === vela)!.priceCents).toBeNull();

    for (const priceCents of [0, -1, 39.5, 1_000_001]) {
      await expect(
        laura.mutation(api.lists.addItem, { title: "Mal", priceCents }),
      ).rejects.toMatchObject({ data: "Precio inválido." });
      await expect(
        laura.mutation(api.lists.updateItem, { id: taza, title: "Taza", priceCents }),
      ).rejects.toMatchObject({ data: "Precio inválido." });
    }
  });

  test("editar sin mandar el precio no lo borra ni cuenta como cambio", async () => {
    const t = convexTest(schema, modules);
    const laura = t.withIdentity(LAURA);
    const id = await laura.mutation(api.lists.addItem, {
      title: "Vela de cera",
      url: "https://www.amazon.es/dp/B0VELA",
      note: "La de higo",
      priceCents: 4000,
    });

    // Lo que manda una pestaña con el código de antes del precio.
    await laura.mutation(api.lists.updateItem, {
      id,
      title: "Vela de cera",
      url: "https://www.amazon.es/dp/B0VELA",
      note: "La de higo",
    });
    // Y el mismo precio otra vez.
    await laura.mutation(api.lists.updateItem, {
      id,
      title: "Vela de cera",
      url: "https://www.amazon.es/dp/B0VELA",
      note: "La de higo",
      priceCents: 4000,
    });

    const fila = await t.run(async (ctx) => (await ctx.db.get(id))!);
    expect(fila.priceCents).toBe(4000);
    expect(fila).not.toHaveProperty("editedAt");

    // Una edición del texto sin precio tampoco lo toca.
    await laura.mutation(api.lists.updateItem, { id, title: "Vela de cera", note: "Mejor la de vainilla" });
    expect((await laura.query(api.lists.myItems, {}))[0].priceCents).toBe(4000);
  });

  test("cambiarlo es una edición; null lo quita", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-12T10:00:00Z"));
    const t = convexTest(schema, modules);
    const { laura, alex, vela, fichaDeAlex } = await escenario(t);
    await alex.mutation(api.lists.claim, { itemId: vela });
    const deVela = async () =>
      (await alex.query(api.lists.forPerson, { personId: fichaDeAlex }))[0].items.find(
        (i) => i._id === vela,
      )!;
    const mismos = { id: vela, title: "Vela de cera", url: "https://www.amazon.es/dp/B0VELA", note: "La de higo" };

    // Quitar un precio que no había no cambia nada.
    vi.setSystemTime(new Date("2026-10-12T10:05:00Z"));
    await laura.mutation(api.lists.updateItem, { ...mismos, priceCents: null });
    expect((await deVela()).editedSinceMark).toBe(false);

    vi.setSystemTime(new Date("2026-10-12T10:10:00Z"));
    await laura.mutation(api.lists.updateItem, { ...mismos, priceCents: 2500 });
    expect(await deVela()).toMatchObject({ priceCents: 2500, editedSinceMark: true });

    await alex.mutation(api.lists.acknowledgeEdit, { claimId: (await deVela()).claimId! });
    vi.setSystemTime(new Date("2026-10-12T10:15:00Z"));
    await laura.mutation(api.lists.updateItem, { ...mismos, priceCents: null });
    expect(await deVela()).toMatchObject({ priceCents: null, editedSinceMark: true });
    // Quitado de verdad, no guardado como null.
    expect(await t.run(async (ctx) => "priceCents" in (await ctx.db.get(vela))!)).toBe(false);
  });

  test("la exportación de la dueña lo lleva en euros", async () => {
    const t = convexTest(schema, modules);
    const laura = t.withIdentity(LAURA);
    await laura.mutation(api.lists.addItem, { title: "Taza", priceCents: 1999 });
    await laura.mutation(api.lists.addItem, { title: "Bufanda" });

    const { miLista } = await laura.query(api.exportData.mine, {});
    const porTitulo = [...miLista.elementos].sort((a, b) => a.titulo.localeCompare(b.titulo));
    expect(porTitulo).toMatchObject([
      { titulo: "Bufanda", precioAproximadoEuros: null },
      { titulo: "Taza", precioAproximadoEuros: 19.99 },
    ]);
  });
});

describe("una nota para quien te regala", () => {
  test("la dueña la escribe y la leen sus lectores, nadie más", async () => {
    const t = convexTest(schema, modules);
    const { laura, alex, fichaDeAlex } = await escenario(t);
    const [antes] = await alex.query(api.lists.forPerson, { personId: fichaDeAlex });
    expect(antes.about).toBeNull();
    expect(await laura.query(api.lists.myAbout, {})).toBeNull();

    await laura.mutation(api.lists.setAbout, { note: "  Talla M. Nada de plástico, porfa.  " });

    expect(await laura.query(api.lists.myAbout, {})).toBe("Talla M. Nada de plástico, porfa.");
    const [lista] = await alex.query(api.lists.forPerson, { personId: fichaDeAlex });
    expect(lista.about).toBe("Talla M. Nada de plástico, porfa.");

    // Ni un tercero ni otro invitado de la ficha de Alex: van por el permiso de Laura.
    await alex.mutation(api.personShares.invite, { personId: fichaDeAlex, clerkUserId: SARA.subject });
    expect(await t.withIdentity(SARA).query(api.lists.forPerson, { personId: fichaDeAlex })).toEqual([]);
    expect(await t.withIdentity(OTRO).query(api.lists.myAbout, {})).toBeNull();
    // La nota de Alex es suya: escribirla no toca la de Laura.
    await alex.mutation(api.lists.setAbout, { note: "Libros, siempre" });
    expect(await laura.query(api.lists.myAbout, {})).toBe("Talla M. Nada de plástico, porfa.");
  });

  test("vacía se borra, y una sola fila por dueña", async () => {
    const t = convexTest(schema, modules);
    const laura = t.withIdentity(LAURA);
    await laura.mutation(api.lists.setAbout, { note: "Talla M" });
    await laura.mutation(api.lists.setAbout, { note: "Talla L" });
    expect(await t.run((ctx) => ctx.db.query("listAbout").collect())).toMatchObject([
      { ownerClerkUserId: LAURA.subject, note: "Talla L" },
    ]);

    await laura.mutation(api.lists.setAbout, { note: "   " });
    expect(await laura.query(api.lists.myAbout, {})).toBeNull();
    expect(await t.run((ctx) => ctx.db.query("listAbout").collect())).toEqual([]);
    // Borrar una que no existe tampoco falla.
    await laura.mutation(api.lists.setAbout, { note: "" });
  });

  test(`hasta ${MAX_ABOUT_LENGTH} caracteres, contados sin los espacios de los bordes`, async () => {
    const t = convexTest(schema, modules);
    const laura = t.withIdentity(LAURA);
    await laura.mutation(api.lists.setAbout, { note: `  ${"x".repeat(MAX_ABOUT_LENGTH)}  ` });
    await expect(
      laura.mutation(api.lists.setAbout, { note: "y".repeat(MAX_ABOUT_LENGTH + 1) }),
    ).rejects.toMatchObject({ data: "La nota es demasiado larga." });
    expect(await laura.query(api.lists.myAbout, {})).toBe("x".repeat(MAX_ABOUT_LENGTH));
  });

  test("sin sesión no se escribe ni se lee", async () => {
    const t = convexTest(schema, modules);
    await expect(t.mutation(api.lists.setAbout, { note: "Hola" })).rejects.toThrow(/Sesión no encontrada/);
    await expect(t.query(api.lists.myAbout, {})).rejects.toThrow(/Sesión no encontrada/);
  });

  test("cambiarla no le dice a nadie «lo ha cambiado»", async () => {
    const t = convexTest(schema, modules);
    const { laura, alex, vela, fichaDeAlex } = await escenario(t);
    await alex.mutation(api.lists.claim, { itemId: vela });

    await laura.mutation(api.lists.setAbout, { note: "Talla M" });

    const [lista] = await alex.query(api.lists.forPerson, { personId: fichaDeAlex });
    expect(lista.items.find((i) => i._id === vela)!.editedSinceMark).toBe(false);
    expect(await t.run(async (ctx) => "editedAt" in (await ctx.db.get(vela))!)).toBe(false);
  });

  test("sale en la exportación de la dueña y se va con su cuenta", async () => {
    const t = convexTest(schema, modules);
    const { laura, alex } = await escenario(t);
    await laura.mutation(api.lists.setAbout, { note: "Talla M" });

    expect((await laura.query(api.exportData.mine, {})).miLista.notaParaQuienTeRegala).toBe("Talla M");
    // La de otra persona no es un dato de quien la lee.
    expect((await alex.query(api.exportData.mine, {})).miLista.notaParaQuienTeRegala).toBeNull();

    await laura.mutation(api.account.deleteMyAccount, {});
    expect(await t.run((ctx) => ctx.db.query("listAbout").collect())).toEqual([]);
  });
});

describe("«Nuevo» para quien lee", () => {
  test("cada elemento lleva cuándo se apuntó", async () => {
    const t = convexTest(schema, modules);
    const { alex, vela, fichaDeAlex } = await escenario(t);
    const [lista] = await alex.query(api.lists.forPerson, { personId: fichaDeAlex });
    const creada = await t.run(async (ctx) => (await ctx.db.get(vela))!._creationTime);
    expect(lista.items.find((i) => i._id === vela)!.addedAt).toBe(creada);
  });
});

describe("lo que vas a regalar", () => {
  test("solo lo que tú has marcado y no has dado por regalado, con su ficha", async () => {
    const t = convexTest(schema, modules);
    const { laura, alex, vela, libro, fichaDeAlex } = await escenario(t);
    const taza = await laura.mutation(api.lists.addItem, { title: "Taza", url: "https://www.ikea.com/es/es/p/taza" });
    const deVela = await alex.mutation(api.lists.claim, { itemId: vela });
    await alex.mutation(api.lists.claim, { itemId: libro });
    await alex.mutation(api.lists.claim, { itemId: taza });

    await alex.mutation(api.lists.markGiven, { claimId: deVela });
    await laura.mutation(api.lists.removeItem, { id: libro, reason: "got" });

    // De la lista de Mamá, que Alex no ha asociado a ninguna ficha.
    const mama = t.withIdentity(MAMA);
    const bufanda = await mama.mutation(api.lists.addItem, { title: "Bufanda" });
    await mama.mutation(api.lists.invite, { readerClerkUserId: ALEX.subject });
    await alex.mutation(api.lists.claim, { itemId: bufanda });

    expect(await alex.query(api.lists.myGifts, {})).toMatchObject([
      {
        title: "Libro de cerámica",
        url: null,
        removed: true,
        reason: "got",
        ownerName: "Laura",
        ownerEmail: LAURA.email,
        personId: fichaDeAlex,
        personName: "Laura",
      },
      {
        title: "Taza",
        url: "https://www.ikea.com/es/es/p/taza",
        removed: false,
        reason: null,
        personId: fichaDeAlex,
        personName: "Laura",
      },
      // Sin ficha ni nombre, va por el email.
      { title: "Bufanda", ownerName: null, ownerEmail: MAMA.email, personId: null, personName: null },
    ]);
  });

  test("la dueña no ve las marcas de su lista, ni otro lector las tuyas", async () => {
    const t = convexTest(schema, modules);
    const { laura, alex, vela, libro } = await escenario(t);
    const { mama } = await sumarMama(t);
    await alex.mutation(api.lists.claim, { itemId: vela });
    await mama.mutation(api.lists.claim, { itemId: libro });

    expect(await laura.query(api.lists.myGifts, {})).toEqual([]);
    expect(await t.withIdentity(OTRO).query(api.lists.myGifts, {})).toEqual([]);

    const deAlex = await alex.query(api.lists.myGifts, {});
    expect(deAlex.map((g) => g.title)).toEqual(["Vela de cera"]);
    const json = JSON.stringify(deAlex);
    expect(json).not.toContain(MAMA.subject);
    expect(json).not.toContain(MAMA.email);
    expect((await mama.query(api.lists.myGifts, {})).map((g) => g.title)).toEqual(["Libro de cerámica"]);
  });

  test("sin el permiso de la dueña no sale, aunque quedara la marca", async () => {
    const t = convexTest(schema, modules);
    const { alex, vela, shareAlex } = await escenario(t);
    await alex.mutation(api.lists.claim, { itemId: vela });

    // `revoke` y `leave` borran las marcas; aquí solo desaparece el permiso.
    await t.run((ctx) => ctx.db.delete(shareAlex));

    expect(await alex.query(api.lists.myGifts, {})).toEqual([]);
  });

  test("sin sesión no hay nada", async () => {
    const t = convexTest(schema, modules);
    await expect(t.query(api.lists.myGifts, {})).rejects.toThrow(/Sesión no encontrada/);
  });
});

// ─── Fase 3 ──────────────────────────────────────────────────────────────────

/**
 * Sube un archivo como lo haría la página. convex-test no guarda el tipo de la
 * subida en `_storage`, así que se apunta a mano en sus metadatos (el `patch`
 * de dos argumentos va por el id, sin mirar la tabla). `relleno` cambia el
 * contenido para que cada archivo tenga su propia dirección.
 */
async function subir(t: T, contentType: string | undefined, size = 2000, relleno = 1) {
  return t.run(async (ctx) => {
    const id = await ctx.storage.store(new Blob([new Uint8Array(size).fill(relleno)]));
    if (contentType !== undefined) {
      await ctx.db.patch(id as unknown as Id<"listItems">, { contentType } as never);
    }
    return id;
  });
}
const existe = (t: T, id: Id<"_storage">) =>
  t.run(async (ctx) => (await ctx.db.system.get("_storage", id)) !== null);

describe("foto de cada cosa", () => {
  test("la dueña la sube, la ven ella y quien lee, y quitarla borra el archivo", async () => {
    const t = convexTest(schema, modules);
    const { laura, alex, vela, fichaDeAlex } = await escenario(t);

    expect(typeof (await laura.mutation(api.lists.generatePhotoUploadUrl, {}))).toBe("string");
    const foto = await subir(t, "image/jpeg");
    expect(await laura.mutation(api.lists.setItemPhoto, { id: vela, storageId: foto })).toBeNull();

    const url = (await laura.query(api.lists.myItems, {})).find((i) => i._id === vela)!.photoUrl;
    expect(url).toMatch(/^https:\/\//);
    const [lista] = await alex.query(api.lists.forPerson, { personId: fichaDeAlex });
    expect(lista.items.find((i) => i._id === vela)!.photoUrl).toBe(url);
    expect(lista.items.find((i) => i._id !== vela)!.photoUrl).toBeNull();

    await laura.mutation(api.lists.removeItemPhoto, { id: vela });
    expect((await laura.query(api.lists.myItems, {})).find((i) => i._id === vela)!.photoUrl).toBeNull();
    expect(await existe(t, foto)).toBe(false);
    expect(await t.run(async (ctx) => "photoStorageId" in (await ctx.db.get(vela))!)).toBe(false);
    // Quitar una que ya no está no falla.
    await laura.mutation(api.lists.removeItemPhoto, { id: vela });
  });

  test("cambiarla borra la anterior; poner la misma otra vez no hace nada", async () => {
    const t = convexTest(schema, modules);
    const laura = t.withIdentity(LAURA);
    const id = await laura.mutation(api.lists.addItem, { title: "Vela de cera" });
    const primera = await subir(t, "image/png", 2000, 1);
    const segunda = await subir(t, "image/webp", 2000, 2);

    await laura.mutation(api.lists.setItemPhoto, { id, storageId: primera });
    await laura.mutation(api.lists.setItemPhoto, { id, storageId: primera });
    expect(await existe(t, primera)).toBe(true);
    await laura.mutation(api.lists.setItemPhoto, { id, storageId: segunda });

    expect(await existe(t, primera)).toBe(false);
    expect(await existe(t, segunda)).toBe(true);
    expect(await t.run(async (ctx) => (await ctx.db.get(id))!.photoStorageId)).toBe(segunda);
  });

  test("rechaza otro tipo, sin tipo, más de 1,5 MB, un archivo que no existe y el de otra cosa", async () => {
    const t = convexTest(schema, modules);
    const laura = t.withIdentity(LAURA);
    const vela = await laura.mutation(api.lists.addItem, { title: "Vela de cera" });
    const libro = await laura.mutation(api.lists.addItem, { title: "Libro" });
    const deLibro = await subir(t, "image/jpeg", 2000, 9);
    await laura.mutation(api.lists.setItemPhoto, { id: libro, storageId: deLibro });
    const borrado = await subir(t, "image/jpeg", 2000, 8);
    await t.run((ctx) => ctx.storage.delete(borrado));

    const malas = [
      await subir(t, "image/gif"),
      await subir(t, "image/svg+xml"),
      await subir(t, "text/html"),
      await subir(t, undefined),
      await subir(t, "image/jpeg", 1_500_001),
      borrado,
      deLibro,
    ];
    for (const storageId of malas) {
      await expect(
        laura.mutation(api.lists.setItemPhoto, { id: vela, storageId }),
      ).rejects.toMatchObject({
        data: "Esa foto no vale: tiene que ser JPG, PNG o WebP de menos de 1,5 MB.",
      });
    }
    expect(await t.run(async (ctx) => "photoStorageId" in (await ctx.db.get(vela))!)).toBe(false);
    // La de la otra cosa sigue siendo suya.
    expect(await existe(t, deLibro)).toBe(true);
    // El límite exacto sí vale.
    await laura.mutation(api.lists.setItemPhoto, {
      id: vela,
      storageId: await subir(t, "image/jpeg", 1_500_000),
    });
  });

  test("solo la dueña pone o quita fotos", async () => {
    const t = convexTest(schema, modules);
    const { laura, alex, vela } = await escenario(t);
    const foto = await subir(t, "image/jpeg");
    for (const quien of [ALEX, OTRO]) {
      await expect(t.withIdentity(quien).mutation(api.lists.setItemPhoto, { id: vela, storageId: foto })).rejects.toThrow(
        /Elemento no encontrado/,
      );
    }
    await laura.mutation(api.lists.setItemPhoto, { id: vela, storageId: foto });
    await expect(alex.mutation(api.lists.removeItemPhoto, { id: vela })).rejects.toThrow(
      /Elemento no encontrado/,
    );
    await expect(t.mutation(api.lists.generatePhotoUploadUrl, {})).rejects.toThrow(/Sesión no encontrada/);
    await expect(t.mutation(api.lists.setItemPhoto, { id: vela, storageId: foto })).rejects.toThrow(
      /Sesión no encontrada/,
    );
    expect(await existe(t, foto)).toBe(true);
  });

  test("ponerla o quitarla no le dice a nadie «lo ha cambiado»", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-12T10:00:00Z"));
    const t = convexTest(schema, modules);
    const { laura, alex, vela, fichaDeAlex } = await escenario(t);
    await alex.mutation(api.lists.claim, { itemId: vela });
    const deVela = async () =>
      (await alex.query(api.lists.forPerson, { personId: fichaDeAlex }))[0].items.find((i) => i._id === vela)!;

    vi.setSystemTime(new Date("2026-10-12T10:05:00Z"));
    await laura.mutation(api.lists.setItemPhoto, { id: vela, storageId: await subir(t, "image/jpeg") });
    expect(await deVela()).toMatchObject({ state: "mine", editedSinceMark: false });
    vi.setSystemTime(new Date("2026-10-12T10:10:00Z"));
    await laura.mutation(api.lists.removeItemPhoto, { id: vela });
    expect((await deVela()).editedSinceMark).toBe(false);
    expect(await t.run(async (ctx) => "editedAt" in (await ctx.db.get(vela))!)).toBe(false);
  });

  test("borrar la cosa borra la foto, y la copia de quien la marcó no la lleva", async () => {
    const t = convexTest(schema, modules);
    const { laura, alex, vela, fichaDeAlex } = await escenario(t);
    const foto = await subir(t, "image/jpeg");
    await laura.mutation(api.lists.setItemPhoto, { id: vela, storageId: foto });
    await alex.mutation(api.lists.claim, { itemId: vela });

    await laura.mutation(api.lists.removeItem, { id: vela });

    expect(await existe(t, foto)).toBe(false);
    const [lista] = await alex.query(api.lists.forPerson, { personId: fichaDeAlex });
    expect(lista.removed).toHaveLength(1);
    expect(Object.keys(lista.removed[0]).sort()).toEqual(["claimId", "note", "reason", "title", "url"]);
    const [claim] = await t.run((ctx) => ctx.db.query("listClaims").collect());
    expect(Object.keys(claim.snapshot!).sort()).toEqual(["note", "title", "url"]);
  });

  test("borrar la cuenta borra sus fotos", async () => {
    const t = convexTest(schema, modules);
    const { laura, vela, libro } = await escenario(t);
    const fotos = [await subir(t, "image/jpeg", 2000, 1), await subir(t, "image/png", 2000, 2)];
    await laura.mutation(api.lists.setItemPhoto, { id: vela, storageId: fotos[0] });
    await laura.mutation(api.lists.setItemPhoto, { id: libro, storageId: fotos[1] });

    await laura.mutation(api.account.deleteMyAccount, {});

    expect(await existe(t, fotos[0])).toBe(false);
    expect(await existe(t, fotos[1])).toBe(false);
  });

  test(`${PHOTO_UPLOAD_DAILY_LIMIT} direcciones de subida al día`, async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-12T10:00:00Z"));
    const t = convexTest(schema, modules);
    const laura = t.withIdentity(LAURA);
    for (let i = 0; i < PHOTO_UPLOAD_DAILY_LIMIT; i++) {
      await laura.mutation(api.lists.generatePhotoUploadUrl, {});
    }
    await expect(laura.mutation(api.lists.generatePhotoUploadUrl, {})).rejects.toThrow(/Límite diario/);
  });

  test("la exportación de la dueña lleva la dirección de la foto", async () => {
    const t = convexTest(schema, modules);
    const { laura, alex, vela } = await escenario(t);
    await laura.mutation(api.lists.setItemPhoto, { id: vela, storageId: await subir(t, "image/jpeg") });
    const url = (await laura.query(api.lists.myItems, {})).find((i) => i._id === vela)!.photoUrl;

    const { miLista, leeme } = await laura.query(api.exportData.mine, {});
    expect(miLista.elementos).toMatchObject([
      { titulo: "Libro de cerámica", fotoUrl: null },
      { titulo: "Vela de cera", fotoUrl: url },
    ]);
    expect(leeme).toContain("fotoUrl");
    expect((await alex.query(api.exportData.mine, {})).miLista.elementos).toEqual([]);
  });

  test("el barrido borra lo subido que no acabó en ninguna cosa, pasado un día", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-10T10:00:00Z"));
    const t = convexTest(schema, modules);
    const laura = t.withIdentity(LAURA);
    const vela = await laura.mutation(api.lists.addItem, { title: "Vela de cera" });
    const huerfana = await subir(t, "image/jpeg", 2000, 1);
    const rechazada = await subir(t, "image/gif", 2000, 2);
    await expect(laura.mutation(api.lists.setItemPhoto, { id: vela, storageId: rechazada })).rejects.toThrow(
      /Esa foto no vale/,
    );
    const enUso = await subir(t, "image/jpeg", 2000, 3);
    await laura.mutation(api.lists.setItemPhoto, { id: vela, storageId: enUso });

    // A las pocas horas no se toca nada: puede ser una subida a medias.
    vi.setSystemTime(new Date("2026-10-10T20:00:00Z"));
    const reciente = await subir(t, "image/jpeg", 2000, 4);
    expect(await t.mutation(internal.lists.sweepOrphanPhotos, {})).toEqual({ deleted: 0 });

    vi.setSystemTime(new Date("2026-10-11T12:00:00Z"));
    expect(await t.mutation(internal.lists.sweepOrphanPhotos, {})).toEqual({ deleted: 2 });
    expect(await existe(t, huerfana)).toBe(false);
    expect(await existe(t, rechazada)).toBe(false);
    expect(await existe(t, enUso)).toBe(true);
    expect(await existe(t, reciente)).toBe(true);

    vi.setSystemTime(new Date("2026-10-12T12:00:00Z"));
    expect(await t.mutation(internal.lists.sweepOrphanPhotos, {})).toEqual({ deleted: 1 });
    expect(await existe(t, enUso)).toBe(true);
  });
});

describe("orden a mano", () => {
  const titulos = async (quien: ReturnType<T["withIdentity"]>) =>
    (await quien.query(api.lists.myItems, {})).map((i) => i.title);

  test("lo nuevo sale arriba; subir y bajar cambian el sitio con el vecino", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-12T10:00:00Z"));
    const t = convexTest(schema, modules);
    const laura = t.withIdentity(LAURA);
    const a = await laura.mutation(api.lists.addItem, { title: "A" });
    const b = await laura.mutation(api.lists.addItem, { title: "B" });
    const c = await laura.mutation(api.lists.addItem, { title: "C" });
    expect(await titulos(laura)).toEqual(["C", "B", "A"]);

    expect(await laura.mutation(api.lists.moveItem, { id: a, direction: "up" })).toBeNull();
    expect(await titulos(laura)).toEqual(["C", "A", "B"]);
    await laura.mutation(api.lists.moveItem, { id: a, direction: "up" });
    expect(await titulos(laura)).toEqual(["A", "C", "B"]);

    // En los bordes no pasa nada.
    await laura.mutation(api.lists.moveItem, { id: a, direction: "up" });
    await laura.mutation(api.lists.moveItem, { id: b, direction: "down" });
    expect(await titulos(laura)).toEqual(["A", "C", "B"]);

    await laura.mutation(api.lists.moveItem, { id: c, direction: "down" });
    expect(await titulos(laura)).toEqual(["A", "B", "C"]);

    // Lo que se apunta después sigue saliendo arriba, y pegar respeta el orden.
    vi.setSystemTime(new Date("2026-10-12T10:05:00Z"));
    await laura.mutation(api.lists.addItem, { title: "D" });
    vi.setSystemTime(new Date("2026-10-12T10:10:00Z"));
    await laura.mutation(api.lists.importItems, { items: [{ title: "E" }, { title: "F" }] });
    expect(await titulos(laura)).toEqual(["E", "F", "D", "A", "B", "C"]);
  });

  test("cada grupo se ordena por su cuenta", async () => {
    const t = convexTest(schema, modules);
    const laura = t.withIdentity(LAURA);
    const ids: Record<string, Id<"listItems">> = {};
    for (const titulo of ["A", "F1", "B", "F2", "C"]) {
      ids[titulo] = await laura.mutation(api.lists.addItem, { title: titulo });
    }
    await laura.mutation(api.lists.setFavorite, { id: ids.F1, favorite: true });
    await laura.mutation(api.lists.setFavorite, { id: ids.F2, favorite: true });
    expect(await titulos(laura)).toEqual(["C", "F2", "B", "F1", "A"]);

    // F1 sube por encima de F2 saltando B, que es del otro grupo.
    await laura.mutation(api.lists.moveItem, { id: ids.F1, direction: "up" });
    expect(await titulos(laura)).toEqual(["C", "F1", "B", "F2", "A"]);
    // Y B baja por debajo de A saltando F2.
    await laura.mutation(api.lists.moveItem, { id: ids.B, direction: "down" });
    expect(await titulos(laura)).toEqual(["C", "F1", "A", "F2", "B"]);
    // F1 ya es el primero de su grupo.
    await laura.mutation(api.lists.moveItem, { id: ids.F1, direction: "up" });
    expect(await titulos(laura)).toEqual(["C", "F1", "A", "F2", "B"]);
  });

  test("quien lee ve el mismo orden, y mover no le dice «lo ha cambiado»", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-12T10:00:00Z"));
    const t = convexTest(schema, modules);
    const { laura, alex, vela, fichaDeAlex } = await escenario(t);
    await alex.mutation(api.lists.claim, { itemId: vela });

    vi.setSystemTime(new Date("2026-10-12T10:05:00Z"));
    await laura.mutation(api.lists.moveItem, { id: vela, direction: "up" });

    const [lista] = await alex.query(api.lists.forPerson, { personId: fichaDeAlex });
    expect(lista.items.map((i) => i.title)).toEqual(["Vela de cera", "Libro de cerámica"]);
    expect(lista.items[0]).toMatchObject({ state: "mine", editedSinceMark: false });
    expect(await t.run(async (ctx) => "editedAt" in (await ctx.db.get(vela))!)).toBe(false);
    expect(await titulos(laura)).toEqual(["Vela de cera", "Libro de cerámica"]);
    // La exportación va en el mismo orden.
    expect((await laura.query(api.exportData.mine, {})).miLista.elementos.map((e) => e.titulo)).toEqual([
      "Vela de cera",
      "Libro de cerámica",
    ]);
  });

  test("solo la dueña mueve", async () => {
    const t = convexTest(schema, modules);
    const { alex, vela } = await escenario(t);
    await expect(alex.mutation(api.lists.moveItem, { id: vela, direction: "up" })).rejects.toThrow(
      /Elemento no encontrado/,
    );
    await expect(t.mutation(api.lists.moveItem, { id: vela, direction: "up" })).rejects.toThrow(
      /Sesión no encontrada/,
    );
  });
});

describe("tu cumpleaños para quien te regala", () => {
  test("la dueña lo pone y lo ven sus lectores, nadie más", async () => {
    const t = convexTest(schema, modules);
    const { laura, alex, fichaDeAlex } = await escenario(t);
    expect(await laura.query(api.lists.myBirthday, {})).toBeNull();
    expect((await alex.query(api.lists.forPerson, { personId: fichaDeAlex }))[0].birthday).toBeNull();

    await laura.mutation(api.lists.setBirthday, { birthday: { month: 2, day: 29 } });

    expect(await laura.query(api.lists.myBirthday, {})).toEqual({ month: 2, day: 29 });
    expect((await alex.query(api.lists.forPerson, { personId: fichaDeAlex }))[0].birthday).toEqual({
      month: 2,
      day: 29,
    });
    await alex.mutation(api.personShares.invite, { personId: fichaDeAlex, clerkUserId: SARA.subject });
    expect(await t.withIdentity(SARA).query(api.lists.forPerson, { personId: fichaDeAlex })).toEqual([]);
    expect(await t.withIdentity(OTRO).query(api.lists.myBirthday, {})).toBeNull();
    expect(await alex.query(api.lists.myBirthday, {})).toBeNull();
  });

  test("solo fechas que existen", async () => {
    const t = convexTest(schema, modules);
    const laura = t.withIdentity(LAURA);
    for (const [month, day] of [[2, 30], [13, 1], [0, 5], [4, 31], [6, 0], [6, 1.5]]) {
      await expect(
        laura.mutation(api.lists.setBirthday, { birthday: { month, day } }),
      ).rejects.toMatchObject({ data: "Esa fecha no existe." });
    }
    expect(await t.run((ctx) => ctx.db.query("listAbout").collect())).toEqual([]);
  });

  test("convive con la nota: quitar una no quita la otra, y sin ninguna se va la fila", async () => {
    const t = convexTest(schema, modules);
    const laura = t.withIdentity(LAURA);
    const filas = () => t.run((ctx) => ctx.db.query("listAbout").collect());

    await laura.mutation(api.lists.setAbout, { note: "Talla M" });
    await laura.mutation(api.lists.setBirthday, { birthday: { month: 3, day: 24 } });
    expect(await filas()).toHaveLength(1);

    await laura.mutation(api.lists.setAbout, { note: "" });
    expect(await laura.query(api.lists.myAbout, {})).toBeNull();
    expect(await laura.query(api.lists.myBirthday, {})).toEqual({ month: 3, day: 24 });
    expect(await filas()).toMatchObject([{ birthdayMonth: 3, birthdayDay: 24 }]);
    expect((await filas())[0]).not.toHaveProperty("note");

    await laura.mutation(api.lists.setBirthday, { birthday: null });
    expect(await filas()).toEqual([]);

    // Y al revés.
    await laura.mutation(api.lists.setBirthday, { birthday: { month: 3, day: 24 } });
    await laura.mutation(api.lists.setAbout, { note: "Talla M" });
    await laura.mutation(api.lists.setBirthday, { birthday: null });
    expect(await laura.query(api.lists.myAbout, {})).toBe("Talla M");
    expect(await laura.query(api.lists.myBirthday, {})).toBeNull();
    expect((await filas())[0]).not.toHaveProperty("birthdayMonth");
    await laura.mutation(api.lists.setAbout, { note: "" });
    expect(await filas()).toEqual([]);
    // Quitar lo que no hay no falla.
    await laura.mutation(api.lists.setBirthday, { birthday: null });
  });

  test("cambiarlo no le dice a nadie «lo ha cambiado»", async () => {
    const t = convexTest(schema, modules);
    const { laura, alex, vela, fichaDeAlex } = await escenario(t);
    await alex.mutation(api.lists.claim, { itemId: vela });
    await laura.mutation(api.lists.setBirthday, { birthday: { month: 3, day: 24 } });
    const [lista] = await alex.query(api.lists.forPerson, { personId: fichaDeAlex });
    expect(lista.items.find((i) => i._id === vela)!.editedSinceMark).toBe(false);
  });

  test("sale en la exportación de la dueña y se va con su cuenta", async () => {
    const t = convexTest(schema, modules);
    const { laura, alex } = await escenario(t);
    await laura.mutation(api.lists.setBirthday, { birthday: { month: 3, day: 24 } });

    expect((await laura.query(api.exportData.mine, {})).miLista.miCumpleanos).toEqual({ mes: 3, dia: 24 });
    expect((await alex.query(api.exportData.mine, {})).miLista.miCumpleanos).toBeNull();

    await laura.mutation(api.account.deleteMyAccount, {});
    expect(await t.run((ctx) => ctx.db.query("listAbout").collect())).toEqual([]);
  });

  test("sin sesión no se escribe ni se lee", async () => {
    const t = convexTest(schema, modules);
    await expect(
      t.mutation(api.lists.setBirthday, { birthday: { month: 3, day: 24 } }),
    ).rejects.toThrow(/Sesión no encontrada/);
    await expect(t.query(api.lists.myBirthday, {})).rejects.toThrow(/Sesión no encontrada/);
  });
});

describe("bloquear a quien te comparte su lista", () => {
  // Como en «la dueña recibe lo mismo…»: fuera ids y horas, que cambian de
  // una base de datos a otra aunque nadie haga nada distinto.
  const IDS_Y_HORAS = new Set(["_id", "shareId", "_creationTime", "since", "desde", "enviado"]);
  const quitarIdsYHoras = (v: unknown): unknown =>
    Array.isArray(v)
      ? v.map(quitarIdsYHoras)
      : v !== null && typeof v === "object"
        ? Object.fromEntries(
            Object.entries(v)
              .filter(([k]) => !IDS_Y_HORAS.has(k))
              .map(([k, x]) => [k, quitarIdsYHoras(x)]),
          )
        : v;
  const avisosA = (t: T, to: string) =>
    t.run(async (ctx) =>
      (await ctx.db.system.query("_scheduled_functions").collect()).filter(
        (f) => f.name.includes("sendListInviteEmail") && f.args[0].to === to,
      ),
    );
  const conEmail = (t: T, quien: typeof ALEX | typeof LAURA) =>
    t.withIdentity(quien).mutation(api.settings.ensureDefaults, {});

  /**
   * Laura comparte su lista con Alex. Alex la deja con «No me interesa» o la
   * bloquea, y Laura vuelve a compartírsela antes y después de los 30 días.
   * Devuelve todo lo que Laura puede ver por el camino.
   */
  async function historia(bloquea: boolean) {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-12T10:00:00Z"));
    const t = convexTest(schema, modules);
    await conEmail(t, ALEX);
    await conEmail(t, LAURA);
    const laura = t.withIdentity(LAURA);
    const alex = t.withIdentity(ALEX);
    await laura.mutation(api.lists.addItem, { title: "Vela de cera" });
    // Alex también le comparte la suya a Laura.
    const { shareId: deAlex } = await alex.mutation(api.lists.invite, { readerClerkUserId: LAURA.subject });

    const primera = await laura.mutation(api.lists.invite, { readerClerkUserId: ALEX.subject });
    await alex.mutation(bloquea ? api.lists.leaveAndBlock : api.lists.leave, { shareId: primera.shareId });
    const lectoresTrasIrse = await laura.query(api.lists.myReaders, {});

    const segunda = await laura.mutation(api.lists.invite, { readerClerkUserId: ALEX.subject });
    const repetida = await laura.mutation(api.lists.invite, { readerClerkUserId: ALEX.subject });
    const quitar = await laura.mutation(api.lists.revoke, { shareId: segunda.shareId });
    let errorAlQuitarOtraVez: unknown = null;
    try {
      await laura.mutation(api.lists.revoke, { shareId: segunda.shareId });
    } catch (err) {
      errorAlQuitarOtraVez = (err as { data?: unknown }).data;
    }

    vi.setSystemTime(new Date(Date.now() + INVITE_EMAIL_COOLDOWN_MS + 60_000));
    const tercera = await laura.mutation(api.lists.invite, { readerClerkUserId: ALEX.subject });
    const deVuelta = await laura.mutation(api.lists.shareBack, { shareId: deAlex });

    return {
      t,
      alex,
      tercera,
      dueña: quitarIdsYHoras({
        primera,
        lectoresTrasIrse,
        segunda,
        repetida,
        quitar: quitar ?? null,
        errorAlQuitarOtraVez,
        tercera,
        deVuelta,
        lectores: await laura.query(api.lists.myReaders, {}),
        items: await laura.query(api.lists.myItems, {}),
        recibidas: await laura.query(api.lists.sharedWithMe, {}),
        bloqueos: await laura.query(api.lists.myBlocks, {}),
        regalos: await laura.query(api.lists.myGifts, {}),
        exportacion: await laura.query(api.exportData.mine, {}),
      }) as { tercera: { emailed: boolean }; lectores: unknown[] },
    };
  }

  test("a la dueña le sale todo igual, la bloqueen o no", async () => {
    const sinBloqueo = await historia(false);
    const conBloqueo = await historia(true);
    expect(conBloqueo.dueña).toEqual(sinBloqueo.dueña);
    // Y no es una comparación vacía: hubo correo, plazo y alguien que la lee.
    expect(sinBloqueo.dueña.tercera.emailed).toBe(true);
    expect(sinBloqueo.dueña.lectores).toHaveLength(1);
    expect(JSON.stringify(conBloqueo.dueña)).not.toMatch(/hidden|suppressed|deliveredAt/);
  });

  test("quien bloquea no vuelve a ver esa lista ni le llega el correo", async () => {
    const { t, alex, tercera } = await historia(true);
    const ficha = await alex.mutation(api.people.create, { name: "Laura", relationship: "partner", interests: [] });
    const [vela] = await t.withIdentity(LAURA).query(api.lists.myItems, {});

    expect(await alex.query(api.lists.sharedWithMe, {})).toEqual([]);
    expect(await alex.query(api.lists.forPerson, { personId: ficha })).toEqual([]);
    expect(await alex.query(api.lists.myGifts, {})).toEqual([]);
    await expect(alex.mutation(api.lists.claim, { itemId: vela._id })).rejects.toThrow(/Elemento no encontrado/);
    for (const intento of [
      () => alex.mutation(api.lists.associate, { shareId: tercera.shareId, personId: ficha }),
      () => alex.mutation(api.lists.leave, { shareId: tercera.shareId }),
      () => alex.mutation(api.lists.leaveAndBlock, { shareId: tercera.shareId }),
      () => alex.mutation(api.lists.shareBack, { shareId: tercera.shareId }),
    ]) {
      await expect(intento()).rejects.toMatchObject({ data: "Lista no encontrada." });
    }
    // Solo el primer aviso, el de antes de bloquear.
    expect(await avisosA(t, ALEX.email)).toHaveLength(1);

    const datos = await alex.query(api.exportData.mine, {});
    expect(datos.listasQueTeComparten).toEqual([]);
    // El último aviso no salió: va el anterior, el de antes de bloquear.
    expect(datos.avisosDeListaPorCorreo.recibidos).toEqual([
      { enviado: new Date("2026-10-12T10:00:00Z").getTime() },
    ]);
    expect(datos.listasQueNoQuieres).toMatchObject([{ de: "Laura", email: LAURA.email }]);
    expect(await alex.query(api.lists.myBlocks, {})).toMatchObject([
      { ownerName: "Laura", ownerEmail: LAURA.email },
    ]);
  });

  test("una fila oculta no cuenta ni en la ficha ni en el correo de la fecha", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-10T08:00:00Z"));
    const t = convexTest(schema, modules);
    const { alex, fichaDeAlex, shareAlex } = await escenario(t);
    await alex.mutation(api.importantDates.create, {
      personId: fichaDeAlex,
      label: "Cumpleaños",
      month: 10,
      day: 17,
      recurring: true,
    });
    await alex.mutation(api.settings.setMine, { emailNotificationsEnabled: true, emailNotifyDaysBefore: [7] });
    const evento = async () =>
      (await t.query(internal.notifications.findEventsNeedingEmail, {}))[0].events[0];
    expect(await evento()).toMatchObject({ listUnclaimed: 2 });

    // Hoy no hay camino para que una fila oculta quede asociada, pero si lo
    // hubiera, tampoco se vería.
    await t.run((ctx) => ctx.db.patch(shareAlex, { hidden: true }));

    expect(await alex.query(api.lists.forPerson, { personId: fichaDeAlex })).toEqual([]);
    expect(await evento()).not.toHaveProperty("listUnclaimed");
  });

  test("bloquear deja la lista como «No me interesa»: sus marcas se van", async () => {
    const t = convexTest(schema, modules);
    const { laura, alex, vela, shareAlex } = await escenario(t);
    const { mama, fichaDeMama } = await sumarMama(t);
    await alex.mutation(api.lists.claim, { itemId: vela });

    await alex.mutation(api.lists.leaveAndBlock, { shareId: shareAlex });
    await laura.mutation(api.lists.invite, { readerClerkUserId: ALEX.subject });

    const [lista] = await mama.query(api.lists.forPerson, { personId: fichaDeMama });
    expect(lista.items.find((i) => i._id === vela)!.state).toBe("free");
    expect(await t.run((ctx) => ctx.db.query("listBlocks").collect())).toHaveLength(1);
    expect((await laura.query(api.lists.myReaders, {})).map((r) => r.readerClerkUserId).sort()).toEqual(
      [ALEX.subject, MAMA.subject].sort(),
    );
  });

  test("desbloquear destapa la lista que te volvió a compartir, sin correo", async () => {
    const { t, alex } = await historia(true);
    const [bloqueo] = await alex.query(api.lists.myBlocks, {});

    await alex.mutation(api.lists.unblock, { blockId: bloqueo.blockId });

    expect(await alex.query(api.lists.myBlocks, {})).toEqual([]);
    expect(await alex.query(api.lists.sharedWithMe, {})).toMatchObject([
      { ownerName: "Laura", ownerEmail: LAURA.email, personId: null },
    ]);
    expect(await avisosA(t, ALEX.email)).toHaveLength(1);
    await expect(alex.mutation(api.lists.unblock, { blockId: bloqueo.blockId })).rejects.toThrow(
      /Bloqueo no encontrado/,
    );
  });

  test("desbloquear sin lista pendiente solo quita el bloqueo; lo siguiente llega normal", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-12T10:00:00Z"));
    const t = convexTest(schema, modules);
    await conEmail(t, ALEX);
    const laura = t.withIdentity(LAURA);
    const alex = t.withIdentity(ALEX);
    const { shareId } = await laura.mutation(api.lists.invite, { readerClerkUserId: ALEX.subject });
    await alex.mutation(api.lists.leaveAndBlock, { shareId });
    const [bloqueo] = await alex.query(api.lists.myBlocks, {});
    await alex.mutation(api.lists.unblock, { blockId: bloqueo.blockId });

    vi.setSystemTime(new Date(Date.now() + INVITE_EMAIL_COOLDOWN_MS + 60_000));
    const r = await laura.mutation(api.lists.invite, { readerClerkUserId: ALEX.subject });
    expect(r.emailed).toBe(true);
    expect(await avisosA(t, ALEX.email)).toHaveLength(2);
    expect(await alex.query(api.lists.sharedWithMe, {})).toHaveLength(1);
    // Una fila por pareja: sale el último, que esta vez sí salió.
    expect((await alex.query(api.exportData.mine, {})).avisosDeListaPorCorreo.recibidos).toEqual([
      { enviado: Date.now() },
    ]);
  });

  test("los bloqueos son solo de quien los pone", async () => {
    const t = convexTest(schema, modules);
    const { laura, alex, shareAlex } = await escenario(t);
    await alex.mutation(api.lists.leaveAndBlock, { shareId: shareAlex });
    const [bloqueo] = await alex.query(api.lists.myBlocks, {});

    expect(await laura.query(api.lists.myBlocks, {})).toEqual([]);
    for (const quien of [LAURA, OTRO]) {
      await expect(t.withIdentity(quien).mutation(api.lists.unblock, { blockId: bloqueo.blockId })).rejects.toThrow(
        /Bloqueo no encontrado/,
      );
    }
    await expect(t.query(api.lists.myBlocks, {})).rejects.toThrow(/Sesión no encontrada/);
    // La dueña, en su exportación, tampoco lo ve.
    expect(JSON.stringify(await laura.query(api.exportData.mine, {}))).not.toContain(ALEX.subject);
  });

  test("borrar la cuenta se lleva los bloqueos, de un lado y del otro", async () => {
    for (const quienSeVa of [LAURA, ALEX]) {
      const t = convexTest(schema, modules);
      const { alex, shareAlex } = await escenario(t);
      await alex.mutation(api.lists.leaveAndBlock, { shareId: shareAlex });
      await t.withIdentity(LAURA).mutation(api.lists.invite, { readerClerkUserId: ALEX.subject });

      await t.withIdentity(quienSeVa).mutation(api.account.deleteMyAccount, {});

      const quedan = await t.run(async (ctx) => ({
        bloqueos: await ctx.db.query("listBlocks").collect(),
        permisos: await ctx.db.query("listShares").collect(),
      }));
      expect(quedan, quienSeVa.subject).toEqual({ bloqueos: [], permisos: [] });
    }
  });
});

describe("lo regalo yo · para…", () => {
  /** Alex marca la vela y tiene el cumpleaños de Laura en su ficha. */
  async function conFecha(t: T) {
    const base = await escenario(t);
    const { alex, vela, fichaDeAlex } = base;
    const cumple = await alex.mutation(api.importantDates.create, {
      personId: fichaDeAlex,
      label: "Cumpleaños",
      month: 3,
      day: 24,
      recurring: true,
    });
    const claimId = await alex.mutation(api.lists.claim, { itemId: vela });
    return { ...base, cumple, claimId };
  }

  test("quien marca elige la fecha y la ve en la ficha y en lo que va a regalar", async () => {
    const t = convexTest(schema, modules);
    const { laura, alex, vela, fichaDeAlex, cumple, claimId } = await conFecha(t);
    const { mama, fichaDeMama } = await sumarMama(t);
    const dueñaAntes = await laura.query(api.lists.myItems, {});

    expect(await alex.mutation(api.lists.setClaimOccasion, { claimId, importantDateId: cumple })).toBeNull();

    const [lista] = await alex.query(api.lists.forPerson, { personId: fichaDeAlex });
    expect(lista.items.find((i) => i._id === vela)!.occasionLabel).toBe("Cumpleaños");
    expect(lista.items.find((i) => i._id !== vela)!.occasionLabel).toBeNull();
    expect(await alex.query(api.lists.myGifts, {})).toMatchObject([
      {
        title: "Vela de cera",
        importantDateId: cumple,
        occasionLabel: "Cumpleaños",
        occasions: [{ _id: cumple, label: "Cumpleaños" }],
      },
    ]);
    // Ni otra lectora ni la dueña lo saben.
    const [deMama] = await mama.query(api.lists.forPerson, { personId: fichaDeMama });
    expect(deMama.items.find((i) => i._id === vela)).toMatchObject({ state: "taken", occasionLabel: null });
    expect(await laura.query(api.lists.myItems, {})).toEqual(dueñaAntes);
    expect(JSON.stringify(await laura.query(api.exportData.mine, {}))).not.toContain("Cumpleaños");

    await alex.mutation(api.lists.setClaimOccasion, { claimId, importantDateId: null });
    expect((await alex.query(api.lists.myGifts, {}))[0]).toMatchObject({
      importantDateId: null,
      occasionLabel: null,
    });
    expect(await t.run(async (ctx) => "importantDateId" in (await ctx.db.get(claimId))!)).toBe(false);
  });

  test("sin ficha asociada no hay fechas que elegir", async () => {
    const t = convexTest(schema, modules);
    const mama = t.withIdentity(MAMA);
    const bufanda = await mama.mutation(api.lists.addItem, { title: "Bufanda" });
    await mama.mutation(api.lists.invite, { readerClerkUserId: ALEX.subject });
    const alex = t.withIdentity(ALEX);
    await alex.mutation(api.lists.claim, { itemId: bufanda });
    expect(await alex.query(api.lists.myGifts, {})).toMatchObject([
      { title: "Bufanda", occasions: [], importantDateId: null, occasionLabel: null },
    ]);
  });

  test("solo una fecha de la ficha a la que asoció la lista", async () => {
    const t = convexTest(schema, modules);
    const { alex, claimId } = await conFecha(t);
    const otraFicha = await alex.mutation(api.people.create, { name: "Papá", relationship: "family", interests: [] });
    const deOtraFicha = await alex.mutation(api.importantDates.create, {
      personId: otraFicha,
      label: "Santo",
      month: 6,
      day: 29,
      recurring: true,
    });
    const otro = t.withIdentity(OTRO);
    const fichaAjena = await otro.mutation(api.people.create, { name: "Nadie", relationship: "friend", interests: [] });
    const ajena = await otro.mutation(api.importantDates.create, {
      personId: fichaAjena,
      label: "Aniversario",
      month: 1,
      day: 1,
      recurring: true,
    });

    for (const importantDateId of [deOtraFicha, ajena]) {
      await expect(
        alex.mutation(api.lists.setClaimOccasion, { claimId, importantDateId }),
      ).rejects.toMatchObject({ data: "Esa fecha no es de su ficha." });
    }
  });

  test("solo en tus marcas y antes de darlo por regalado", async () => {
    const t = convexTest(schema, modules);
    const { alex, cumple, claimId } = await conFecha(t);
    const { mama } = await sumarMama(t);
    await expect(
      mama.mutation(api.lists.setClaimOccasion, { claimId, importantDateId: cumple }),
    ).rejects.toThrow(/Marca no encontrada/);
    await expect(
      t.mutation(api.lists.setClaimOccasion, { claimId, importantDateId: cumple }),
    ).rejects.toThrow(/Sesión no encontrada/);

    await alex.mutation(api.lists.markGiven, { claimId });
    await expect(
      alex.mutation(api.lists.setClaimOccasion, { claimId, importantDateId: cumple }),
    ).rejects.toMatchObject({ data: "Ya lo has dado por regalado." });
  });

  test("si la fecha se borra, sale sin ocasión", async () => {
    const t = convexTest(schema, modules);
    const { alex, vela, fichaDeAlex, cumple, claimId } = await conFecha(t);
    await alex.mutation(api.lists.setClaimOccasion, { claimId, importantDateId: cumple });

    await alex.mutation(api.importantDates.remove, { id: cumple });

    const [lista] = await alex.query(api.lists.forPerson, { personId: fichaDeAlex });
    expect(lista.items.find((i) => i._id === vela)!.occasionLabel).toBeNull();
    expect((await alex.query(api.lists.myGifts, {}))[0]).toMatchObject({
      importantDateId: null,
      occasionLabel: null,
      occasions: [],
    });
    expect((await alex.query(api.exportData.mine, {})).marcasEnListasDeOtros[0].paraOcasion).toBeNull();
  });

  test("la exportación de quien marca lo lleva, solo mientras vea la ficha", async () => {
    const t = convexTest(schema, modules);
    const laura = t.withIdentity(LAURA);
    const vela = await laura.mutation(api.lists.addItem, { title: "Vela de cera" });
    const { shareId } = await laura.mutation(api.lists.invite, { readerClerkUserId: ALEX.subject });
    // La ficha de Laura es de Sara, que se la comparte a Alex.
    const sara = t.withIdentity(SARA);
    const ficha = await sara.mutation(api.people.create, { name: "Laura", relationship: "family", interests: [] });
    await sara.mutation(api.personShares.invite, { personId: ficha, clerkUserId: ALEX.subject });
    const alex = t.withIdentity(ALEX);
    await alex.mutation(api.lists.associate, { shareId, personId: ficha });
    const cumple = await alex.mutation(api.importantDates.create, {
      personId: ficha,
      label: "Cumpleaños",
      month: 3,
      day: 24,
      recurring: true,
    });
    const claimId = await alex.mutation(api.lists.claim, { itemId: vela });
    await alex.mutation(api.lists.setClaimOccasion, { claimId, importantDateId: cumple });

    expect((await alex.query(api.exportData.mine, {})).marcasEnListasDeOtros).toMatchObject([
      { elemento: "Vela de cera", paraOcasion: "Cumpleaños" },
    ]);

    await alex.mutation(api.personShares.leave, { personId: ficha });
    expect((await alex.query(api.exportData.mine, {})).marcasEnListasDeOtros).toMatchObject([
      { elemento: "Vela de cera", paraOcasion: null },
    ]);
    expect((await alex.query(api.lists.myGifts, {}))[0]).toMatchObject({ occasionLabel: null, occasions: [] });
  });
});

// ─── Listas a cargo ──────────────────────────────────────────────────────────
//
// docs/encargo-listas-ninos.md, opción A. Marta lleva su lista y las de Lucía
// y Pablo, que no tienen cuenta. El riesgo de verdad es el aislamiento: hasta
// esto, el dueño ERA la lista, y cualquier lectura por dueño que se quede sin
// la lista mezcla lo de Lucía con lo de Marta sin que falle nada más. Por eso
// casi todos estos tests llenan las tres listas antes de mirar una.

const MARTA = { subject: "user_marta", issuer: ISSUER, givenName: "Marta", email: "marta@example.com" };
const ABUELA = { subject: "user_abuela", issuer: ISSUER, givenName: "Carmen", email: "abuela@example.com" };
const TIO = { subject: "user_tio", issuer: ISSUER, givenName: "Javier", email: "tio@example.com" };

/**
 * Marta, con su lista y las de Lucía y Pablo llenas: dos cosas en cada una,
 * una de ellas en «Lo que más ilusión», con su nota y su cumpleaños. La abuela
 * lee las tres y las guarda en tres fichas suyas; el tío solo lee la de Lucía.
 */
async function familia(t: T) {
  const marta = t.withIdentity(MARTA);
  const abuela = t.withIdentity(ABUELA);
  const tio = t.withIdentity(TIO);

  const lucia = await marta.mutation(api.lists.createManagedList, { forName: "Lucía" });
  const pablo = await marta.mutation(api.lists.createManagedList, { forName: "Pablo" });

  const novela = await marta.mutation(api.lists.addItem, { title: "Novela negra" });
  const bufanda = await marta.mutation(api.lists.addItem, { title: "Bufanda gris" });
  const muneca = await marta.mutation(api.lists.addItem, { title: "Muñeca de trapo", listId: lucia });
  const puzle = await marta.mutation(api.lists.addItem, { title: "Puzle de 500", listId: lucia });
  const coche = await marta.mutation(api.lists.addItem, { title: "Coche teledirigido", listId: pablo });
  const pelota = await marta.mutation(api.lists.addItem, { title: "Pelota de fútbol", listId: pablo });
  for (const id of [novela, muneca, coche]) {
    await marta.mutation(api.lists.setFavorite, { id, favorite: true });
  }

  await marta.mutation(api.lists.setAbout, { note: "Talla M" });
  await marta.mutation(api.lists.setAbout, { note: "Talla 7 años", listId: lucia });
  await marta.mutation(api.lists.setAbout, { note: "Le encantan los dinosaurios", listId: pablo });
  await marta.mutation(api.lists.setBirthday, { birthday: { month: 3, day: 14 } });
  await marta.mutation(api.lists.setBirthday, { birthday: { month: 5, day: 2 }, listId: lucia });
  await marta.mutation(api.lists.setBirthday, { birthday: { month: 11, day: 20 }, listId: pablo });

  const deMarta = (await marta.mutation(api.lists.invite, { readerClerkUserId: ABUELA.subject })).shareId;
  const deLucia = (await marta.mutation(api.lists.invite, { readerClerkUserId: ABUELA.subject, listId: lucia })).shareId;
  const dePablo = (await marta.mutation(api.lists.invite, { readerClerkUserId: ABUELA.subject, listId: pablo })).shareId;
  const tioLucia = (await marta.mutation(api.lists.invite, { readerClerkUserId: TIO.subject, listId: lucia })).shareId;

  const ficha = (quien: typeof abuela, name: string) =>
    quien.mutation(api.people.create, { name, relationship: "family", interests: [] });
  const fichaMarta = await ficha(abuela, "Marta");
  const fichaLucia = await ficha(abuela, "Lucía");
  const fichaPablo = await ficha(abuela, "Pablo");
  const fichaLuciaTio = await ficha(tio, "Lucía");
  await abuela.mutation(api.lists.associate, { shareId: deMarta, personId: fichaMarta });
  await abuela.mutation(api.lists.associate, { shareId: deLucia, personId: fichaLucia });
  await abuela.mutation(api.lists.associate, { shareId: dePablo, personId: fichaPablo });
  await tio.mutation(api.lists.associate, { shareId: tioLucia, personId: fichaLuciaTio });

  return {
    marta, abuela, tio, lucia, pablo,
    novela, bufanda, muneca, puzle, coche, pelota,
    deMarta, deLucia, dePablo, tioLucia,
    fichaMarta, fichaLucia, fichaPablo, fichaLuciaTio,
  };
}

const titulos = (items: { title: string }[]) => items.map((i) => i.title).sort();

describe("listas a cargo: crearlas y llevarlas", () => {
  test("salen por orden de nombre, con cuántas cosas y lectores, y sin marcas", async () => {
    const t = convexTest(schema, modules);
    const { marta, abuela, lucia, pablo, muneca } = await familia(t);
    const antes = await marta.query(api.lists.myManagedLists, {});
    expect(antes).toEqual([
      { listId: lucia, forName: "Lucía", personId: null, itemCount: 2, readerCount: 2 },
      { listId: pablo, forName: "Pablo", personId: null, itemCount: 2, readerCount: 1 },
    ]);
    await abuela.mutation(api.lists.claim, { itemId: muneca });
    expect(await marta.query(api.lists.myManagedLists, {})).toEqual(antes);
    expect(await marta.query(api.lists.managedList, { listId: lucia })).toEqual({
      listId: lucia,
      forName: "Lucía",
      personId: null,
    });
  });

  test(`como mucho ${MAX_MANAGED_LISTS}, y llegar al tope no gasta cupo`, async () => {
    const t = convexTest(schema, modules);
    const marta = t.withIdentity(MARTA);
    for (let i = 0; i < MAX_MANAGED_LISTS; i++) {
      await marta.mutation(api.lists.createManagedList, { forName: `Niño ${i}` });
    }
    await expect(marta.mutation(api.lists.createManagedList, { forName: "Uno más" })).rejects.toMatchObject({
      data: "Ya llevas 5 listas, el máximo. Borra alguna para empezar otra.",
    });
    const cupo = await t.run(async (ctx) =>
      (await ctx.db.query("rateLimitBuckets").collect()).find((b) => b.bucket === "create_managed_list")!.count,
    );
    expect(cupo).toBe(MAX_MANAGED_LISTS);
  });

  test(`${CREATE_MANAGED_LIST_DAILY_LIMIT} al día, aunque se borren`, async () => {
    const t = convexTest(schema, modules);
    const marta = t.withIdentity(MARTA);
    for (let i = 0; i < CREATE_MANAGED_LIST_DAILY_LIMIT; i++) {
      const listId = await marta.mutation(api.lists.createManagedList, { forName: "Lucía" });
      await marta.mutation(api.lists.deleteManagedList, { listId });
    }
    await expect(marta.mutation(api.lists.createManagedList, { forName: "Lucía" })).rejects.toThrow(
      /Límite diario/,
    );
  });

  test("el nombre se valida y se puede cambiar", async () => {
    const t = convexTest(schema, modules);
    const marta = t.withIdentity(MARTA);
    await expect(marta.mutation(api.lists.createManagedList, { forName: "  " })).rejects.toThrow(
      /para quién/,
    );
    const lucia = await marta.mutation(api.lists.createManagedList, { forName: "  Lucía " });
    expect((await marta.query(api.lists.managedList, { listId: lucia })).forName).toBe("Lucía");
    await marta.mutation(api.lists.renameManagedList, { listId: lucia, forName: "Lucía María" });
    expect((await marta.query(api.lists.managedList, { listId: lucia })).forName).toBe("Lucía María");
    await expect(
      marta.mutation(api.lists.renameManagedList, { listId: lucia, forName: "x".repeat(41) }),
    ).rejects.toThrow(/demasiado largo/);
  });

  test("solo quien la lleva la ve, la cambia o apunta en ella", async () => {
    const t = convexTest(schema, modules);
    const { lucia, muneca } = await familia(t);
    for (const quien of [ABUELA, OTRO].map((u) => t.withIdentity(u))) {
      for (const intento of [
        () => quien.query(api.lists.managedList, { listId: lucia }),
        () => quien.query(api.lists.managedItems, { listId: lucia }),
        () => quien.query(api.lists.myItems, { listId: lucia }),
        () => quien.query(api.lists.myReaders, { listId: lucia }),
        () => quien.query(api.lists.myAbout, { listId: lucia }),
        () => quien.query(api.lists.myBirthday, { listId: lucia }),
        () => quien.mutation(api.lists.addItem, { title: "Intruso", listId: lucia }),
        () => quien.mutation(api.lists.importItems, { items: [{ title: "Intruso" }], listId: lucia }),
        () => quien.mutation(api.lists.setAbout, { note: "Intruso", listId: lucia }),
        () => quien.mutation(api.lists.setBirthday, { birthday: null, listId: lucia }),
        () => quien.mutation(api.lists.invite, { readerClerkUserId: OTRO.subject, listId: lucia }),
        () => quien.mutation(api.lists.renameManagedList, { listId: lucia, forName: "X" }),
        () => quien.mutation(api.lists.linkManagedListPerson, { listId: lucia, personId: null }),
        () => quien.mutation(api.lists.deleteManagedList, { listId: lucia }),
      ]) {
        await expect(intento()).rejects.toMatchObject({ data: "Lista no encontrada." });
      }
      await expect(quien.mutation(api.lists.updateItem, { id: muneca, title: "X" })).rejects.toThrow(
        /Elemento no encontrado/,
      );
    }
    expect(await t.withIdentity(OTRO).query(api.lists.myManagedLists, {})).toEqual([]);
  });

  test("la ficha que le pone quien la lleva es suya y no da acceso a nadie", async () => {
    const t = convexTest(schema, modules);
    const { marta, lucia } = await familia(t);
    const suFicha = await marta.mutation(api.people.create, { name: "Lucía", relationship: "family", interests: [] });
    const ajena = await t
      .withIdentity(OTRO)
      .mutation(api.people.create, { name: "Nadie", relationship: "friend", interests: [] });

    await expect(
      marta.mutation(api.lists.linkManagedListPerson, { listId: lucia, personId: ajena }),
    ).rejects.toThrow(/Persona no encontrada/);
    await marta.mutation(api.lists.linkManagedListPerson, { listId: lucia, personId: suFicha });
    expect((await marta.query(api.lists.managedList, { listId: lucia })).personId).toBe(suFicha);

    // Compartir esa ficha con Sara no le da la lista: va por `listShares`.
    await marta.mutation(api.personShares.invite, { personId: suFicha, clerkUserId: SARA.subject });
    const sara = t.withIdentity(SARA);
    expect(await sara.query(api.lists.forPerson, { personId: suFicha })).toEqual([]);
    expect(await sara.query(api.lists.sharedWithMe, {})).toEqual([]);

    // Si la ficha se borra, sale sin ficha.
    await marta.mutation(api.people.remove, { id: suFicha });
    expect((await marta.query(api.lists.managedList, { listId: lucia })).personId).toBeNull();
    await marta.mutation(api.lists.linkManagedListPerson, { listId: lucia, personId: null });
    expect(await t.run(async (ctx) => "personId" in (await ctx.db.get(lucia))!)).toBe(false);
  });
});

describe("listas a cargo: aislamiento", () => {
  test("lo del dueño sale por lista: la propia no trae nada de las que lleva, ni al revés", async () => {
    const t = convexTest(schema, modules);
    const { marta, lucia, pablo } = await familia(t);

    expect(titulos(await marta.query(api.lists.myItems, {}))).toEqual(["Bufanda gris", "Novela negra"]);
    expect(titulos(await marta.query(api.lists.myItems, { listId: lucia }))).toEqual([
      "Muñeca de trapo",
      "Puzle de 500",
    ]);
    expect(titulos(await marta.query(api.lists.managedItems, { listId: pablo }))).toEqual([
      "Coche teledirigido",
      "Pelota de fútbol",
    ]);
    expect(await marta.query(api.lists.myAbout, {})).toBe("Talla M");
    expect(await marta.query(api.lists.myAbout, { listId: lucia })).toBe("Talla 7 años");
    expect(await marta.query(api.lists.myBirthday, { listId: pablo })).toEqual({ month: 11, day: 20 });
    expect((await marta.query(api.lists.myReaders, {})).map((r) => r.readerClerkUserId)).toEqual([ABUELA.subject]);
    expect((await marta.query(api.lists.myReaders, { listId: lucia })).map((r) => r.readerClerkUserId).sort()).toEqual(
      [ABUELA.subject, TIO.subject].sort(),
    );
    expect((await marta.query(api.lists.myReaders, { listId: pablo })).map((r) => r.readerClerkUserId)).toEqual([
      ABUELA.subject,
    ]);
  });

  test("quitar la nota o el cumpleaños de una lista no toca los de las otras", async () => {
    const t = convexTest(schema, modules);
    const { marta, lucia, pablo } = await familia(t);
    await marta.mutation(api.lists.setAbout, { note: "", listId: lucia });
    await marta.mutation(api.lists.setBirthday, { birthday: null, listId: lucia });
    expect(await marta.query(api.lists.myAbout, { listId: lucia })).toBeNull();
    expect(await marta.query(api.lists.myAbout, {})).toBe("Talla M");
    expect(await marta.query(api.lists.myAbout, { listId: pablo })).toBe("Le encantan los dinosaurios");
    expect(await marta.query(api.lists.myBirthday, {})).toEqual({ month: 3, day: 14 });
  });

  test("el lector de Lucía no ve la de Pablo ni la de Marta, y la abuela ve cada una en su ficha", async () => {
    const t = convexTest(schema, modules);
    const { abuela, tio, coche, novela, lucia, pablo, fichaMarta, fichaLucia, fichaPablo, fichaLuciaTio } =
      await familia(t);

    const delTio = await tio.query(api.lists.forPerson, { personId: fichaLuciaTio });
    expect(delTio).toHaveLength(1);
    expect(titulos(delTio[0].items)).toEqual(["Muñeca de trapo", "Puzle de 500"]);
    expect(delTio[0]).toMatchObject({ forName: "Lucía", about: "Talla 7 años", birthday: { month: 5, day: 2 } });
    expect(await tio.query(api.lists.sharedWithMe, {})).toMatchObject([
      { ownerName: "Marta", listId: lucia, forName: "Lucía", personId: fichaLuciaTio },
    ]);
    for (const itemId of [coche, novela]) {
      await expect(tio.mutation(api.lists.claim, { itemId })).rejects.toThrow(/Elemento no encontrado/);
    }
    const json = JSON.stringify([
      delTio,
      await tio.query(api.lists.sharedWithMe, {}),
      await tio.query(api.lists.myGifts, {}),
    ]);
    for (const ajeno of ["Coche", "Pelota", "Novela", "Bufanda", "Talla M", "dinosaurios", "Pablo", String(pablo)]) {
      expect(json).not.toContain(ajeno);
    }

    const [deMarta] = await abuela.query(api.lists.forPerson, { personId: fichaMarta });
    const [deLucia] = await abuela.query(api.lists.forPerson, { personId: fichaLucia });
    const [dePablo] = await abuela.query(api.lists.forPerson, { personId: fichaPablo });
    expect(deMarta).toMatchObject({ forName: null, about: "Talla M", birthday: { month: 3, day: 14 } });
    expect(titulos(deMarta.items)).toEqual(["Bufanda gris", "Novela negra"]);
    expect(titulos(deLucia.items)).toEqual(["Muñeca de trapo", "Puzle de 500"]);
    expect(dePablo).toMatchObject({ forName: "Pablo", about: "Le encantan los dinosaurios" });
    expect(titulos(dePablo.items)).toEqual(["Coche teledirigido", "Pelota de fútbol"]);
    expect((await abuela.query(api.lists.sharedWithMe, {})).map((s) => s.forName ?? "").sort()).toEqual(
      ["", "Lucía", "Pablo"],
    );
  });

  test("las marcas de una lista no se ven en las otras del mismo dueño", async () => {
    const t = convexTest(schema, modules);
    const { abuela, tio, muneca, novela, fichaLuciaTio, fichaMarta } = await familia(t);
    await abuela.mutation(api.lists.claim, { itemId: novela });

    const [deLucia] = await tio.query(api.lists.forPerson, { personId: fichaLuciaTio });
    expect(deLucia.items.every((i) => i.state === "free")).toBe(true);
    await tio.mutation(api.lists.claim, { itemId: muneca });
    const [deMarta] = await abuela.query(api.lists.forPerson, { personId: fichaMarta });
    expect(deMarta.items.find((i) => i._id === novela)!.state).toBe("mine");
    expect(deMarta.items.filter((i) => i.state === "taken")).toEqual([]);
  });

  test("un invitado de la ficha de Lucía de la abuela no ve la lista", async () => {
    const t = convexTest(schema, modules);
    const { abuela, muneca, fichaLucia } = await familia(t);
    await abuela.mutation(api.personShares.invite, { personId: fichaLucia, clerkUserId: SARA.subject });
    const sara = t.withIdentity(SARA);
    expect(await sara.query(api.people.getById, { id: fichaLucia })).not.toBeNull();
    expect(await sara.query(api.lists.forPerson, { personId: fichaLucia })).toEqual([]);
    await expect(sara.mutation(api.lists.claim, { itemId: muneca })).rejects.toThrow(/Elemento no encontrado/);
  });

  test("los topes de favoritos y el orden a mano son de cada lista", async () => {
    const t = convexTest(schema, modules);
    const { marta, lucia, puzle } = await familia(t);
    // La lista propia llega a 5 favoritas; Lucía sigue pudiendo pasar una.
    for (let i = 0; i < MAX_FAVORITES - 1; i++) {
      const id = await marta.mutation(api.lists.addItem, { title: `Mía ${i}` });
      await marta.mutation(api.lists.setFavorite, { id, favorite: true });
    }
    const otra = await marta.mutation(api.lists.addItem, { title: "Una más" });
    await expect(marta.mutation(api.lists.setFavorite, { id: otra, favorite: true })).rejects.toThrow(/Ya tienes 5/);
    await marta.mutation(api.lists.setFavorite, { id: puzle, favorite: true });

    // Lo apuntado después en la propia no es vecino de nada de Lucía.
    const antesPropia = (await marta.query(api.lists.myItems, {})).map((i) => i._id);
    const enLucia = (await marta.query(api.lists.myItems, { listId: lucia })).map((i) => i._id);
    await marta.mutation(api.lists.moveItem, { id: enLucia[0], direction: "up" });
    await marta.mutation(api.lists.moveItem, { id: enLucia[1], direction: "up" });
    expect((await marta.query(api.lists.myItems, { listId: lucia })).map((i) => i._id)).toEqual([
      enLucia[1],
      enLucia[0],
    ]);
    expect((await marta.query(api.lists.myItems, {})).map((i) => i._id)).toEqual(antesPropia);
  });
});

describe("listas a cargo: lo cogido", () => {
  test("la lista propia sigue sin rastro de marcas, también con las otras marcadas", async () => {
    const t = convexTest(schema, modules);
    const { marta, abuela, tio, novela, muneca, coche } = await familia(t);
    const antes = await marta.query(api.lists.myItems, {});
    await abuela.mutation(api.lists.claim, { itemId: novela });
    await abuela.mutation(api.lists.claim, { itemId: coche });
    await tio.mutation(api.lists.claim, { itemId: muneca });
    expect(await marta.query(api.lists.myItems, {})).toEqual(antes);
    expect(await marta.query(api.lists.myReaders, {})).toHaveLength(1);
  });

  test("quien la lleva ve cogido o libre, y nunca quién", async () => {
    const t = convexTest(schema, modules);
    const { marta, abuela, tio, lucia, muneca, puzle } = await familia(t);
    const claimAbuela = await abuela.mutation(api.lists.claim, { itemId: muneca });
    const claimTio = await tio.mutation(api.lists.claim, { itemId: puzle });
    await tio.mutation(api.lists.markGiven, { claimId: claimTio });

    const items = await marta.query(api.lists.managedItems, { listId: lucia });
    expect(items.map((i) => [i.title, i.state, i.claimId]).sort()).toEqual([
      ["Muñeca de trapo", "taken", null],
      ["Puzle de 500", "taken", null],
    ]);
    const permitidos = new Set([
      "_id", "_creationTime", "title", "url", "note", "favorite", "priceCents", "photoUrl",
      "state", "claimId", "editedSinceMark", "occasionLabel",
    ]);
    for (const item of items) {
      for (const campo of Object.keys(item)) expect(permitidos).toContain(campo);
    }
    const json = JSON.stringify(items);
    for (const rastro of [
      ABUELA.subject, ABUELA.email, "Carmen", TIO.subject, TIO.email, String(claimAbuela), String(claimTio), "given",
    ]) {
      expect(json).not.toContain(rastro);
    }
  });

  test("quien la lleva puede marcar, y su marca bloquea el elemento para los demás", async () => {
    const t = convexTest(schema, modules);
    const { marta, abuela, lucia, puzle, novela, fichaLucia } = await familia(t);

    // En su lista propia sigue sin poder.
    await expect(marta.mutation(api.lists.claim, { itemId: novela })).rejects.toThrow(/Elemento no encontrado/);

    const claimId = await marta.mutation(api.lists.claim, { itemId: puzle });
    expect((await marta.query(api.lists.managedItems, { listId: lucia })).find((i) => i._id === puzle)).toMatchObject({
      state: "mine",
      claimId,
      editedSinceMark: false,
    });
    const [deLucia] = await abuela.query(api.lists.forPerson, { personId: fichaLucia });
    expect(deLucia.items.find((i) => i._id === puzle)).toMatchObject({ state: "taken", claimId: null });
    await expect(abuela.mutation(api.lists.claim, { itemId: puzle })).rejects.toThrow(/Ya lo regala otra persona/);
    expect(JSON.stringify(deLucia)).not.toContain(MARTA.subject);

    // Le sale en «Lo que vas a regalar», con para quién es.
    expect(await marta.query(api.lists.myGifts, {})).toMatchObject([
      { title: "Puzle de 500", forName: "Lucía", ownerName: null, personId: null },
    ]);

    // Darlo por regalado lo sigue bloqueando; quitar la marca lo libera.
    await marta.mutation(api.lists.markGiven, { claimId });
    expect((await marta.query(api.lists.managedItems, { listId: lucia })).find((i) => i._id === puzle)!.state).toBe(
      "given",
    );
    await marta.mutation(api.lists.unclaim, { claimId });
    const [despues] = await abuela.query(api.lists.forPerson, { personId: fichaLucia });
    expect(despues.items.find((i) => i._id === puzle)!.state).toBe("free");
  });

  test("no puede marcar en una lista a cargo de otro", async () => {
    const t = convexTest(schema, modules);
    const { muneca } = await familia(t);
    const otro = t.withIdentity(OTRO);
    await otro.mutation(api.lists.createManagedList, { forName: "Lucía" });
    await expect(otro.mutation(api.lists.claim, { itemId: muneca })).rejects.toThrow(/Elemento no encontrado/);
  });

  test("si quita algo que había marcado él, su marca se va sin copia", async () => {
    const t = convexTest(schema, modules);
    const { marta, abuela, lucia, puzle, muneca, fichaLucia } = await familia(t);
    await marta.mutation(api.lists.claim, { itemId: puzle });
    await abuela.mutation(api.lists.claim, { itemId: muneca });
    await marta.mutation(api.lists.removeItem, { id: puzle });
    await marta.mutation(api.lists.removeItem, { id: muneca });

    expect(await marta.query(api.lists.myGifts, {})).toEqual([]);
    const [deLucia] = await abuela.query(api.lists.forPerson, { personId: fichaLucia });
    expect(deLucia.removed).toMatchObject([{ title: "Muñeca de trapo" }]);
    expect(await marta.query(api.lists.managedItems, { listId: lucia })).toEqual([]);
  });

  test("«para…» de quien la lleva va con la ficha que le puso, no con otra", async () => {
    const t = convexTest(schema, modules);
    const { marta, lucia, puzle } = await familia(t);
    const suFicha = await marta.mutation(api.people.create, { name: "Lucía", relationship: "family", interests: [] });
    const otraFicha = await marta.mutation(api.people.create, { name: "Pablo", relationship: "family", interests: [] });
    const reyes = await marta.mutation(api.importantDates.create, {
      personId: suFicha, label: "Reyes", month: 1, day: 6, recurring: true,
    });
    const santo = await marta.mutation(api.importantDates.create, {
      personId: otraFicha, label: "Santo", month: 6, day: 29, recurring: true,
    });
    const claimId = await marta.mutation(api.lists.claim, { itemId: puzle });

    // Sin ficha puesta, ninguna fecha vale.
    await expect(
      marta.mutation(api.lists.setClaimOccasion, { claimId, importantDateId: reyes }),
    ).rejects.toMatchObject({ data: "Esa fecha no es de su ficha." });
    await marta.mutation(api.lists.linkManagedListPerson, { listId: lucia, personId: suFicha });
    await expect(
      marta.mutation(api.lists.setClaimOccasion, { claimId, importantDateId: santo }),
    ).rejects.toMatchObject({ data: "Esa fecha no es de su ficha." });
    await marta.mutation(api.lists.setClaimOccasion, { claimId, importantDateId: reyes });

    expect(
      (await marta.query(api.lists.managedItems, { listId: lucia })).find((i) => i._id === puzle)!.occasionLabel,
    ).toBe("Reyes");
    expect(await marta.query(api.lists.myGifts, {})).toMatchObject([
      { title: "Puzle de 500", forName: "Lucía", personName: "Lucía", occasionLabel: "Reyes" },
    ]);
    expect((await marta.query(api.exportData.mine, {})).marcasEnListasDeOtros).toMatchObject([
      { lista: "Lucía", paraOcasion: "Reyes" },
    ]);
  });
});

describe("listas a cargo: perder el acceso", () => {
  test("dejar la de Lucía borra solo las marcas de esa lista", async () => {
    const t = convexTest(schema, modules);
    const { marta, abuela, tio, deLucia, novela, muneca, coche, lucia, fichaMarta, fichaLuciaTio } = await familia(t);
    await abuela.mutation(api.lists.claim, { itemId: novela });
    await abuela.mutation(api.lists.claim, { itemId: muneca });
    await abuela.mutation(api.lists.claim, { itemId: coche });

    await abuela.mutation(api.lists.leave, { shareId: deLucia });

    const [deMarta] = await abuela.query(api.lists.forPerson, { personId: fichaMarta });
    expect(deMarta.items.find((i) => i._id === novela)!.state).toBe("mine");
    expect(titulos(await abuela.query(api.lists.myGifts, {}))).toEqual(["Coche teledirigido", "Novela negra"]);
    const [delTio] = await tio.query(api.lists.forPerson, { personId: fichaLuciaTio });
    expect(delTio.items.find((i) => i._id === muneca)!.state).toBe("free");
    expect((await marta.query(api.lists.managedItems, { listId: lucia })).every((i) => i.state === "free")).toBe(true);
  });

  test("quitarle el acceso a la de Pablo deja sus marcas en la de Marta", async () => {
    const t = convexTest(schema, modules);
    const { marta, abuela, dePablo, novela, coche } = await familia(t);
    await abuela.mutation(api.lists.claim, { itemId: novela });
    await abuela.mutation(api.lists.claim, { itemId: coche });

    await marta.mutation(api.lists.revoke, { shareId: dePablo });

    expect(titulos(await abuela.query(api.lists.myGifts, {}))).toEqual(["Novela negra"]);
    expect((await abuela.query(api.lists.sharedWithMe, {})).map((s) => s.forName ?? "").sort()).toEqual(["", "Lucía"]);
  });

  test("lo quitado de la de Lucía sale como copia en la ficha de Lucía, no en la de Marta", async () => {
    const t = convexTest(schema, modules);
    const { marta, abuela, muneca, fichaMarta, fichaLucia } = await familia(t);
    await abuela.mutation(api.lists.claim, { itemId: muneca });
    await marta.mutation(api.lists.removeItem, { id: muneca, reason: "got" });
    const [deLucia] = await abuela.query(api.lists.forPerson, { personId: fichaLucia });
    const [deMarta] = await abuela.query(api.lists.forPerson, { personId: fichaMarta });
    expect(deLucia.removed).toMatchObject([{ title: "Muñeca de trapo", reason: "got" }]);
    expect(deMarta.removed).toEqual([]);
  });

  test("compartir de vuelta desde la de Lucía comparte la propia de la abuela", async () => {
    const t = convexTest(schema, modules);
    const { marta, abuela, deLucia } = await familia(t);
    await abuela.mutation(api.lists.addItem, { title: "Mantita" });
    await abuela.mutation(api.lists.shareBack, { shareId: deLucia });
    expect((await abuela.query(api.lists.sharedWithMe, {})).every((s) => s.sharedBack)).toBe(true);
    expect(await marta.query(api.lists.sharedWithMe, {})).toMatchObject([
      { ownerName: "Carmen", listId: null, forName: null },
    ]);
  });
});

describe("listas a cargo: topes por lista", () => {
  const llenarLista = (t: T, listId: Id<"managedLists"> | undefined, n: number) =>
    t.run(async (ctx) => {
      for (let i = 0; i < n; i++) {
        await ctx.db.insert("listItems", {
          ownerClerkUserId: MARTA.subject,
          managedListId: listId,
          title: `Relleno ${i}`,
        });
      }
    });

  test(`${MAX_ITEMS_PER_LIST} elementos en cada una: la llena no frena a las otras`, async () => {
    const t = convexTest(schema, modules);
    const { marta, lucia, pablo } = await familia(t);
    await llenarLista(t, lucia, MAX_ITEMS_PER_LIST - 2);
    await expect(marta.mutation(api.lists.addItem, { title: "Una más", listId: lucia })).rejects.toMatchObject({
      data: "La lista de Lucía ya tiene 100 cosas, el máximo. Quita alguna para apuntar otra.",
    });
    await marta.mutation(api.lists.addItem, { title: "Cabe en la mía" });
    await marta.mutation(api.lists.addItem, { title: "Cabe en la de Pablo", listId: pablo });
    expect(await marta.query(api.lists.myItems, { listId: lucia })).toHaveLength(MAX_ITEMS_PER_LIST);
  });

  test("«Pegar una lista» respeta el tope de la lista elegida", async () => {
    const t = convexTest(schema, modules);
    const { marta, lucia } = await familia(t);
    await llenarLista(t, lucia, MAX_ITEMS_PER_LIST - 3);
    const filas = [{ title: "Uno" }, { title: "Dos" }];
    await expect(marta.mutation(api.lists.importItems, { items: filas, listId: lucia })).rejects.toThrow(
      /Cabe 1 más/,
    );
    // En la propia caben, y van a la propia.
    await marta.mutation(api.lists.importItems, { items: filas });
    expect(titulos(await marta.query(api.lists.myItems, {}))).toEqual(["Bufanda gris", "Dos", "Novela negra", "Uno"]);
    await marta.mutation(api.lists.importItems, { items: [{ title: "Tres" }], listId: lucia });
    expect((await marta.query(api.lists.myItems, { listId: lucia })).map((i) => i.title)).toContain("Tres");
  });

  test(`${MAX_READERS_PER_LIST} lectores en cada una`, async () => {
    const t = convexTest(schema, modules);
    const { marta, lucia } = await familia(t);
    // A mano y no con `invite`: el cupo diario de invitar es por persona, no
    // por lista, y Marta ya ha gastado cuatro.
    await t.run(async (ctx) => {
      for (let i = 0; i < MAX_READERS_PER_LIST - 2; i++) {
        await ctx.db.insert("listShares", {
          ownerClerkUserId: MARTA.subject,
          managedListId: lucia,
          readerClerkUserId: `user_lector_${i}`,
        });
      }
    });
    await expect(
      marta.mutation(api.lists.invite, { readerClerkUserId: "user_uno_mas", listId: lucia }),
    ).rejects.toMatchObject({
      data: "La lista de Lucía ya la ven 20 personas, el máximo. Quita a alguien para invitar a otra.",
    });
    await marta.mutation(api.lists.invite, { readerClerkUserId: "user_uno_mas" });
    expect(await marta.query(api.lists.myReaders, {})).toHaveLength(2);
  });

  test("la misma persona lee varias listas del mismo dueño, una fila por lista", async () => {
    const t = convexTest(schema, modules);
    const { marta, lucia, deLucia } = await familia(t);
    const otra = await marta.mutation(api.lists.invite, { readerClerkUserId: ABUELA.subject, listId: lucia });
    expect(otra).toEqual({ shareId: deLucia, emailed: false });
    expect(await t.run(async (ctx) => (await ctx.db.query("listShares").collect()).length)).toBe(4);
  });
});

describe("listas a cargo: borrarlas", () => {
  test("borrar la de Lucía se lleva sus cosas, fotos, accesos, marcas, copias y nota, y nada más", async () => {
    const t = convexTest(schema, modules);
    const { marta, abuela, tio, lucia, pablo, muneca, puzle, novela, coche, fichaLucia, fichaMarta } =
      await familia(t);
    await marta.mutation(api.lists.generatePhotoUploadUrl, {});
    const foto = await subir(t, "image/jpeg");
    await marta.mutation(api.lists.setItemPhoto, { id: puzle, storageId: foto });
    await abuela.mutation(api.lists.claim, { itemId: muneca });
    await marta.mutation(api.lists.removeItem, { id: muneca });
    const marcaTio = await tio.mutation(api.lists.claim, { itemId: puzle });
    await abuela.mutation(api.lists.claim, { itemId: novela });
    await abuela.mutation(api.lists.claim, { itemId: coche });
    await abuela.mutation(api.giftHistory.create, {
      personId: fichaLucia, giftName: "Muñeca de trapo", occasionLabel: "Reyes", reaction: "loved",
    });

    await marta.mutation(api.lists.deleteManagedList, { listId: lucia });

    expect(await existe(t, foto)).toBe(false);
    const quedan = await t.run(async (ctx) => ({
      lista: await ctx.db.get(lucia),
      items: (await ctx.db.query("listItems").collect()).filter((i) => i.managedListId === lucia),
      shares: (await ctx.db.query("listShares").collect()).filter((s) => s.managedListId === lucia),
      claims: (await ctx.db.query("listClaims").collect()).filter((c) => c.managedListId === lucia),
      about: (await ctx.db.query("listAbout").collect()).filter((a) => a.managedListId === lucia),
      marcaTio: await ctx.db.get(marcaTio),
    }));
    expect(quedan).toEqual({ lista: null, items: [], shares: [], claims: [], about: [], marcaTio: null });

    // Lo demás sigue igual.
    expect(titulos(await marta.query(api.lists.myItems, {}))).toEqual(["Bufanda gris", "Novela negra"]);
    expect(await marta.query(api.lists.myManagedLists, {})).toMatchObject([{ listId: pablo, itemCount: 2 }]);
    expect(await marta.query(api.lists.myAbout, {})).toBe("Talla M");
    expect(titulos(await abuela.query(api.lists.myGifts, {}))).toEqual(["Coche teledirigido", "Novela negra"]);
    expect(await abuela.query(api.lists.forPerson, { personId: fichaLucia })).toEqual([]);
    expect(await abuela.query(api.lists.forPerson, { personId: fichaMarta })).toHaveLength(1);
    expect(await tio.query(api.lists.sharedWithMe, {})).toEqual([]);
    // Lo que la abuela pasó a su historial se queda.
    expect(await abuela.query(api.giftHistory.getByPerson, { personId: fichaLucia })).toHaveLength(1);
  });
});

describe("listas a cargo: borrar la cuenta", () => {
  test("la de quien las lleva se las lleva todas, con accesos, marcas y copias", async () => {
    const t = convexTest(schema, modules);
    const { marta, abuela, tio, muneca, puzle, coche, fichaLucia } = await familia(t);
    await abuela.mutation(api.lists.claim, { itemId: muneca });
    await marta.mutation(api.lists.removeItem, { id: muneca });
    await tio.mutation(api.lists.claim, { itemId: puzle });
    await marta.mutation(api.lists.claim, { itemId: coche });
    await abuela.mutation(api.giftHistory.create, {
      personId: fichaLucia, giftName: "Muñeca de trapo", occasionLabel: "Reyes", reaction: "loved",
    });

    await marta.mutation(api.account.deleteMyAccount, {});

    const quedan = await t.run(async (ctx) => ({
      listas: await ctx.db.query("managedLists").collect(),
      items: await ctx.db.query("listItems").collect(),
      shares: await ctx.db.query("listShares").collect(),
      claims: await ctx.db.query("listClaims").collect(),
      about: await ctx.db.query("listAbout").collect(),
    }));
    expect(quedan).toEqual({ listas: [], items: [], shares: [], claims: [], about: [] });
    expect(await abuela.query(api.lists.sharedWithMe, {})).toEqual([]);
    expect(await abuela.query(api.giftHistory.getByPerson, { personId: fichaLucia })).toHaveLength(1);
  });

  test("la de un lector se lleva sus accesos y marcas en todas, y nada de las listas", async () => {
    const t = convexTest(schema, modules);
    const { marta, abuela, tio, lucia, muneca, puzle, novela, coche, fichaLuciaTio } = await familia(t);
    await abuela.mutation(api.lists.claim, { itemId: muneca });
    await abuela.mutation(api.lists.claim, { itemId: novela });
    await abuela.mutation(api.lists.claim, { itemId: coche });
    await tio.mutation(api.lists.claim, { itemId: puzle });

    await abuela.mutation(api.account.deleteMyAccount, {});

    const quedan = await t.run(async (ctx) => ({
      shares: (await ctx.db.query("listShares").collect()).map((s) => s.readerClerkUserId),
      claims: (await ctx.db.query("listClaims").collect()).map((c) => c.readerClerkUserId),
    }));
    expect(quedan).toEqual({ shares: [TIO.subject], claims: [TIO.subject] });
    expect(await marta.query(api.lists.myManagedLists, {})).toHaveLength(2);
    expect((await marta.query(api.lists.managedItems, { listId: lucia })).map((i) => i.state).sort()).toEqual([
      "free",
      "taken",
    ]);
    const [delTio] = await tio.query(api.lists.forPerson, { personId: fichaLuciaTio });
    expect(delTio.items.find((i) => i._id === puzle)!.state).toBe("mine");
  });
});

describe("listas a cargo: exportación", () => {
  test("la de quien las lleva trae cada una con elementos y lectores, y ninguna marca", async () => {
    const t = convexTest(schema, modules);
    const { marta, abuela, tio, lucia, muneca, puzle, coche, novela } = await familia(t);
    const suFicha = await marta.mutation(api.people.create, { name: "Lucía", relationship: "family", interests: [] });
    await marta.mutation(api.lists.linkManagedListPerson, { listId: lucia, personId: suFicha });
    await abuela.mutation(api.lists.claim, { itemId: muneca });
    await tio.mutation(api.lists.claim, { itemId: puzle });
    await abuela.mutation(api.lists.claim, { itemId: coche });
    await abuela.mutation(api.lists.claim, { itemId: novela });

    const datos = await marta.query(api.exportData.mine, {});
    expect(datos.miLista.elementos.map((e) => e.titulo).sort()).toEqual(["Bufanda gris", "Novela negra"]);
    expect(datos.miLista.compartidaCon.map((c) => c.clerkUserId)).toEqual([ABUELA.subject]);
    expect(datos.miLista.notaParaQuienTeRegala).toBe("Talla M");
    const porNombre = [...datos.listasQueLlevas].sort((a, b) => a.paraQuien.localeCompare(b.paraQuien));
    expect(porNombre).toMatchObject([
      { paraQuien: "Lucía", fichaEnTuLibreta: "Lucía", nota: "Talla 7 años", cumpleanos: { mes: 5, dia: 2 } },
      { paraQuien: "Pablo", fichaEnTuLibreta: null, nota: "Le encantan los dinosaurios" },
    ]);
    expect(porNombre[0].elementos.map((e) => e.titulo).sort()).toEqual(["Muñeca de trapo", "Puzle de 500"]);
    expect(porNombre[0].elementos.find((e) => e.titulo === "Muñeca de trapo")).toMatchObject({
      loQueMasIlusionTeHaria: true,
    });
    expect(porNombre[0].compartidaCon.map((c) => c.clerkUserId).sort()).toEqual(
      [ABUELA.subject, TIO.subject].sort(),
    );
    expect(datos.marcasEnListasDeOtros).toEqual([]);
    const json = JSON.stringify(datos);
    for (const rastro of ["lo regalo yo", "regalado", "marked", "taken"]) {
      expect(json).not.toContain(rastro);
    }
  });

  test("las marcas de quien la lleva salen como suyas, con para quién es", async () => {
    const t = convexTest(schema, modules);
    const { marta, puzle } = await familia(t);
    const antes = (await marta.query(api.exportData.mine, {})).listasQueLlevas;
    await marta.mutation(api.lists.claim, { itemId: puzle });
    const datos = await marta.query(api.exportData.mine, {});
    expect(datos.marcasEnListasDeOtros).toMatchObject([
      { lista: "Lucía", elemento: "Puzle de 500", estado: "lo regalo yo", sigueEnSuLista: true },
    ]);
    expect(datos.listasQueLlevas).toEqual(antes);
  });

  test("la del lector trae sus marcas y para quién es cada lista", async () => {
    const t = convexTest(schema, modules);
    const { abuela, muneca, novela } = await familia(t);
    await abuela.mutation(api.lists.claim, { itemId: muneca });
    await abuela.mutation(api.lists.claim, { itemId: novela });
    const datos = await abuela.query(api.exportData.mine, {});
    expect(
      datos.listasQueTeComparten.map((l) => `${l.de}|${l.paraQuien}|${l.fichaAsociada}`).sort(),
    ).toEqual(["Marta|Lucía|Lucía", "Marta|Pablo|Pablo", "Marta|null|Marta"]);
    expect(datos.marcasEnListasDeOtros.map((m) => `${m.lista}|${m.elemento}`).sort()).toEqual([
      "Lucía|Muñeca de trapo",
      "null|Novela negra",
    ]);
    expect(datos.listasQueLlevas).toEqual([]);
  });
});

describe("listas a cargo: correos", () => {
  const avisos = (t: T) =>
    t.run(async (ctx) =>
      (await ctx.db.system.query("_scheduled_functions").collect()).filter((f) =>
        f.name.includes("sendListInviteEmail"),
      ),
    );

  test("la invitación no lleva para quién es, y sale una por pareja cada 30 días", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-02T10:00:00Z"));
    const t = convexTest(schema, modules);
    await t.withIdentity(ABUELA).mutation(api.settings.ensureDefaults, {});
    const marta = t.withIdentity(MARTA);
    const lucia = await marta.mutation(api.lists.createManagedList, { forName: "Lucía" });
    const pablo = await marta.mutation(api.lists.createManagedList, { forName: "Pablo" });
    await marta.mutation(api.lists.addItem, { title: "Muñeca de trapo", listId: lucia });

    const primera = await marta.mutation(api.lists.invite, { readerClerkUserId: ABUELA.subject, listId: lucia });
    const segunda = await marta.mutation(api.lists.invite, { readerClerkUserId: ABUELA.subject, listId: pablo });
    const propia = await marta.mutation(api.lists.invite, { readerClerkUserId: ABUELA.subject });
    expect([primera.emailed, segunda.emailed, propia.emailed]).toEqual([true, false, false]);

    const programados = await avisos(t);
    expect(programados).toHaveLength(1);
    expect(programados[0].args[0]).toEqual({
      to: ABUELA.email,
      ownerName: "Marta",
      ownerEmail: MARTA.email,
      managed: true,
    });
    const correo = buildListInviteEmail(programados[0].args[0]);
    for (const dato of ["Lucía", "Muñeca"]) {
      expect(JSON.stringify(programados[0].args)).not.toContain(dato);
      expect(correo.subject + correo.html).not.toContain(dato);
    }
    expect(correo.subject).toBe("Marta te ha compartido una lista en PickPal");

    // Pasado el plazo, la siguiente lista sí avisa.
    vi.setSystemTime(new Date(Date.now() + INVITE_EMAIL_COOLDOWN_MS + 60_000));
    const hugo = await marta.mutation(api.lists.createManagedList, { forName: "Hugo" });
    const tercera = await marta.mutation(api.lists.invite, { readerClerkUserId: ABUELA.subject, listId: hugo });
    expect(tercera.emailed).toBe(true);
    expect(await avisos(t)).toHaveLength(2);
  });

  test("el correo de la fecha cuenta solo la lista guardada en esa ficha, en cifras", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-04-25T08:00:00Z"));
    const t = convexTest(schema, modules);
    const { abuela, muneca, novela, coche, fichaLucia } = await familia(t);
    await abuela.mutation(api.importantDates.create, {
      personId: fichaLucia, label: "Cumpleaños", month: 5, day: 2, recurring: true,
    });
    await abuela.mutation(api.settings.setMine, { emailNotificationsEnabled: true, emailNotifyDaysBefore: [7] });
    const evento = async () =>
      (await t.query(internal.notifications.findEventsNeedingEmail, {}))[0].events[0];

    expect(await evento()).toMatchObject({ personName: "Lucía", listUnclaimed: 2 });
    expect(await evento()).not.toHaveProperty("listMine");
    // Lo marcado en la lista de Marta o en la de Pablo no cuenta aquí.
    await abuela.mutation(api.lists.claim, { itemId: novela });
    await abuela.mutation(api.lists.claim, { itemId: coche });
    expect(await evento()).toMatchObject({ listUnclaimed: 2 });
    expect(await evento()).not.toHaveProperty("listMine");
    await abuela.mutation(api.lists.claim, { itemId: muneca });
    expect(await evento()).toMatchObject({ listUnclaimed: 1, listMine: 1 });
    expect(JSON.stringify(await evento())).not.toContain("Muñeca");
  });
});

describe("listas a cargo: el recordatorio de quien la lleva", () => {
  test("suma las cifras de la lista que asoció a su ficha, y solo las suyas", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-04-25T08:00:00Z"));
    const t = convexTest(schema, modules);
    const { marta, abuela, muneca, puzle, lucia } = await familia(t);
    const fichaLucia = await marta.mutation(api.people.create, { name: "Lucía", relationship: "family", interests: [] });
    await marta.mutation(api.importantDates.create, {
      personId: fichaLucia, label: "Cumpleaños", month: 5, day: 2, recurring: true,
    });
    await marta.mutation(api.settings.setMine, { emailNotificationsEnabled: true, emailNotifyDaysBefore: [7] });
    const evento = async () => {
      const todos = await t.query(internal.notifications.findEventsNeedingEmail, {});
      return todos.find((u) => u.clerkUserId === MARTA.subject)?.events[0];
    };

    // Sin asociar la lista a la ficha, no hay cifras.
    expect(await evento()).not.toHaveProperty("listUnclaimed");
    await marta.mutation(api.lists.linkManagedListPerson, { listId: lucia, personId: fichaLucia });
    expect(await evento()).toMatchObject({ personName: "Lucía", listUnclaimed: 2 });
    expect(await evento()).not.toHaveProperty("listMine");

    // Lo que marca un lector (la abuela) ya no está libre, pero no es suyo.
    await abuela.mutation(api.lists.claim, { itemId: muneca });
    expect(await evento()).toMatchObject({ listUnclaimed: 1 });
    expect(await evento()).not.toHaveProperty("listMine");

    // Lo que marca ella sí cuenta como suyo.
    await marta.mutation(api.lists.claim, { itemId: puzle });
    expect(await evento()).toMatchObject({ listMine: 1 });
    expect(await evento()).not.toHaveProperty("listUnclaimed");
    expect(JSON.stringify(await evento())).not.toContain("Puzle");
  });

  test("la lista propia de Marta y la de Pablo no suman a la ficha de Lucía", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-04-25T08:00:00Z"));
    const t = convexTest(schema, modules);
    const { marta, lucia } = await familia(t);
    const fichaLucia = await marta.mutation(api.people.create, { name: "Lucía", relationship: "family", interests: [] });
    await marta.mutation(api.importantDates.create, {
      personId: fichaLucia, label: "Cumpleaños", month: 5, day: 2, recurring: true,
    });
    await marta.mutation(api.settings.setMine, { emailNotificationsEnabled: true, emailNotifyDaysBefore: [7] });
    await marta.mutation(api.lists.linkManagedListPerson, { listId: lucia, personId: fichaLucia });
    const todos = await t.query(internal.notifications.findEventsNeedingEmail, {});
    const evento = todos.find((u) => u.clerkUserId === MARTA.subject)!.events[0];
    expect(evento.listUnclaimed).toBe(2);
  });
});

describe("listas a cargo: bloquear", () => {
  test("bloquear desde la de Lucía vale para las listas que Marta comparta después", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-02T10:00:00Z"));
    const t = convexTest(schema, modules);
    const { marta, abuela, deLucia, lucia } = await familia(t);

    await abuela.mutation(api.lists.leaveAndBlock, { shareId: deLucia });
    const hugo = await marta.mutation(api.lists.createManagedList, { forName: "Hugo" });
    const aHugo = await marta.mutation(api.lists.invite, { readerClerkUserId: ABUELA.subject, listId: hugo });
    await marta.mutation(api.lists.invite, { readerClerkUserId: ABUELA.subject, listId: lucia });

    // A Marta le sale como un lector más.
    expect((await marta.query(api.lists.myReaders, { listId: hugo })).map((r) => r.shareId)).toEqual([
      aHugo.shareId,
    ]);
    // A la abuela no le llegan; las que ya tenía y no dejó siguen ahí.
    const visibles = async () =>
      (await abuela.query(api.lists.sharedWithMe, {})).map((s) => s.forName ?? "").sort();
    expect(await visibles()).toEqual(["", "Pablo"]);
    await expect(abuela.mutation(api.lists.leave, { shareId: aHugo.shareId })).rejects.toMatchObject({
      data: "Lista no encontrada.",
    });

    // Desbloquear destapa todas las que le volvió a compartir.
    const [bloqueo] = await abuela.query(api.lists.myBlocks, {});
    await abuela.mutation(api.lists.unblock, { blockId: bloqueo.blockId });
    expect(await visibles()).toEqual(["", "Hugo", "Lucía", "Pablo"]);
  });
});

describe("listas a cargo: lo que no cambia", () => {
  test("ninguna función de gestionar listas lee las marcas, salvo managedItems y borrar la lista", () => {
    const fuente = fs.readFileSync("convex/lists.ts", "utf8");
    const sinComentarios = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    for (const nombre of [
      "myManagedLists", "managedList", "createManagedList", "renameManagedList", "linkManagedListPerson",
    ]) {
      const inicio = fuente.indexOf(`export const ${nombre} = `);
      expect(inicio, `${nombre} no está en convex/lists.ts`).toBeGreaterThan(-1);
      const fin = fuente.indexOf("\nexport ", inicio + 1);
      const cuerpo = sinComentarios(fuente.slice(inicio, fin === -1 ? undefined : fin));
      expect(cuerpo, nombre).not.toMatch(/listClaims|claimOf|deleteClaimsBetween/);
    }
  });

  // Tosco, como los de arriba: los índices solo por dueño ya no existen, y
  // esto vigila que ninguna lectura vuelva a pedir «todo lo del dueño» fuera
  // del borrado de la cuenta, que lo hace a propósito.
  test("ninguna lectura por dueño se queda sin la lista", () => {
    const fuente = fs.readFileSync("convex/lists.ts", "utf8");
    const antesDelBorrado = fuente.slice(0, fuente.indexOf("export async function deleteListDataForUser"));
    const lecturas = [...antesDelBorrado.matchAll(/withIndex\("(?:by_owner_and_list|by_owner_list_reader)", \(q\) =>\s*q\s*\.eq\("ownerClerkUserId", [^)]*\)(\s*\.eq\("(\w+)")?/g)];
    expect(lecturas.length).toBeGreaterThan(5);
    for (const l of lecturas) expect(l[2], l[0]).toBe("managedListId");
    const exportacion = fs.readFileSync("convex/exportData.ts", "utf8");
    for (const l of exportacion.matchAll(/withIndex\("(?:by_owner_and_list|by_owner_list_reader)", \(q\) =>\s*q\s*\.eq\("ownerClerkUserId", [^)]*\)(\s*\.eq\("(\w+)")?/g)) {
      expect(l[2], l[0]).toBe("managedListId");
    }
  });

  test("el generador de ideas no lee nada de las listas", () => {
    const ruta = fs.readFileSync("src/app/api/recommendations/route.ts", "utf8");
    expect(ruta).not.toMatch(/api\.lists\.|listItems|listShares|listClaims|listAbout|managedList/);
  });
});
