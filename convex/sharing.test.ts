/// <reference types="vite/client" />
// @vitest-environment edge-runtime

// Compartir personas convierte la propiedad de `people` en muchos-a-muchos
// (docs/dudas.md → "Compartir personas entre usuarios"). Estos tests cubren
// las diez decisiones que importan a nivel de datos: quién ve qué, quién
// puede borrar, cómo se sale, y qué pasa cuando quien creó la ficha se va.

import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { INVITE_LOOKUP_DAILY_LIMIT } from "./personShares";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

const ALICE = { subject: "user_alice", issuer: "https://test.clerk.dev" };
const BOB = { subject: "user_bob", issuer: "https://test.clerk.dev" };
const CAROL = { subject: "user_carol", issuer: "https://test.clerk.dev" };

const PERSON = {
  name: "Marta",
  relationship: "family",
  interests: ["cerámica"],
};

async function crearYCompartir(t: ReturnType<typeof convexTest>) {
  const alice = t.withIdentity(ALICE);
  const personId = await alice.mutation(api.people.create, PERSON);
  await alice.mutation(api.personShares.invite, {
    personId,
    clerkUserId: BOB.subject,
  });
  return personId;
}

/** Una tanda de la IA de `who` para Marta, con una sola idea. */
async function generar(
  t: ReturnType<typeof convexTest>,
  who: typeof ALICE,
  personId: Id<"people">,
  title: string,
) {
  await t.withIdentity(who).mutation(api.recommendations.upsert, {
    personId,
    occasionLabel: "Cumpleaños",
    giftType: "fisica",
    ideas: [
      {
        title,
        description: "Para su taller",
        priceMinEuros: 30,
        priceMaxEuros: 45,
        category: "ceramica",
        amazonQuery: "rodillo ceramica",
      },
    ],
  });
}

const titulosGenerados = (tandas: { ideas: { title: string }[] }[]) =>
  tandas.flatMap((tanda) => tanda.ideas.map((i) => i.title));

const autoresDeTandas = (t: ReturnType<typeof convexTest>) =>
  t.run(async (ctx) =>
    (await ctx.db.query("recommendations").collect()).map((r) => r.clerkUserId).sort(),
  );

describe("ver la ficha", () => {
  test("el invitado la ve entera", async () => {
    const t = convexTest(schema, modules);
    const personId = await crearYCompartir(t);

    const vista = await t.withIdentity(BOB).query(api.people.getById, { id: personId });
    expect(vista?.name).toBe("Marta");
  });

  test("un tercero sin invitar sigue sin verla", async () => {
    const t = convexTest(schema, modules);
    const personId = await crearYCompartir(t);

    const vista = await t.withIdentity(CAROL).query(api.people.getById, { id: personId });
    expect(vista).toBeNull();
  });

  test("aparece en la lista del invitado, no en la de un tercero", async () => {
    const t = convexTest(schema, modules);
    const personId = await crearYCompartir(t);

    const deBob = await t.withIdentity(BOB).query(api.people.getAll, {});
    const deCarol = await t.withIdentity(CAROL).query(api.people.getAll, {});
    expect(deBob.map((p) => p._id)).toContain(personId);
    expect(deCarol).toHaveLength(0);
  });

  test("el invitado puede editar la ficha compartida", async () => {
    const t = convexTest(schema, modules);
    const personId = await crearYCompartir(t);

    await t.withIdentity(BOB).mutation(api.people.update, {
      id: personId,
      notes: "Le encanta el senderismo",
    });
    const vista = await t.withIdentity(ALICE).query(api.people.getById, { id: personId });
    expect(vista?.notes).toBe("Le encanta el senderismo");
  });
});

describe("borrar solo lo permite quien la creó", () => {
  test("el invitado no puede borrar la ficha", async () => {
    const t = convexTest(schema, modules);
    const personId = await crearYCompartir(t);

    await expect(
      t.withIdentity(BOB).mutation(api.people.remove, { id: personId }),
    ).rejects.toThrow(/no encontrada/i);

    expect(
      await t.withIdentity(ALICE).query(api.people.getById, { id: personId }),
    ).not.toBeNull();
  });

  test("quien la creó sí puede borrarla, aunque esté compartida", async () => {
    const t = convexTest(schema, modules);
    const personId = await crearYCompartir(t);

    await t.withIdentity(ALICE).mutation(api.people.remove, { id: personId });

    expect(
      await t.withIdentity(BOB).query(api.people.getById, { id: personId }),
    ).toBeNull();
  });
});

