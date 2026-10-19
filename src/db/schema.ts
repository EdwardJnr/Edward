import {
  boolean,
  date,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import type { BrandProfile } from "@/lib/schemas";

export const contentStatus = pgEnum("content_status", [
  "idea",
  "approved",
  "scheduled",
  "published",
]);

export const leadStage = pgEnum("lead_stage", [
  "new",
  "contacted",
  "qualified",
  "won",
  "lost",
]);

export const clients = pgTable("clients", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  website: text("website"),
  sector: text("sector"),
  notes: text("notes"),
  // Shared secret for posting enquiries into the lead tracker from forms or WhatsApp.
  leadToken: text("lead_token").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const brandProfiles = pgTable("brand_profiles", {
  clientId: uuid("client_id")
    .primaryKey()
    .references(() => clients.id, { onDelete: "cascade" }),
  data: jsonb("data").$type<BrandProfile>().notNull(),
  sourceUrl: text("source_url"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const contentItems = pgTable("content_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id")
    .notNull()
    .references(() => clients.id, { onDelete: "cascade" }),
  publishOn: date("publish_on").notNull(),
  channel: text("channel").notNull(),
  segment: text("segment"),
  title: text("title").notNull(),
  caption: text("caption").notNull(),
  visualBrief: text("visual_brief"),
  proofType: text("proof_type"),
  cta: text("cta"),
  status: contentStatus("status").notNull().default("idea"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const leads = pgTable("leads", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id")
    .notNull()
    .references(() => clients.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  contact: text("contact"),
  source: text("source").notNull(),
  segment: text("segment"),
  stage: leadStage("stage").notNull().default("new"),
  // Sale value in US cents.
  valueCents: integer("value_cents"),
  isRepeat: boolean("is_repeat").notNull().default(false),
  firstContactOn: date("first_contact_on").notNull(),
  closedOn: date("closed_on"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Marketing spend per client per month (YYYY-MM), in US cents.
export const spend = pgTable(
  "spend",
  {
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    month: text("month").notNull(),
    amountCents: integer("amount_cents").notNull(),
  },
  (t) => [primaryKey({ columns: [t.clientId, t.month] })],
);

export const reports = pgTable(
  "reports",
  {
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    month: text("month").notNull(),
    commentary: jsonb("commentary").$type<{
      headline: string;
      whatChanged: string[];
      nextSteps: string[];
    }>(),
    generatedAt: timestamp("generated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.clientId, t.month] })],
);

export type Client = typeof clients.$inferSelect;
export type ContentItem = typeof contentItems.$inferSelect;
export type Lead = typeof leads.$inferSelect;
