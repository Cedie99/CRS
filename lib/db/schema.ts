import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  pgEnum,
  jsonb,
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

  // Soft-dismiss for denied/returned forms (agent view only)
  isArchived: boolean("is_archived").notNull().default(false),

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

  // Extended basic info
  corporateName: varchar("corporate_name", { length: 255 }),
  dateOfBusinessReg: varchar("date_of_business_reg", { length: 50 }),
  numberOfEmployees: varchar("number_of_employees", { length: 50 }),
  website: varchar("website", { length: 255 }),
  telephoneNumber: varchar("telephone_number", { length: 50 }),
  landmarks: text("landmarks"),

  // Delivery address
  deliverySameAsOffice: boolean("delivery_same_as_office").default(false),
  deliveryAddress: text("delivery_address"),
  deliveryLandmarks: text("delivery_landmarks"),
  deliveryMobile: varchar("delivery_mobile", { length: 50 }),
  deliveryTelephone: varchar("delivery_telephone", { length: 50 }),

  // Business classification
  lineOfBusiness: varchar("line_of_business", { length: 100 }),
  lineOfBusinessOther: varchar("line_of_business_other", { length: 255 }),
  businessActivity: varchar("business_activity", { length: 100 }),
  businessActivityOther: varchar("business_activity_other", { length: 255 }),

  // Ownership (dynamic rows)
  owners: jsonb("owners"),   // [{name, nationality, percentage, contact}]
  officers: jsonb("officers"), // [{name, position, contact}]
  paymentTerms: varchar("payment_terms", { length: 50 }),

  // Business background
  businessLife: varchar("business_life", { length: 50 }),
  howLongAtAddress: varchar("how_long_at_address", { length: 50 }),
  numberOfBranches: varchar("number_of_branches", { length: 50 }),
  govCertifications: text("gov_certifications"),
  tradeReferences: jsonb("trade_references"), // [{company, address, contact, years}]
  bankReferences: jsonb("bank_references"),   // [{bank, branch, accountType, accountNo}]
  achievements: text("achievements"),
  otherMerits: text("other_merits"),

  // Document uploads (JSONB arrays of {name, url, size, type})
  docValidId: jsonb("doc_valid_id"),
  docMayorsPermit: jsonb("doc_mayors_permit"),
  docSecDti: jsonb("doc_sec_dti"),
  docBirCertificate: jsonb("doc_bir_certificate"),
  docLocationMap: jsonb("doc_location_map"),
  docFinancialStatement: jsonb("doc_financial_statement"),
  docBankStatement: jsonb("doc_bank_statement"),
  docProofOfBilling: jsonb("doc_proof_of_billing"),
  docLeaseContract: jsonb("doc_lease_contract"),
  docProofOfOwnership: jsonb("doc_proof_of_ownership"),
  docStorePhoto: jsonb("doc_store_photo"),
  docSupplierInvoice: jsonb("doc_supplier_invoice"),
  docSocialMedia: jsonb("doc_social_media"),
  docCertifications: jsonb("doc_certifications"),
  docGovCertifications: jsonb("doc_gov_certifications"),
  docOther: jsonb("doc_other"),

  // FS Petroleum fields (kept in schema, no longer customer-filled)
  petroleumLicenseNo: varchar("petroleum_license_no", { length: 100 }),
  depotStationType: varchar("depot_station_type", { length: 50 }),
  tankCapacity: varchar("tank_capacity", { length: 100 }),
  doeAccreditationNo: varchar("doe_accreditation_no", { length: 100 }),

  // Special account fields (kept in schema, no longer customer-filled)
  specialAccountType: varchar("special_account_type", { length: 50 }),
  specialAccountRemarks: text("special_account_remarks"),

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
