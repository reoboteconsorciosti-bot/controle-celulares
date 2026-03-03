import {
  pgTable,
  serial,
  varchar,
  text,
  boolean,
  timestamp,
  integer,
  date,
  jsonb,
  index,
} from "drizzle-orm/pg-core"
import { relations, sql } from "drizzle-orm"

// ==========================================
// COLABORADORES
// ==========================================
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  location: varchar("location", { length: 100 }),
  email: varchar("email", { length: 255 }).unique(),
  phone: varchar("phone", { length: 20 }),
  role: varchar("role", { length: 50 }).default("Consultor").notNull(), // Consultor, Supervisor, Gerente, TI, Administrativo, Sócio
  supervisorId: integer("supervisor_id").references((): any => users.id, { onDelete: "set null" }),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  searchIdx: index("users_search_idx").using("gin", sql`(
    coalesce(${table.name}, '') || ' ' || 
    coalesce(${table.location}, '') || ' ' || 
    coalesce(${table.email}, '') || ' ' || 
    coalesce(${table.phone}, '') || ' ' || 
    coalesce(${table.role}, '')
  ) gin_trgm_ops`)
}))

export const usersRelations = relations(users, ({ one, many }) => ({
  credentials: many(credentials),
  allocations: many(allocations, { relationName: "currentUser" }),
  previousAllocations: many(allocations, { relationName: "previousUser" }),
  subordinates: many(users, { relationName: "supervisor" }),
  supervisor: one(users, {
    fields: [users.supervisorId],
    references: [users.id],
    relationName: "supervisor"
  })
}))

// ==========================================
// HARDWARE (Ativos)
// ==========================================
export const assets = pgTable("assets", {
  id: serial("id").primaryKey(),
  type: varchar("type", { length: 50 }).notNull(), // phone, tablet, pc, notebook
  model: varchar("model", { length: 255 }).notNull(),
  brand: varchar("brand", { length: 100 }),
  imei1: varchar("imei_1", { length: 20 }),
  imei2: varchar("imei_2", { length: 20 }),
  patrimony: varchar("patrimony", { length: 50 }),
  status: varchar("status", { length: 30 }).default("available").notNull(), // available, in_use, maintenance
  condition: varchar("condition", { length: 50 }).default("bom"),
  isNew: boolean("is_new").default(false),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  searchIdx: index("assets_search_idx").using("gin", sql`(
    coalesce(${table.model}, '') || ' ' || 
    coalesce(${table.brand}, '') || ' ' || 
    coalesce(${table.imei1}, '') || ' ' || 
    coalesce(${table.imei2}, '') || ' ' || 
    coalesce(${table.patrimony}, '') || ' ' || 
    coalesce(${table.type}, '') || ' ' || 
    coalesce(${table.notes}, '')
  ) gin_trgm_ops`)
}))

export const assetsRelations = relations(assets, ({ many }) => ({
  credentials: many(credentials),
  allocations: many(allocations),
}))

// ==========================================
// CHIPS (SIM Cards)
// ==========================================
export const simCards = pgTable("sim_cards", {
  id: serial("id").primaryKey(),
  phoneNumber: varchar("phone_number", { length: 20 }).notNull(),
  iccid: varchar("iccid", { length: 30 }),
  planType: varchar("plan_type", { length: 20 }).default("reobote").notNull(), // reobote, pessoal
  status: varchar("status", { length: 20 }).default("available").notNull(), // active, available, banned
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  searchIdx: index("simcards_search_idx").using("gin", sql`(
    coalesce(${table.phoneNumber}, '') || ' ' || 
    coalesce(${table.iccid}, '') || ' ' || 
    coalesce(${table.planType}, '') || ' ' || 
    coalesce(${table.notes}, '')
  ) gin_trgm_ops`)
}))

export const simCardsRelations = relations(simCards, ({ many }) => ({
  allocations: many(allocations),
}))

// ==========================================
// CREDENCIAIS
// ==========================================
export const credentials = pgTable("credentials", {
  id: serial("id").primaryKey(),
  system: varchar("system", { length: 255 }).notNull(),
  url: varchar("url", { length: 255 }),
  username: varchar("username", { length: 255 }).notNull(),
  password: varchar("password", { length: 255 }),
  userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  searchIdx: index("credentials_search_idx").using("gin", sql`(
    coalesce(${table.system}, '') || ' ' || 
    coalesce(${table.url}, '') || ' ' || 
    coalesce(${table.username}, '')
  ) gin_trgm_ops`)
}))

export const credentialsRelations = relations(credentials, ({ one }) => ({
  user: one(users, {
    fields: [credentials.userId],
    references: [users.id],
  }),
}))

// ==========================================
// ATRIBUICOES (Allocations)
// ==========================================
export const allocations = pgTable("allocations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "restrict" }).notNull(),
  previousUserId: integer("previous_user_id").references(() => users.id, { onDelete: "set null" }),
  assetId: integer("asset_id").references(() => assets.id, { onDelete: "restrict" }),
  simCardId: integer("sim_card_id").references(() => simCards.id, { onDelete: "set null" }),
  deliveryDate: date("delivery_date").notNull(),
  returnDate: date("return_date"),
  accessories: jsonb("accessories").$type<Record<string, boolean>>().default({}),
  status: varchar("status", { length: 20 }).default("active").notNull(), // active, returned
  deliveryNotes: text("delivery_notes"),
  returnNotes: text("return_notes"),
  returnCondition: varchar("return_condition", { length: 50 }),
  isLoan: boolean("is_loan").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

export const allocationsRelations = relations(allocations, ({ one }) => ({
  user: one(users, {
    fields: [allocations.userId],
    references: [users.id],
    relationName: "currentUser"
  }),
  previousUser: one(users, {
    fields: [allocations.previousUserId],
    references: [users.id],
    relationName: "previousUser"
  }),
  asset: one(assets, {
    fields: [allocations.assetId],
    references: [assets.id],
  }),
  simCard: one(simCards, {
    fields: [allocations.simCardId],
    references: [simCards.id],
  }),
}))

// Tipos inferidos
export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type Asset = typeof assets.$inferSelect
export type NewAsset = typeof assets.$inferInsert
export type SimCard = typeof simCards.$inferSelect
export type NewSimCard = typeof simCards.$inferInsert
export type Credential = typeof credentials.$inferSelect
export type NewCredential = typeof credentials.$inferInsert
export type Allocation = typeof allocations.$inferSelect
export type NewAllocation = typeof allocations.$inferInsert

// ==========================================
// AUDITORIA (Audit Logs)
// ==========================================
export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  action: varchar("action", { length: 50 }).notNull(), // INSERT, UPDATE, DELETE
  tableName: varchar("table_name", { length: 50 }).notNull(), // assets, users, allocations
  recordId: integer("record_id").notNull(),
  oldData: jsonb("old_data"),
  newData: jsonb("new_data"),
  userId: varchar("user_id", { length: 255 }).notNull(), // Quem fez a alteracao
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

export type AuditLog = typeof auditLogs.$inferSelect
export type NewAuditLog = typeof auditLogs.$inferInsert
