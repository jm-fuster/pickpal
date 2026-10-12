"use client";

import { use } from "react";
import { useAuth } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "../../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../../convex/_generated/dataModel";
import { ImportListView } from "@/components/lista/ImportListView";

/** «Pegar una lista» para una lista que llevas (docs/encargo-listas-ninos.md). */
export default function ImportManagedListPage({ params }: { params: Promise<{ listId: string }> }) {
  const { listId: raw } = use(params);
  const listId = raw as Id<"managedLists">;
  const { isLoaded, isSignedIn } = useAuth();
  const list = useQuery(api.lists.managedList, isLoaded && isSignedIn ? { listId } : "skip");
  if (list === undefined) return null;
  return <ImportListView listId={listId} forName={list.forName} />;
}
