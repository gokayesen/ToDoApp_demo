import { z } from 'zod';

export const registerRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
});

export type RegisterRequest = z.infer<typeof registerRequestSchema>;

export const loginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export type LoginRequest = z.infer<typeof loginRequestSchema>;

export const userProfileSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string(),
  avatarUrl: z.string().nullable(),
});

export const authResponseSchema = z.object({
  accessToken: z.string(),
  user: userProfileSchema,
});

export type AuthResponse = z.infer<typeof authResponseSchema>;

export const forgotPasswordRequestSchema = z.object({
  email: z.string().email(),
});

export type ForgotPasswordRequest = z.infer<typeof forgotPasswordRequestSchema>;

export const resetPasswordRequestSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8),
});

export type ResetPasswordRequest = z.infer<typeof resetPasswordRequestSchema>;

export const updateProfileRequestSchema = z.object({
  name: z.string().min(1).optional(),
  avatarUrl: z.string().url().nullable().optional(),
});

export type UpdateProfileRequest = z.infer<typeof updateProfileRequestSchema>;

// Story 8.8 (FR40 / Architecture §4 cascade table): GET /users/me/owned-workspaces
// lets the client render the ownership-transfer prompt Architecture §10 flags as
// needed *before* the user attempts deletion, rather than discovering it only from
// a 400 on the delete call itself. `otherMembers` is empty for a Workspace only
// this user belongs to — that one gets deleted outright alongside the account
// (nobody to transfer it to), no otherMembers.length > 0 ones need a transfer pick.
export const ownedWorkspaceSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  otherMembers: z.array(userProfileSchema),
});

export type OwnedWorkspace = z.infer<typeof ownedWorkspaceSchema>;

// `transfers` only needs an entry for each ownedWorkspace whose otherMembers
// isn't empty — deleteAccount (user.service.ts) 400s naming the first Workspace
// missing one, rather than requiring the client to pre-enumerate every case.
export const deleteAccountRequestSchema = z.object({
  confirmEmail: z.string().email(),
  transfers: z.array(z.object({ workspaceId: z.string().uuid(), newOwnerId: z.string().uuid() })).default([]),
});

export type DeleteAccountRequest = z.infer<typeof deleteAccountRequestSchema>;
