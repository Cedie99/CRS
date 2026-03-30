import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  pgEnum,
} from "drizzle-orm/pg-core";

// --- Enums ---

export const roleEnum = pgEnum("role", [
  "sales_agent",
  "rsr",
  "sales_manager",
  "rsr_manager",
  "finance_reviewer",
  "legal_approver",
  "senior_approver",
  "sales_support",
  "admin",
]);

export const agentTypeEnum = pgEnum("agent_type", ["sales_agent", "rsr"]);

export const customerTypeEnum = pgEnum("customer_type", [
  "standard",
  "fs_petroleum",
  "special",
]);

export const businessTypeEnum = pgEnum("business_type", [
  "corporation",
  "partnership",
  "sole_proprietor",
  "cooperative",
  "other",
]);

export const cisStatusEnum = pgEnum("cis_status", [
  "draft",
  "submitted",
  "pending_endorsement",
  "pending_legal_review",
  "pending_finance_review",
  "pending_approval",
  "approved",
  "erp_encoded",
  "denied",
  "returned",
]);

export const workflowActionEnum = pgEnum("workflow_action", [
  "submitted",
  "endorsed",
  "returned",
  "forwarded_to_legal",
  "forwarded_to_finance",
  "forwarded_to_approver",
  "approved",
  "denied",
  "erp_encoded",
]);

export const notifTypeEnum = pgEnum("notif_type", ["email", "in_app"]);
export const notifStatusEnum = pgEnum("notif_status", [
  "pending",
  "sent",
  "failed",
]);

// --- Tables ---

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  role: roleEnum("role").notNull().default("sales_agent"),
  agentCode: varchar("agent_code", { length: 50 }),
  agentType: agentTypeEnum("agent_type"),
  managerId: uuid("manager_id"), // FK to self — set after table creation via relation
  isActive: boolean("is_active").notNull().default(false), // Admin activates
  avatarUrl: varchar("avatar_url", { length: 500 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const cisSubmissions = pgTable("cis_submissions", {
  id: uuid("id").primaryKey().defaultRandom(),

  // Unique token for the customer-facing form link (public, unguessable)
  publicToken: uuid("public_token").notNull().defaultRandom().unique(),

  // Agent info (stamped at creation)
  agentId: uuid("agent_id")
    .notNull()
    .references(() => users.id),
  agentCode: varchar("agent_code", { length: 50 }).notNull(),
  agentType: agentTypeEnum("agent_type").notNull(),

  // Routing key — selected by agent at initiation
  customerType: customerTypeEnum("customer_type").notNull(),

  // Status & stage
  status: cisStatusEnum("status").notNull().default("draft"),

  // Customer-filled form fields
  tradeName: varchar("trade_name", { length: 255 }),
  contactPerson: varchar("contact_person", { length: 255 }),
  contactNumber: varchar("contact_number", { length: 50 }),
  emailAddress: varchar("email_address", { length: 255 }),
  businessAddress: text("business_address"),
  cityMunicipality: varchar("city_municipality", { length: 255 }),
  businessType: businessTypeEnum("business_type"),
  tinNumber: varchar("tin_number", { length: 50 }),
  additionalNotes: text("additional_notes"),

  // E-signatures
  customerSignature: text("customer_signature"),
  customerSignedAt: timestamp("customer_signed_at"),
  customerSignatureSeal: text("customer_signature_seal"),
  approverSignature: text("approver_signature"),
  approverSignedAt: timestamp("approver_signed_at"),
  approverSignatureSeal: text("approver_signature_seal"),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const workflowEvents = pgTable("workflow_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  cisId: uuid("cis_id")
    .notNull()
    .references(() => cisSubmissions.id),
  actorId: uuid("actor_id")
    .notNull()
    .references(() => users.id),
  action: workflowActionEnum("action").notNull(),
  note: text("note"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  cisId: uuid("cis_id")
    .notNull()
    .references(() => cisSubmissions.id),
  recipientId: uuid("recipient_id")
    .notNull()
    .references(() => users.id),
  type: notifTypeEnum("type").notNull().default("in_app"),
  message: text("message").notNull(),
  isRead: boolean("is_read").notNull().default(false),
  status: notifStatusEnum("status").notNull().default("pending"),
  sentAt: timestamp("sent_at").notNull().defaultNow(),
});

// --- Inferred types ---

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type CisSubmission = typeof cisSubmissions.$inferSelect;
export type NewCisSubmission = typeof cisSubmissions.$inferInsert;
export type WorkflowEvent = typeof workflowEvents.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
