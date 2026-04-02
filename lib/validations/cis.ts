import { z } from "zod";

const DIGITS_ONLY = /^\d+$/;
const DIGITS_OPTIONAL_DECIMAL = /^\d+(\.\d+)?$/;
const PERCENTAGE = /^(100(\.0+)?|\d{1,2}(\.\d+)?)%?$/;
const PHONE_CHARS = /^[0-9+()\-\s]*$/;
const TIN_FORMAT = /^[0-9-]+$/;

const numericString = (label: string) =>
  z
    .string()
    .trim()
    .regex(DIGITS_ONLY, `${label} must contain numbers only`);

const numericDecimalString = (label: string) =>
  z
    .string()
    .trim()
    .regex(DIGITS_OPTIONAL_DECIMAL, `${label} must be a valid number`);

const phoneLikeString = (label: string, min = 7) =>
  z
    .string()
    .trim()
    .min(min, `${label} is required`)
    .max(50)
    .regex(PHONE_CHARS, `${label} must contain numbers and phone symbols only`);

export const initiateSchema = z.object({
  customerType: z.enum(["standard", "fs_petroleum", "special"]),
});

export const LINE_OF_BUSINESS_OPTIONS = [
  { value: "retail", label: "Retail" },
  { value: "wholesale", label: "Wholesale" },
  { value: "manufacturing", label: "Manufacturing" },
  { value: "services", label: "Services" },
  { value: "construction", label: "Construction" },
  { value: "transport", label: "Transport / Logistics" },
  { value: "agriculture", label: "Agriculture" },
  { value: "other", label: "Other" },
] as const;

export const BUSINESS_ACTIVITY_OPTIONS = [
  { value: "trading", label: "Trading" },
  { value: "distribution", label: "Distribution" },
  { value: "production", label: "Production" },
  { value: "service_provider", label: "Service Provider" },
  { value: "subcontractor", label: "Subcontractor" },
  { value: "other", label: "Other" },
] as const;

const ownerRowSchema = z.object({
  name: z.string().max(255),
  nationality: z.string().max(100),
  percentage: z
    .string()
    .trim()
    .max(20)
    .regex(PERCENTAGE, "Ownership percentage must be a valid number (0-100)")
    .optional()
    .or(z.literal("")),
  contact: z.string().trim().max(50).regex(PHONE_CHARS, "Contact must contain numbers and phone symbols only"),
});

const officerRowSchema = z.object({
  name: z.string().max(255),
  position: z.string().max(100),
  contact: z.string().trim().max(50).regex(PHONE_CHARS, "Contact must contain numbers and phone symbols only"),
});

const tradeRefRowSchema = z.object({
  company: z.string().max(255),
  address: z.string().max(500),
  contact: z.string().trim().max(50).regex(PHONE_CHARS, "Contact must contain numbers and phone symbols only"),
  years: z
    .string()
    .trim()
    .max(20)
    .regex(DIGITS_OPTIONAL_DECIMAL, "Years must be a valid number")
    .optional()
    .or(z.literal("")),
});

const bankRefRowSchema = z.object({
  bank: z.string().max(255),
  branch: z.string().max(255),
  accountType: z.string().max(100),
  accountNo: z.string().max(100),
});

export const cisFormSchema = z.object({
  // Business Information
  corporateName: z.string().min(2, "Corporate name is required").max(255),
  tradeName: z.string().min(2, "Trade name is required").max(255),
  dateOfBusinessReg: z.string().max(50).optional(),
  numberOfEmployees: numericString("Number of employees").max(50).optional(),

  // Contact Details
  contactPerson: z.string().min(2, "Contact person is required").max(255),
  emailAddress: z.string().email("Invalid email address"),
  contactNumber: phoneLikeString("Contact number"),
  telephoneNumber: z.string().trim().max(50).regex(PHONE_CHARS, "Telephone number must contain numbers and phone symbols only").optional(),
  website: z.string().max(255).optional().or(z.literal("")),

  // Office Address
  businessAddress: z.string().min(5, "Business address is required").max(500),
  cityMunicipality: z.string().min(2, "City/Municipality is required").max(255),
  landmarks: z.string().max(500).optional(),

  // Delivery Address
  deliverySameAsOffice: z.boolean().optional(),
  deliveryAddress: z.string().max(500).optional(),
  deliveryLandmarks: z.string().max(500).optional(),
  deliveryMobile: z.string().trim().max(50).regex(PHONE_CHARS, "Delivery mobile must contain numbers and phone symbols only").optional(),
  deliveryTelephone: z.string().trim().max(50).regex(PHONE_CHARS, "Delivery telephone must contain numbers and phone symbols only").optional(),

  // Business Classification
  lineOfBusiness: z.string().max(100).optional(),
  lineOfBusinessOther: z.string().max(255).optional(),
  businessActivity: z.string().max(100).optional(),
  businessActivityOther: z.string().max(255).optional(),
  businessType: z.enum([
    "corporation",
    "partnership",
    "sole_proprietor",
    "cooperative",
    "other",
  ]),
  tinNumber: z.string().trim().max(50).regex(TIN_FORMAT, "TIN must contain numbers and hyphens only").optional(),

  // Ownership
  owners: z.array(ownerRowSchema).optional(),
  officers: z.array(officerRowSchema).optional(),
  paymentTerms: z.string().max(50).optional(),

  // Business Background
  businessLife: numericDecimalString("Years in business").max(50).optional(),
  howLongAtAddress: numericDecimalString("Years at current address").max(50).optional(),
  numberOfBranches: numericString("Number of branches").max(50).optional(),
  govCertifications: z.string().max(2000).optional(),
  tradeReferences: z.array(tradeRefRowSchema).optional(),
  bankReferences: z.array(bankRefRowSchema).optional(),
  achievements: z.string().max(2000).optional(),
  otherMerits: z.string().max(2000).optional(),

  // Additional Notes & Signature
  additionalNotes: z.string().max(2000).optional(),
  customerSignature: z.string().min(1, "Signature is required"),
}).superRefine((data, ctx) => {
  if (data.lineOfBusiness === "other" && !data.lineOfBusinessOther?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["lineOfBusinessOther"],
      message: "Please specify line of business",
    });
  }

  if (data.businessActivity === "other" && !data.businessActivityOther?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["businessActivityOther"],
      message: "Please specify business activity",
    });
  }
});

/** Returns the base schema — customer type now only affects routing, not required fields. */
export function getCisFormSchema(_customerType?: string) {
  return cisFormSchema;
}

export const endorseSchema = z.object({
  note: z.string().max(1000).optional(),
});

export const approveSchema = z.object({
  note: z.string().max(1000).optional(),
  approverSignature: z.string().min(1, "Signature is required"),
});

export const returnSchema = z.object({
  note: z
    .string()
    .min(10, "Please provide a reason for returning (min 10 characters)")
    .max(1000),
});

export const financeForwardSchema = z.object({
  note: z.string().max(1000).optional(),
});

export const denySchema = z.object({
  note: z
    .string()
    .min(10, "Please provide a denial reason (min 10 characters)")
    .max(1000),
});

export const legalReviewSchema = z.object({
  decision: z.enum(["forward", "deny"]),
  note: z.string().max(1000).optional(),
});

export type InitiateInput = z.infer<typeof initiateSchema>;
export type CisFormInput = z.infer<typeof cisFormSchema>;
export type ApproveInput = z.infer<typeof approveSchema>;