describe("invitar", () => {
  test("solo quien creó la ficha puede invitar", async () => {
    const t = convexTest(schema, modules);
    const personId = await crearYCompartir(t);

    await expect(
      t.withIdentity(BOB).mutation(api.personShares.invite, {
        personId,
        clerkUserId: CAROL.subject,
      }),
    ).rejects.toThrow(/solo quien creó/i);
  });

  test("no puedes invitarte a ti mismo", async () => {
    const t = convexTest(schema, modules);
    const alice = t.withIdentity(ALICE);
    const personId = await alice.mutation(api.people.create, PERSON);

    await expect(
      alice.mutation(api.personShares.invite, {
        personId,
        clerkUserId: ALICE.subject,
      }),
    ).rejects.toThrow();
  });

  test("invitar dos veces a la misma persona no duplica el acceso", async () => {
    const t = convexTest(schema, modules);
    const personId = await crearYCompartir(t);

    await t.withIdentity(ALICE).mutation(api.personShares.invite, {
      personId,
      clerkUserId: BOB.subject,
    });

    const miembros = await t
      .withIdentity(ALICE)
      .query(api.personShares.listMembers, { personId });
    expect(miembros.invitees).toHaveLength(1);
  });
});

describe("comprobar un email antes de invitar", () => {
  // La ruta de compartir dice si un email tiene cuenta. Este paso previo
  // impide usarla para averiguarlo sin límite (docs/security.md §9).
  test("solo quien creó la ficha puede hacerlo", async () => {
    const t = convexTest(schema, modules);
    const personId = await crearYCompartir(t);

    await expect(
      t.withIdentity(BOB).mutation(api.personShares.reserveInviteLookup, {
        personId,
      }),
    ).rejects.toThrow(/solo quien creó/i);
    await expect(
      t.withIdentity(CAROL).mutation(api.personShares.reserveInviteLookup, {
        personId,
      }),
    ).rejects.toThrow(/solo quien creó/i);
  });

  test("cada comprobación gasta cupo, y el cupo diario tiene tope", async () => {
    const t = convexTest(schema, modules);
    const alice = t.withIdentity(ALICE);
    const personId = await alice.mutation(api.people.create, PERSON);

    for (let i = 0; i < INVITE_LOOKUP_DAILY_LIMIT; i++) {
      await alice.mutation(api.personShares.reserveInviteLookup, { personId });
    }
    await expect(
      alice.mutation(api.personShares.reserveInviteLookup, { personId }),
    ).rejects.toThrow(/límite diario/i);
  });
});

describe("desligarse", () => {
  test("el invitado deja de ver la ficha, que sigue existiendo para el resto", async () => {
    const t = convexTest(schema, modules);
    const personId = await crearYCompartir(t);

    await t.withIdentity(BOB).mutation(api.personShares.leave, { personId });

    expect(
      await t.withIdentity(BOB).query(api.people.getById, { id: personId }),
    ).toBeNull();
    expect(
      await t.withIdentity(ALICE).query(api.people.getById, { id: personId }),
    ).not.toBeNull();
  });

  test("no puedes desligarte de una ficha que no te han compartido", async () => {
    const t = convexTest(schema, modules);
    const personId = await crearYCompartir(t);

    await expect(
      t.withIdentity(CAROL).mutation(api.personShares.leave, { personId }),
    ).rejects.toThrow();
  });
});

