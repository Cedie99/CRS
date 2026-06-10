import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { mergeAgentEditBeforeSnapshot } from "@/lib/agent-edit-snapshot";
import { db } from "@/lib/db";
import { cisSubmissions } from "@/lib/db/schema";

const DIGITS_ONLY = /^\d+$/;
const DIGITS_OPTIONAL_DECIMAL = /^\d+(\.\d+)?$/;
const PHONE_CHARS = /^[0-9+()\-\s]*$/;
const TIN_FORMAT = /^[0-9-]+$/;

function digitCount(value: string) {
  return value.replace(/\D/g, "").length;
}

const numericString = (label: string) =>
  z.string().trim().regex(DIGITS_ONLY, `${label} must contain numbers only`);

const numericDecimalString = (label: string) =>
  z.string().trim().regex(DIGITS_OPTIONAL_DECIMAL, `${label} must be a valid number`);

const phoneLikeString = (label: string, min = 7) =>
  z.string().trim().min(min, `${label} is required`).max(50)
    .regex(PHONE_CHARS, `${label} must contain numbers and phone symbols only`)
    .refine((value) => digitCount(value) >= min, {
      message: `${label} must include at least ${min} digits`,
    });

const optionalPhoneLikeString = (label: string, min = 7) =>
  z.string().trim().max(50)
    .regex(PHONE_CHARS, `${label} must contain numbers and phone symbols only`)
    .refine((value) => value === "" || digitCount(value) >= min, {
      message: `${label} must include at least ${min} digits`,
    })
    .optional()
    .or(z.literal(""));

const agentUpdateCustomerSchema = z.object({
  // Business Information
  tradeName: z.string().min(2, "Trade name is required").max(255).optional(),
  corporateName: z.string().min(2, "Corporate name is required").max(255).optional(),
  dateOfBusinessReg: z.string().max(50).optional(),
  numberOfEmployees: numericString("Number of employees").max(50).optional().or(z.literal("")),

  // Contact Details
  contactPerson: z.string().min(2, "Contact person is required").max(255).optional(),
  contactNumber: phoneLikeString("Contact number", 7).optional(),
  emailAddress: z.preprocess(
    (value) => {
      if (typeof value !== "string") return value;
      const trimmed = value.trim();
      return trimmed === "" ? undefined : trimmed;
    },
    z.string().email("Invalid email address").optional(),
  ),
  telephoneNumber: optionalPhoneLikeString("Telephone number").optional(),
  website: z.string().max(255).optional().or(z.literal("")),

  // Office Address
  businessAddress: z.string().min(5, "Business address is required").max(500).optional(),
  cityMunicipality: z.string().min(2, "City/Municipality is required").max(255).optional(),
  postalCode: z.string().regex(/^\d*$/, "Postal code must contain only numbers").max(20).optional().or(z.literal("")),
  landmarks: z.string().max(500).optional(),

  // Delivery Address
  deliverySameAsOffice: z.boolean().optional(),
  deliveryAddress: z.string().max(500).optional(),
  deliveryLandmarks: z.string().max(500).optional(),
  deliveryMobile: optionalPhoneLikeString("Delivery mobile", 7),
  deliveryTelephone: optionalPhoneLikeString("Delivery telephone"),

  // Business Classification
  businessType: z.enum(["corporation", "partnership", "sole_proprietor", "cooperative", "other"]).optional(),
  tinNumber: z
    .string().trim().max(50)
    .regex(TIN_FORMAT, "TIN must contain numbers and hyphens only")
    .refine((value) => {
      if (!value) return true;
      const digits = digitCount(value);
      return digits >= 9 && digits <= 15;
    }, { message: "TIN must contain 9 to 15 digits" })
    .optional()
    .or(z.literal("")),
  lineOfBusiness: z.string().max(100).optional(),
  lineOfBusinessOther: z.string().max(255).optional(),
  businessActivity: z.string().max(100).optional(),
  businessActivityOther: z.string().max(255).optional(),

  // Payment & Sales
  customerType: z.enum(["dealer", "distributor", "private_label", "toll_blend", "end_user"]).optional(),
  paymentTerms: z.string().max(50).optional(),

  bankReferences: z.array(z.object({
    bank: z.string().max(255),
    branch: z.string().max(255),
    accountType: z.string().max(100),
    accountNo: z.string().max(30),
  })).optional(),

  // Business Background
  businessLife: numericDecimalString("Years in business").max(50).optional().or(z.literal("")),
  howLongAtAddress: numericDecimalString("Years at current address").max(50).optional().or(z.literal("")),
  numberOfBranches: numericString("Number of branches").max(50).optional().or(z.literal("")),
  govCertifications: z.string().max(2000).optional(),
  achievements: z.string().max(2000).optional(),
  otherMerits: z.string().max(2000).optional(),

  // Additional notes
  additionalNotes: z.string().max(2000).optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { role, id: userId } = session.user;
  if (role !== "sales_agent" && role !== "rsr") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const [cis] = await db
    .select()
    .from(cisSubmissions)
    .where(eq(cisSubmissions.id, id))
    .limit(1);

  if (!cis) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (cis.agentId !== userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (cis.status !== "returned") {
    return NextResponse.json({ error: "CIS is not in returned status" }, { status: 409 });
  }

  const body = await req.json();
  const parsed = agentUpdateCustomerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const updatePayload: Record<string, unknown> = { updatedAt: new Date() };
  for (const [key, value] of Object.entries(parsed.data)) {
    if (value !== undefined) {
      updatePayload[key] = value;
    }
  }

  if (parsed.data.customerType) {
    updatePayload.salesChannel = parsed.data.customerType;
  }

  if (Object.keys(updatePayload).length <= 1) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const nextPaymentTerms =
    typeof parsed.data.paymentTerms === "string" ? parsed.data.paymentTerms : cis.paymentTerms;
  const currentPaymentTerms = cis.paymentTerms?.toLowerCase() ?? "";
  const isMovingToWithTerms =
    nextPaymentTerms?.toLowerCase() === "with_terms" && currentPaymentTerms !== "with_terms";

  if (isMovingToWithTerms) {
    const updatedRefs = parsed.data.bankReferences ?? cis.bankReferences;
    const hasBankRefs =
      Array.isArray(updatedRefs) &&
      updatedRefs.some((row) => typeof row === "object" && row !== null && "bank" in row && String((row as { bank?: string }).bank ?? "").trim());

    if (!hasBankRefs) {
      return NextResponse.json(
        { error: "Bank references are required when changing payment terms to With Terms." },
        { status: 400 },
      );
    }
  }

  const changedKeys = Object.keys(parsed.data).filter(
    (key) => parsed.data[key as keyof typeof parsed.data] !== undefined,
  );
  const nextSnapshot = mergeAgentEditBeforeSnapshot(
    cis.agentEditBeforeSnapshot as Record<string, unknown> | null,
    cis as Record<string, unknown>,
    changedKeys,
  );
  if (Object.keys(nextSnapshot).length > 0) {
    updatePayload.agentEditBeforeSnapshot = nextSnapshot;
  }

  await db
    .update(cisSubmissions)
    .set(updatePayload as never)
    .where(eq(cisSubmissions.id, id));

  revalidateTag("agent-stats", {});
  revalidateTag("manager-stats", {});

  return NextResponse.json({ success: true });
}
