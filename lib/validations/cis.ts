import { z } from "zod";



const DIGITS_ONLY = /^\d+$/;

const DIGITS_OPTIONAL_DECIMAL = /^\d+(\.\d+)?$/;

const PERCENTAGE = /^(100(\.0+)?|\d{1,2}(\.\d+)?)%?$/;

const PHONE_CHARS = /^[0-9+()\-\s]*$/;

const TIN_FORMAT = /^[0-9-]+$/;

const ACCOUNT_NUMBER_FORMAT = /^[0-9\-\s]+$/;

const ACCOUNT_TYPE_FORMAT = /^[A-Za-z0-9\s/&()\-]+$/;



function digitCount(value: string) {

  return value.replace(/\D/g, "").length;

}



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



const phoneLikeString = (label: string, min = 7, max?: number) =>

  z

    .string()

    .trim()

    .min(min, `${label} is required`)

    .max(50)

    .regex(PHONE_CHARS, `${label} must contain numbers and phone symbols only`)

    .refine((value) => digitCount(value) >= min, {

      message: `${label} must include at least ${min} digits`,

    })

    .refine((value) => !max || digitCount(value) <= max, {

      message: `${label} must not exceed ${max} digits`,

    });



const optionalPhoneLikeString = (label: string, min = 7, max?: number) =>

  z

    .string()

    .trim()

    .max(50)

    .regex(PHONE_CHARS, `${label} must contain numbers and phone symbols only`)

    .refine((value) => value === "" || digitCount(value) >= min, {

      message: `${label} must include at least ${min} digits`,

    })

    .refine((value) => value === "" || !max || digitCount(value) <= max, {

      message: `${label} must not exceed ${max} digits`,

    })

    .optional()

    .or(z.literal(""));



const CUSTOMER_TYPE_VALUES = ["dealer", "distributor", "private_label", "toll_blend", "end_user"] as const;



export const SALES_CHANNEL_OPTIONS = [

  { value: "end_user", label: "End User" },

  { value: "dealer", label: "Dealer" },

  { value: "distributor", label: "Distributor" },

  { value: "private_label", label: "Private Label" },

  { value: "toll_blend", label: "Toll Blend" },

] as const;



export const initiateSchema = z.object({

  tradeName: z.string().min(1, "Customer name is required").max(255),

  customerType: z.enum(CUSTOMER_TYPE_VALUES, { error: "Customer type is required" }),

  directFill: z.boolean().optional().default(false),

});



export const LINE_OF_BUSINESS_OPTIONS = [

  { value: "automotive_equipment",   label: "Automotive/Equipment" },

  { value: "logistics_transportation", label: "Logistics/Transportation" },

  { value: "construction_mining",    label: "Construction & Mining" },

  { value: "agriculture",            label: "Agriculture" },

  { value: "electronics_technology", label: "Electronics/Technology" },

  { value: "energy_chemicals",       label: "Energy/Chemicals" },

  { value: "merchandising",          label: "Merchandising" },

  { value: "other",                  label: "Others" },

] as const;



export const BUSINESS_ACTIVITY_OPTIONS = [

  { value: "manufacturer",  label: "Manufacturer" },

  { value: "distributor",   label: "Distributor" },

  { value: "retailer",      label: "Retailer" },

  { value: "wholesaler",    label: "Wholesaler" },

  { value: "service",       label: "Service" },

  { value: "other",         label: "Others" },

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

  contact: optionalPhoneLikeString("Contact number", 7, 11),

});



const officerRowSchema = z.object({

  name: z.string().max(255),

  position: z.string().max(100),

  contact: optionalPhoneLikeString("Contact number", 7, 11),

});



const tradeRefRowSchema = z.object({

  company: z.string().max(255),

  address: z.string().max(500),

  contact: optionalPhoneLikeString("Contact number", 7, 11),

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

  accountType: z

    .string()

    .trim()

    .min(2, "Account type is required")

    .max(100)

    .regex(ACCOUNT_TYPE_FORMAT, "Account type contains invalid characters"),

  accountNo: z

    .string()

    .trim()

    .min(6, "Account number must be at least 6 characters")

    .max(30, "Account number is too long")

    .regex(ACCOUNT_NUMBER_FORMAT, "Account number must contain digits, spaces, or hyphens only")

    .refine((value) => {

      const digits = digitCount(value);

      return digits >= 6 && digits <= 20;

    }, {

      message: "Account number must contain 6 to 20 digits",

    }),

  contactNumber: optionalPhoneLikeString("Contact number", 7, 11),

});



