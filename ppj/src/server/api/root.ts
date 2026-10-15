import { accountRouter } from "~/server/api/routers/account";
import { backupRouter } from "~/server/api/routers/backup";
import { itineraryRouter } from "~/server/api/routers/itinerary";
import { masterRouter } from "~/server/api/routers/master";
import { placeRouter } from "~/server/api/routers/place";
import {
  categoriesRouter,
  colorsRouter,
  settingsRouter,
} from "~/server/api/routers/reference";
import { reviewRouter } from "~/server/api/routers/review";
import { tagRouter } from "~/server/api/routers/tag";
import { usersRouter } from "~/server/api/routers/users";
import { visitRouter } from "~/server/api/routers/visit";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";

export const appRouter = createTRPCRouter({
  account: accountRouter,
  users: usersRouter,
  categories: categoriesRouter,
  colors: colorsRouter,
  settings: settingsRouter,
  master: masterRouter,
  place: placeRouter,
  review: reviewRouter,
  tag: tagRouter,
  visit: visitRouter,
  itinerary: itineraryRouter,
  backup: backupRouter,
});

export type AppRouter = typeof appRouter;
export const createCaller = createCallerFactory(appRouter);
