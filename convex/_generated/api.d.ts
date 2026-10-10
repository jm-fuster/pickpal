/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as account from "../account.js";
import type * as auth from "../auth.js";
import type * as crons from "../crons.js";
import type * as emails from "../emails.js";
import type * as exportData from "../exportData.js";
import type * as giftHistory from "../giftHistory.js";
import type * as importantDates from "../importantDates.js";
import type * as lists from "../lists.js";
import type * as migrations from "../migrations.js";
import type * as notifications from "../notifications.js";
import type * as people from "../people.js";
import type * as personShares from "../personShares.js";
import type * as rateLimit from "../rateLimit.js";
import type * as recommendationUsage from "../recommendationUsage.js";
import type * as recommendations from "../recommendations.js";
import type * as savedIdeas from "../savedIdeas.js";
import type * as settings from "../settings.js";
import type * as validators from "../validators.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  account: typeof account;
  auth: typeof auth;
  crons: typeof crons;
  emails: typeof emails;
  exportData: typeof exportData;
  giftHistory: typeof giftHistory;
  importantDates: typeof importantDates;
  lists: typeof lists;
  migrations: typeof migrations;
  notifications: typeof notifications;
  people: typeof people;
  personShares: typeof personShares;
  rateLimit: typeof rateLimit;
  recommendationUsage: typeof recommendationUsage;
  recommendations: typeof recommendations;
  savedIdeas: typeof savedIdeas;
  settings: typeof settings;
  validators: typeof validators;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
