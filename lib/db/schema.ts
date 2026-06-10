import {

  pgTable,

  uuid,

  varchar,

  text,

  boolean,

  timestamp,

  pgEnum,

  jsonb,

  integer,

  decimal,

  index,

} from "drizzle-orm/pg-core";

import { sql } from "drizzle-orm";



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

  "project_development_specialist",

  "admin",

]);



export const agentTypeEnum = pgEnum("agent_type", ["sales_agent", "rsr"]);



export const customerTypeEnum = pgEnum("customer_type", [

  "dealer",

  "distributor",

  "private_label",

  "toll_blend",

  "end_user",

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

  "pending_erp_encoding",

  "erp_encoded",

  "denied",

  "returned",

]);



export const workflowActionEnum = pgEnum("workflow_action", [

  "submitted",

  "agent_submitted",

  "endorsed",

  "returned",

  "forwarded_to_legal",

  "forwarded_to_finance",

  "forwarded_to_approver",

  "approved",

  "denied",

  "sales_support_submitted",

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

  mustChangePassword: boolean("must_change_password").notNull().default(false), // Set when admin creates account

  isTopManager: boolean("is_top_manager").notNull().default(false), // Top-level manager sees all agents

  avatarUrl: varchar("avatar_url", { length: 500 }),

  sessionVersion: integer("session_version").notNull().default(1),

  createdAt: timestamp("created_at").notNull().defaultNow(),

}, (t) => [

  index("users_manager_id_idx").on(t.managerId),

]);



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



  // Routing key — set by agent fill-out step (null until agent submits)

  customerType: customerTypeEnum("customer_type"),



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

  postalCode: varchar("postal_code", { length: 20 }),

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

  salesChannel: varchar("sales_channel", { length: 50 }),



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

  docCompanyWebsite: jsonb("doc_company_website"),

  docIsoCertification: jsonb("doc_iso_certification"),

  docHalalCertificate: jsonb("doc_halal_certificate"),

  docCertifications: jsonb("doc_certifications"),

  docGovCertifications: jsonb("doc_gov_certifications"),

  docOther: jsonb("doc_other"),



  // Agent fill-out fields (populated after customer submits)

  agentAccountSpecialistFirst: varchar("agent_account_specialist_first", { length: 255 }),

  agentAccountSpecialistLast: varchar("agent_account_specialist_last", { length: 255 }),

  agentSalesSpecialist: varchar("agent_sales_specialist", { length: 255 }),

  agentSalesManager: varchar("agent_sales_manager", { length: 255 }),

  agentTpcFirst: varchar("agent_tpc_first", { length: 255 }),

  agentTpcLast: varchar("agent_tpc_last", { length: 255 }),

  docAgentOtherRequirements: jsonb("doc_agent_other_requirements"), // FileEntry[]



  // Sales Support fill-out field

  salesSupportNotes: text("sales_support_notes"),



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



  // Finance credit evaluation (populated by finance_reviewer/legal_approver when forwarding)

  financeEu: varchar("finance_eu", { length: 100 }),

  financeDl: varchar("finance_dl", { length: 100 }),

  financeDr: varchar("finance_dr", { length: 100 }),

  financePlTs: varchar("finance_pl_ts", { length: 255 }),

  financePossiblePoints: integer("finance_possible_points"),

  financeApprovedPoints: integer("finance_approved_points"),

  // Tiered scoring amounts — entered by Finance after reviewing documents

  annualSalesAmount: decimal("annual_sales_amount", { precision: 18, scale: 2 }),

  netIncomeAmount:   decimal("net_income_amount",   { precision: 18, scale: 2 }),

  bankBalanceAmount: decimal("bank_balance_amount",  { precision: 18, scale: 2 }),

  financeCreditTerms: varchar("finance_credit_terms", { length: 20 }),

  financeCreditLimit: varchar("finance_credit_limit", { length: 100 }),

  docSirRestySigned: jsonb("doc_sir_resty_signed"), // FileEntry[] — CFO-signed approved CIS



  // Sales Support fill-out fields

  salesSupportAccountType: varchar("sales_support_account_type", { length: 50 }),

  salesSupportPriceList1: varchar("sales_support_price_list_1", { length: 100 }),

  salesSupportPriceList2: varchar("sales_support_price_list_2", { length: 100 }),

  salesSupportSalesType: varchar("sales_support_sales_type", { length: 100 }),

  salesSupportVatCode: varchar("sales_support_vat_code", { length: 100 }),

  salesSupportOtherRemarks: text("sales_support_other_remarks"),

  docSalesSupportOther: jsonb("doc_sales_support_other"), // FileEntry[]



  // Per-document review statuses set by finance/legal reviewers

  docReviewStatuses: jsonb("doc_review_statuses"), // DocReviewStatuses

  // Direct metric points entered by Finance (each 0-5)

  financeMetricPoints: jsonb("finance_metric_points"), // { annualSales, netIncome, bankBalance, businessLife }



  // Fill mode — true when agent fills the form on behalf of the customer

  directFill: boolean("direct_fill").notNull().default(false),



  // ERP customer code assigned during encoding

  customerCode: varchar("customer_code", { length: 100 }),



  // Pre-edit field values when agent updates customer info on a returned CIS

  agentEditBeforeSnapshot: jsonb("agent_edit_before_snapshot"),



  createdAt: timestamp("created_at").notNull().defaultNow(),

  updatedAt: timestamp("updated_at").notNull().defaultNow(),

}, (t) => [

  index("cis_agent_id_created_at_idx").on(t.agentId, t.createdAt.desc()),

  index("cis_agent_id_status_created_at_idx").on(t.agentId, t.status, t.createdAt.desc()),

  index("cis_status_updated_at_idx").on(t.status, t.updatedAt.desc()),

  index("cis_status_created_at_idx").on(t.status, t.createdAt.desc()),

  index("cis_customer_type_idx").on(t.customerType),

  index("cis_is_archived_idx").on(t.isArchived),

]);



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

}, (t) => [

  index("workflow_events_cis_id_created_at_idx").on(t.cisId, t.createdAt),

  index("workflow_events_actor_action_idx").on(t.actorId, t.action),

]);