export const cisFormSchema = z.object({

  // Business Information

  corporateName: z.string().min(2, "Corporate name is required").max(255),

  tradeName: z.string().min(2, "Trade name is required").max(255),

  dateOfBusinessReg: z.string().max(50).optional(),

  numberOfEmployees: numericString("Number of employees").max(50).optional().or(z.literal("")),



  // Contact Details

  contactPerson: z.string().min(2, "Contact person is required").max(255),

  emailAddress: z.preprocess(
    (value) => {
      if (typeof value !== "string") return value;
      const trimmed = value.trim();
      return trimmed === "" ? undefined : trimmed;
    },
    z.string().email("Invalid email address").optional()
  ),

  contactNumber: phoneLikeString("Contact number", 7, 11),

  telephoneNumber: optionalPhoneLikeString("Telephone number"),

  website: z.string().max(255).optional().or(z.literal("")),



  // Office Address

  businessAddress: z.string().min(5, "Business address is required").max(500),

  cityMunicipality: z.string().min(2, "City/Municipality is required").max(255),

  landmarks: z.string().max(500).optional(),



  // Delivery Address

  deliverySameAsOffice: z.boolean().optional(),

  deliveryAddress: z.string().max(500).optional(),

  deliveryLandmarks: z.string().max(500).optional(),

  deliveryMobile: optionalPhoneLikeString("Delivery mobile", 7, 11),

  deliveryTelephone: optionalPhoneLikeString("Delivery telephone"),



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

  tinNumber: z

    .string()

    .trim()

    .max(50)

    .regex(TIN_FORMAT, "TIN must contain numbers and hyphens only")

    .refine((value) => {

      if (!value) return true;

      const digits = digitCount(value);

      return digits >= 9 && digits <= 15;

    }, {

      message: "TIN must contain 9 to 15 digits",

    })

    .optional()

    .or(z.literal("")),



  // Ownership

  owners: z.array(ownerRowSchema).optional(),

  officers: z.array(officerRowSchema).optional(),

  paymentTerms: z.string().max(50).optional(),

  salesChannel: z.string().max(50).optional(),



  // Business Background

  businessLife: numericDecimalString("Years in business").max(50).optional().or(z.literal("")),

  howLongAtAddress: numericDecimalString("Years at current address").max(50).optional().or(z.literal("")),

  numberOfBranches: numericString("Number of branches").max(50).optional().or(z.literal("")),

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

});



export const returnSchema = z.object({

  note: z

    .string()

    .min(10, "Please provide a reason for returning (min 10 characters)")

    .max(1000),

});



export const FINANCE_CREDIT_TERMS_OPTIONS = [

  { value: "COD", label: "COD" },

  { value: "Prepaid", label: "Prepaid" },

  { value: "7 DAYS", label: "7 DAYS" },

  { value: "15 DAYS", label: "15 DAYS" },

  { value: "30 DAYS", label: "30 DAYS" },

  { value: "45 DAYS", label: "45 DAYS" },

  { value: "60 DAYS", label: "60 DAYS" },

  { value: "90 DAYS", label: "90 DAYS" },

  { value: "120 DAYS", label: "120 DAYS" },

] as const;



export const financeForwardSchema = z.object({

  note: z.string().max(1000).optional(),

});



export type FinanceForwardInput = z.infer<typeof financeForwardSchema>;



export const SALES_SUPPORT_PRICE_LIST_1_OPTIONS = [

  { value: "PLATINUM DISTRIBUTOR", label: "PLATINUM DISTRIBUTOR" },

  { value: "PLATINUM DEALER", label: "PLATINUM DEALER" },

  { value: "PLATINUM SRP", label: "PLATINUM SRP" },

  { value: "COMET DISTRIBUTOR", label: "COMET DISTRIBUTOR" },

  { value: "COMET DEALER", label: "COMET DEALER" },

  { value: "COMET SRP", label: "COMET SRP" },

  { value: "DRO PLATINUM DISTRIBUTOR", label: "DRO PLATINUM DISTRIBUTOR" },

  { value: "DRO PLATINUM DEALER", label: "DRO PLATINUM DEALER" },

  { value: "DRO PLATINUM SRP", label: "DRO PLATINUM SRP" },

  { value: "DRO COMET DISTRIBUTOR", label: "DRO COMET DISTRIBUTOR" },

  { value: "DRO COMET DEALER", label: "DRO COMET DEALER" },

  { value: "DRO COMET SRP", label: "DRO COMET SRP" },

] as const;



export const SALES_SUPPORT_PRICE_LIST_2_OPTIONS = [

  { value: "DRO PLATINUM DISTRIBUTOR", label: "DRO PLATINUM DISTRIBUTOR" },

  { value: "DRO PLATINUM DEALER", label: "DRO PLATINUM DEALER" },

  { value: "DRO PLATINUM SRP", label: "DRO PLATINUM SRP" },

  { value: "DRO COMET DISTRIBUTOR", label: "DRO COMET DISTRIBUTOR" },

  { value: "DRO COMET DEALER", label: "DRO COMET DEALER" },

  { value: "DRO COMET SRP", label: "DRO COMET SRP" },

] as const;



export const SALES_SUPPORT_SALES_TYPE_OPTIONS = [

  { value: "OPC Sales", label: "OPC Sales" },

  { value: "Flexi Sales", label: "Flexi Sales" },

  { value: "Plat Sales", label: "Plat Sales" },

  { value: "DRO", label: "DRO" },

] as const;



export const SALES_SUPPORT_VAT_CODE_OPTIONS = [

  { value: "VAT-CAP (12.00%)", label: "VAT-CAP (12.00%)" },

  { value: "VAT-GFS (12.00%)", label: "VAT-GFS (12.00%)" },

  { value: "VAT-RMPM (12.00%)", label: "VAT-RMPM (12.00%)" },

  { value: "VAT-SUP (12.00%)", label: "VAT-SUP (12.00%)" },

  { value: "VAT-SVC (12.00%)", label: "VAT-SVC (12.00%)" },

  { value: "VAT-EXP (0.00%)", label: "VAT-EXP (0.00%)" },

  { value: "VAT-ZERO (0.00%)", label: "VAT-ZERO (0.00%)" },

] as const;



export const salesSupportSubmitSchema = z.object({
  salesSupportPriceList1: z.string().min(1, "Assigned Price List 1 is required").max(100),
  salesSupportPriceList2: z.string().min(1, "Assigned Price List 2 is required").max(100),
  salesSupportSalesType: z.string().min(1, "Sales Type is required").max(100),
  salesSupportVatCode: z.string().min(1, "VAT Code is required").max(100),
  salesSupportOtherRemarks: z.string().max(2000).optional().or(z.literal("")),
});



export type SalesSupportSubmitInput = z.infer<typeof salesSupportSubmitSchema>;



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

