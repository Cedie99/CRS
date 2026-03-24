import { z } from "zod";

export const initiateSchema = z.object({
  customerType: z.enum(["standard", "fs_petroleum", "special"]),
});

export const cisFormSchema = z.object({
  tradeName: z.string().min(2, "Trade name is required").max(255),
  contactPerson: z.string().min(2, "Contact person is required").max(255),
  contactNumber: z.string().min(7, "Contact number is required").max(50),
  emailAddress: z.email("Invalid email address"),
  businessAddress: z.string().min(5, "Business address is required").max(500),
  cityMunicipality: z.string().min(2, "City/Municipality is required").max(255),
  businessType: z.enum([
    "corporation",
    "partnership",
    "sole_proprietor",
    "cooperative",
    "other",
  ]),
  tinNumber: z.string().max(50).optional(),
  additionalNotes: z.string().max(2000).optional(),
});

export const endorseSchema = z.object({
  note: z.string().max(1000).optional(),
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
