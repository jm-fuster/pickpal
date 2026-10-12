import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.cron(
  "send daily birthday email reminders",
  "0 8 * * *",
  internal.emails.runDailyEmailNotifications,
  {},
);

// Fotos de «Mi lista» subidas que no acabaron en ningún elemento
// (`lists.sweepOrphanPhotos`).
crons.cron(
  "delete list photos that no item uses",
  "30 3 * * *",
  internal.lists.sweepOrphanPhotos,
  {},
);

export default crons;