describe("qué se comparte y qué no", () => {
  test("las tandas generadas por cada uno siguen siendo privadas", async () => {
    const t = convexTest(schema, modules);
    const personId = await crearYCompartir(t);
    const key = { personId, occasionLabel: "Cumpleaños", giftType: "fisica" };
    const IDEA = {
      title: "Rodillo de cerámica",
      description: "Para su taller",
      priceMinEuros: 30,
      priceMaxEuros: 45,
      category: "ceramica",
      amazonQuery: "rodillo ceramica",
    };

    await t.withIdentity(ALICE).mutation(api.recommendations.upsert, {
      ...key,
      ideas: [IDEA],
    });

    // Bob tiene acceso a la persona, pero no a la tanda de Alice: la suya
    // (si genera) es una fila aparte, indexada también por su clerkUserId.
    const deBob = await t.withIdentity(BOB).query(api.recommendations.getByPersonOccasion, key);
    expect(deBob).toBeNull();

    await t.withIdentity(BOB).mutation(api.recommendations.upsert, {
      ...key,
      ideas: [{ ...IDEA, title: "Otra idea" }],
    });
    const deAliceTrasBob = await t
      .withIdentity(ALICE)
      .query(api.recommendations.getByPersonOccasion, key);
    // La de Alice no se ha visto tocada por que Bob genere la suya.
    expect(deAliceTrasBob?.ideas.map((i) => i.title)).toEqual(["Rodillo de cerámica"]);
  });

  test("la exportación lleva solo tus tandas, también las de fichas que te comparten", async () => {
    const t = convexTest(schema, modules);
    const personId = await crearYCompartir(t);
    await generar(t, ALICE, personId, "Idea de Alice");
    await generar(t, BOB, personId, "Idea privada de Bob");

    const deAlice = await t.withIdentity(ALICE).query(api.exportData.mine, {});
    expect(titulosGenerados(deAlice.seresQueridos[0].ideasGeneradasPorLaIA)).toEqual(["Idea de Alice"]);

    const deBob = await t.withIdentity(BOB).query(api.exportData.mine, {});
    expect(deBob.seresQueridos).toHaveLength(0);
    expect(titulosGenerados(deBob.fichasQueTeComparten[0].ideasGeneradasPorLaIA)).toEqual([
      "Idea privada de Bob",
    ]);
  });

  test("desligarte borra tus tandas de esa ficha y deja las del resto", async () => {
    const t = convexTest(schema, modules);
    const personId = await crearYCompartir(t);
    await generar(t, ALICE, personId, "Idea de Alice");
    await generar(t, BOB, personId, "Idea privada de Bob");

    await t.withIdentity(BOB).mutation(api.personShares.leave, { personId });

    expect(await autoresDeTandas(t)).toEqual([ALICE.subject]);
  });

  test("borrar la cuenta se lleva tus tandas, también de la ficha que pasa a otro", async () => {
    const t = convexTest(schema, modules);
    const personId = await crearYCompartir(t);
    await generar(t, ALICE, personId, "Idea de Alice");
    await generar(t, BOB, personId, "Idea privada de Bob");

    // Alice se va: Marta pasa a Bob, pero las ideas que pidió Alice no.
    await t.withIdentity(ALICE).mutation(api.account.deleteMyAccount, {});
    expect(await autoresDeTandas(t)).toEqual([BOB.subject]);
    const deBob = await t.withIdentity(BOB).query(api.exportData.mine, {});
    expect(titulosGenerados(deBob.seresQueridos[0].ideasGeneradasPorLaIA)).toEqual([
      "Idea privada de Bob",
    ]);

    // Y si la invitada se va, igual con las suyas en la ficha de otro.
    await t.withIdentity(BOB).mutation(api.personShares.invite, {
      personId,
      clerkUserId: CAROL.subject,
    });
    await generar(t, CAROL, personId, "Idea de Carol");
    await t.withIdentity(CAROL).mutation(api.account.deleteMyAccount, {});
    expect(await autoresDeTandas(t)).toEqual([BOB.subject]);
  });

  test("las ideas guardadas sí se comparten, con autoría", async () => {
    const t = convexTest(schema, modules);
    const personId = await crearYCompartir(t);

    await t.withIdentity(ALICE).mutation(api.savedIdeas.save, {
      personId,
      occasionLabel: "Cumpleaños",
      title: "Rodillo de cerámica",
      description: "Para su taller",
      priceMinEuros: 30,
      priceMaxEuros: 45,
      category: "ceramica",
      amazonQuery: "rodillo ceramica",
    });

    const vistasPorBob = await t.withIdentity(BOB).query(api.savedIdeas.getByPerson, { personId });
    expect(vistasPorBob).toHaveLength(1);
    expect(vistasPorBob[0].clerkUserId).toBe(ALICE.subject);
  });

  test("el historial de regalos es conjunto, con autoría", async () => {
    const t = convexTest(schema, modules);
    const personId = await crearYCompartir(t);

    await t.withIdentity(BOB).mutation(api.giftHistory.create, {
      personId,
      giftName: "Libro de setas",
      occasionLabel: "Cumpleaños",
      year: 2025,
      reaction: "loved",
    });

    const vistoPorAlice = await t.withIdentity(ALICE).query(api.giftHistory.getByPerson, { personId });
    expect(vistoPorAlice).toHaveLength(1);
    expect(vistoPorAlice[0].clerkUserId).toBe(BOB.subject);

    // Cualquiera con acceso puede corregir o quitar la entrada, no solo quien
    // la registró: es un historial conjunto, no una lista de tareas propia.
    await t.withIdentity(ALICE).mutation(api.giftHistory.remove, { id: vistoPorAlice[0]._id });
    expect(await t.withIdentity(BOB).query(api.giftHistory.getByPerson, { personId })).toHaveLength(0);
  });
});