export const notifications = pgTable("notifications", {

  id: uuid("id").primaryKey().defaultRandom(),

  cisId: uuid("cis_id")

    .references(() => cisSubmissions.id),

  cusId: uuid("cus_id"),

  ctrId: uuid("ctr_id"),

  recipientId: uuid("recipient_id")

    .notNull()

    .references(() => users.id),

  type: notifTypeEnum("type").notNull().default("in_app"),

  message: text("message").notNull(),

  isRead: boolean("is_read").notNull().default(false),

  status: notifStatusEnum("status").notNull().default("pending"),

  sentAt: timestamp("sent_at").notNull().defaultNow(),

}, (t) => [

  index("notifications_recipient_id_sent_at_idx").on(t.recipientId, t.sentAt.desc()),

]);



export const cusSubmissions = pgTable("cus_submissions", {

  id: uuid("id").primaryKey().defaultRandom(),

  cisId: uuid("cis_id")

    .notNull()

    .references(() => cisSubmissions.id),

  agentId: uuid("agent_id")

    .notNull()

    .references(() => users.id),

  status: text("status").notNull().default("draft"),

  // draft | submitted | pending_legal_review | pending_finance_review | approved | denied

  note: text("note"),



  // Document uploads (same scoring docs as CIS)

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

  docCompanyWebsite: jsonb("doc_company_website"),

  docIsoCertification: jsonb("doc_iso_certification"),

  docHalalCertificate: jsonb("doc_halal_certificate"),

  docOther: jsonb("doc_other"),



  // Agent-requested changes (set at creation, reviewer can override customerType)

  newTradeName: varchar("new_trade_name", { length: 255 }),

  newContactPerson: varchar("new_contact_person", { length: 255 }),

  newContactNumber: varchar("new_contact_number", { length: 50 }),

  newTelephoneNumber: varchar("new_telephone_number", { length: 50 }),

  newEmailAddress: varchar("new_email_address", { length: 255 }),

  newWebsite: varchar("new_website", { length: 255 }),

  newNumberOfEmployees: varchar("new_number_of_employees", { length: 50 }),

  newCustomerType: varchar("new_customer_type", { length: 50 }),

  newBusinessAddress: text("new_business_address"),

  newCityMunicipality: varchar("new_city_municipality", { length: 200 }),

  newPostalCode: varchar("new_postal_code", { length: 20 }),

  newLandmarks: text("new_landmarks"),

  newDeliveryAddress: text("new_delivery_address"),

  newDeliveryLandmarks: text("new_delivery_landmarks"),

  newDeliveryMobile: varchar("new_delivery_mobile", { length: 50 }),

  newDeliveryTelephone: varchar("new_delivery_telephone", { length: 50 }),



  // Extended customer profile fields (mirrors CIS onboarding form)

  newCorporateName: varchar("new_corporate_name", { length: 255 }),

  newDateOfBusinessReg: varchar("new_date_of_business_reg", { length: 50 }),

  newTinNumber: varchar("new_tin_number", { length: 50 }),

  newBusinessType: varchar("new_business_type", { length: 50 }),

  newLineOfBusiness: varchar("new_line_of_business", { length: 100 }),

  newLineOfBusinessOther: varchar("new_line_of_business_other", { length: 255 }),

  newBusinessActivity: varchar("new_business_activity", { length: 100 }),

  newBusinessActivityOther: varchar("new_business_activity_other", { length: 255 }),

  newSalesChannel: varchar("new_sales_channel", { length: 50 }),

  newPaymentTerms: varchar("new_payment_terms", { length: 50 }),

  newOwners: jsonb("new_owners"),

  newOfficers: jsonb("new_officers"),

  newBusinessLife: varchar("new_business_life", { length: 50 }),

  newHowLongAtAddress: varchar("new_how_long_at_address", { length: 50 }),

  newNumberOfBranches: varchar("new_number_of_branches", { length: 50 }),

  newGovCertifications: text("new_gov_certifications"),

  newTradeReferences: jsonb("new_trade_references"),

  newBankReferences: jsonb("new_bank_references"),

  newAchievements: text("new_achievements"),

  newOtherMerits: text("new_other_merits"),

  newAdditionalNotes: text("new_additional_notes"),



  // Finance evaluation

  financeCreditLimit: varchar("finance_credit_limit", { length: 100 }),

  financeCreditTerms: varchar("finance_credit_terms", { length: 20 }),

  financeMetricPoints: jsonb("finance_metric_points"),



  // CFO-signed CUS (uploaded by finance/legal after CFO physically fills and signs the printed form)

  docSirRestySigned: jsonb("doc_sir_resty_signed"),



  // Snapshot of CIS values at the moment this CUS was approved (before changes were applied)

  beforeSnapshot: jsonb("before_snapshot"),



  createdAt: timestamp("created_at").notNull().defaultNow(),

  updatedAt: timestamp("updated_at").notNull().defaultNow(),

}, (t) => [

  index("cus_agent_id_created_at_idx").on(t.agentId, t.createdAt.desc()),

  index("cus_cis_id_idx").on(t.cisId),

  index("cus_status_created_at_idx").on(t.status, t.createdAt.desc()),

]);



