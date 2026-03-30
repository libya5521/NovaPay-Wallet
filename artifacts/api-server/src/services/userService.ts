import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export async function getUserProfile(userId: string) {
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);

  if (!user) {
    throw Object.assign(new Error("User not found"), { code: "USER_NOT_FOUND" });
  }

  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    avatarUrl: user.avatarUrl,
    kycStatus: user.kycStatus,
    createdAt: user.createdAt.toISOString(),
  };
}

export async function updateUserProfile(
  userId: string,
  data: { firstName?: string; lastName?: string; phone?: string }
) {
  const [updated] = await db
    .update(usersTable)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(usersTable.id, userId))
    .returning();

  return {
    id: updated.id,
    email: updated.email,
    firstName: updated.firstName,
    lastName: updated.lastName,
    phone: updated.phone,
    avatarUrl: updated.avatarUrl,
    kycStatus: updated.kycStatus,
    createdAt: updated.createdAt.toISOString(),
  };
}

export async function getKycStatus(userId: string) {
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);

  if (!user) {
    throw Object.assign(new Error("User not found"), { code: "USER_NOT_FOUND" });
  }

  return {
    status: user.kycStatus,
    submittedAt: user.kycSubmittedAt?.toISOString() ?? null,
    reviewedAt: user.kycReviewedAt?.toISOString() ?? null,
    rejectionReason: user.kycRejectionReason,
  };
}

/**
 * Submit KYC verification data.
 *
 * Integration point: Replace with Sumsub applicant flow.
 * 1. Create applicant: POST https://api.sumsub.com/resources/applicants
 * 2. Upload documents to the applicant
 * 3. Submit for review
 * See: https://docs.sumsub.com/reference/create-applicant
 *
 * Example:
 *   const applicant = await sumsubClient.createApplicant({
 *     externalUserId: userId,
 *     levelName: "basic-kyc-level",
 *   });
 *   // Store applicant.id in the user record for webhook callbacks
 */
export async function submitKyc(
  userId: string,
  data: {
    fullName: string;
    dateOfBirth: string;
    nationality: string;
    documentType: string;
    documentNumber: string;
    addressLine1: string;
    city: string;
    country: string;
  }
) {
  // For now, mark as submitted (placeholder for Sumsub integration)
  const [updated] = await db
    .update(usersTable)
    .set({ kycStatus: "submitted", kycSubmittedAt: new Date(), updatedAt: new Date() })
    .where(eq(usersTable.id, userId))
    .returning();

  return {
    status: updated.kycStatus,
    submittedAt: updated.kycSubmittedAt?.toISOString() ?? null,
    reviewedAt: null,
    rejectionReason: null,
  };
}
