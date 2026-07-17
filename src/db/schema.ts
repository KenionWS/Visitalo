import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  jsonb,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// ---------------------------------------------------------------------------
// Actores
// ---------------------------------------------------------------------------

export const buyers = pgTable("buyers", {
  id: uuid("id").primaryKey().defaultRandom(),
  phone: text("phone").notNull(),
  name: text("name"),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("buyers_phone_idx").on(table.phone),
]);

export const agencies = pgTable("agencies", {
  id: uuid("id").primaryKey().defaultRandom(),
  phone: text("phone").notNull(),
  name: text("name").notNull(),
  contactName: text("contact_name"),
  zones: text("zones").array().notNull().default([]),
  creditsFree: integer("credits_free").notNull().default(5),
  creditsUsed: integer("credits_used").notNull().default(0),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("agencies_phone_idx").on(table.phone),
]);

// ---------------------------------------------------------------------------
// Búsquedas
// ---------------------------------------------------------------------------

export const searches = pgTable("searches", {
  id: uuid("id").primaryKey().defaultRandom(),
  buyerId: uuid("buyer_id").notNull().references(() => buyers.id),
  status: text("status").notNull().default("draft"), // draft|active|paused|closed
  operation: text("operation").notNull().default("venta"),
  propertyType: text("property_type"),
  zones: text("zones").array().notNull().default([]),
  budgetUsdMax: integer("budget_usd_max"),
  paymentMethod: text("payment_method"), // contado|credito|mixto
  hasPreapproval: boolean("has_preapproval"),
  preapprovalBank: text("preapproval_bank"),
  timeline: text("timeline"),
  mustHaves: jsonb("must_haves").$type<string[]>().notNull().default([]),
  notes: text("notes"),
  shortlistToken: text("shortlist_token").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("searches_shortlist_token_idx").on(table.shortlistToken),
]);

// ---------------------------------------------------------------------------
// Propuestas de propiedades
// ---------------------------------------------------------------------------

export const proposals = pgTable("proposals", {
  id: uuid("id").primaryKey().defaultRandom(),
  searchId: uuid("search_id").notNull().references(() => searches.id),
  agencyId: uuid("agency_id").notNull().references(() => agencies.id),
  status: text("status").notNull().default("pending_review"), // pending_review|published|discarded|withdrawn
  priceUsd: integer("price_usd"),
  areaM2: integer("area_m2"),
  rooms: integer("rooms"),
  zoneLabel: text("zone_label"), // ubicación aproximada, nunca dirección exacta
  attributes: jsonb("attributes").$type<Record<string, unknown>>(),
  description: text("description"), // redactada por LLM, sin PII
  photos: text("photos").array().notNull().default([]),
  sourceRaw: jsonb("source_raw").$type<Record<string, unknown>>(), // mensajes originales de la inmobiliaria
  matchScore: integer("match_score"), // fórmula simple 0-100
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("proposals_search_status_idx").on(table.searchId, table.status),
]);

// ---------------------------------------------------------------------------
// Interacciones del comprador
// ---------------------------------------------------------------------------

export const proposalEvents = pgTable("proposal_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  proposalId: uuid("proposal_id").notNull().references(() => proposals.id),
  type: text("type").notNull(), // favorite|discard|question|visit_request
  payload: jsonb("payload").$type<Record<string, unknown>>(), // motivo de descarte, texto de pregunta...
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Relay de preguntas
// ---------------------------------------------------------------------------

export const relayThreads = pgTable("relay_threads", {
  id: uuid("id").primaryKey().defaultRandom(),
  proposalId: uuid("proposal_id").notNull().references(() => proposals.id),
  question: text("question").notNull(),
  answer: text("answer"),
  status: text("status").notNull().default("sent"), // sent|answered|expired
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  answeredAt: timestamp("answered_at", { withTimezone: true }),
});

// ---------------------------------------------------------------------------
// Visitas (= momento de cobro)
// ---------------------------------------------------------------------------

export const visits = pgTable("visits", {
  id: uuid("id").primaryKey().defaultRandom(),
  proposalId: uuid("proposal_id").notNull().references(() => proposals.id),
  status: text("status").notNull().default("requested"), // requested|confirmed|done|cancelled
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
  creditCharged: boolean("credit_charged").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Infraestructura conversacional
// ---------------------------------------------------------------------------

export const conversations = pgTable("conversations", {
  id: uuid("id").primaryKey().defaultRandom(),
  phone: text("phone").notNull(),
  actorType: text("actor_type").notNull(), // buyer|agency
  state: text("state").notNull(),
  context: jsonb("context").$type<Record<string, unknown>>(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("conversations_phone_idx").on(table.phone),
]);

export const waMessages = pgTable("wa_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  wamid: text("wamid").notNull(), // id de mensaje de WhatsApp; sirve de dedupe
  phone: text("phone").notNull(),
  direction: text("direction").notNull(), // in|out
  type: text("type").notNull(),
  payload: jsonb("payload").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("wa_messages_wamid_idx").on(table.wamid),
]);

export const jobs = pgTable("jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  type: text("type").notNull(),
  payload: jsonb("payload").$type<Record<string, unknown>>(),
  status: text("status").notNull().default("pending"), // pending|processing|done|failed
  runAt: timestamp("run_at", { withTimezone: true }).notNull().defaultNow(),
  attempts: integer("attempts").notNull().default(0),
  lastError: text("last_error"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("jobs_status_run_at_idx").on(table.status, table.runAt),
]);