export const cusEvents = pgTable("cus_events", {

  id: uuid("id").primaryKey().defaultRandom(),

  cusId: uuid("cus_id")

    .notNull()

    .references(() => cusSubmissions.id),

  actorId: uuid("actor_id")

    .notNull()

    .references(() => users.id),

  action: text("action").notNull(),

  note: text("note"),

  createdAt: timestamp("created_at").notNull().defaultNow(),

}, (t) => [

  index("cus_events_cus_id_idx").on(t.cusId, t.createdAt),

]);



export const ctrSubmissions = pgTable("ctr_submissions", {

  id: uuid("id").primaryKey().defaultRandom(),

  cisId: uuid("cis_id").notNull().references(() => cisSubmissions.id),

  agentId: uuid("agent_id").notNull().references(() => users.id),

  status: text("status").notNull().default("draft"),

  // draft | submitted | pending_legal_review | pending_finance_review

  // | pending_documents | pending_approval | approved | denied

  targetCustomerType: varchar("target_customer_type", { length: 50 }).notNull(),

  reason: text("reason"),

  requiredDocSlots: jsonb("required_doc_slots"),

  requiredDocsNote: text("required_docs_note"),

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

  docCompanyWebsite: jsonb("doc_company_website"),

  docIsoCertification: jsonb("doc_iso_certification"),

  docHalalCertificate: jsonb("doc_halal_certificate"),

  docOther: jsonb("doc_other"),

  financeCreditLimit: varchar("finance_credit_limit", { length: 100 }),

  financeCreditTerms: varchar("finance_credit_terms", { length: 20 }),

  financeMetricPoints: jsonb("finance_metric_points"),

  beforeSnapshot: jsonb("before_snapshot"),

  createdAt: timestamp("created_at").notNull().defaultNow(),

  updatedAt: timestamp("updated_at").notNull().defaultNow(),

}, (t) => [

  index("ctr_agent_id_created_at_idx").on(t.agentId, t.createdAt.desc()),

  index("ctr_cis_id_idx").on(t.cisId),

  index("ctr_status_created_at_idx").on(t.status, t.createdAt.desc()),

]);



export const ctrEvents = pgTable("ctr_events", {

  id: uuid("id").primaryKey().defaultRandom(),

  ctrId: uuid("ctr_id").notNull().references(() => ctrSubmissions.id),

  actorId: uuid("actor_id").notNull().references(() => users.id),

  action: text("action").notNull(),

  note: text("note"),

  createdAt: timestamp("created_at").notNull().defaultNow(),

}, (t) => [

  index("ctr_events_ctr_id_idx").on(t.ctrId, t.createdAt),

]);



// --- Inferred types ---



export type User = typeof users.$inferSelect;

export type NewUser = typeof users.$inferInsert;

export type CisSubmission = typeof cisSubmissions.$inferSelect;

export type NewCisSubmission = typeof cisSubmissions.$inferInsert;

export type WorkflowEvent = typeof workflowEvents.$inferSelect;

export type Notification = typeof notifications.$inferSelect;

export type CusSubmission = typeof cusSubmissions.$inferSelect;

export type CusEvent = typeof cusEvents.$inferSelect;

export type CtrSubmission = typeof ctrSubmissions.$inferSelect;

export type CtrEvent = typeof ctrEvents.$inferSelect;

