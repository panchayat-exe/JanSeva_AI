import { prisma } from '../../config/database';
import type { RegisterDto } from './auth.validator';
import type { User, RefreshToken, EmailVerifyToken, PasswordResetToken, OtpCode, OtpType } from '@prisma/client';

// ─── User ─────────────────────────────────────────────────

export async function findUserByEmail(email: string): Promise<User | null> {
  return prisma.user.findUnique({ where: { email } });
}

export async function findUserById(id: string): Promise<User | null> {
  return prisma.user.findUnique({ where: { id } });
}

export async function createUser(
  data: RegisterDto & { password: string; citizenId: string },
): Promise<User> {
  return prisma.user.create({
    data: {
      email: data.email,
      password: data.password,
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      citizenId: data.citizenId,
      preferredLanguage: data.preferredLanguage ?? 'en',
      role: 'CITIZEN',
    },
  });
}

export async function updateUserLastLogin(id: string): Promise<void> {
  await prisma.user.update({
    where: { id },
    data: { lastLoginAt: new Date() },
  });
}

export async function markEmailVerified(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { isEmailVerified: true },
  });
}

export async function markPhoneVerified(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { isPhoneVerified: true },
  });
}

export async function updateUserPassword(userId: string, hashedPassword: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { password: hashedPassword },
  });
}

// ─── Email Verify Tokens ────────────────────────────────────

export async function createEmailVerifyToken(
  userId: string,
  hashedToken: string,
  expiresAt: Date,
): Promise<EmailVerifyToken> {
  return prisma.emailVerifyToken.create({
    data: { userId, token: hashedToken, expiresAt },
  });
}

export async function findEmailVerifyToken(hashedToken: string): Promise<EmailVerifyToken | null> {
  return prisma.emailVerifyToken.findUnique({ where: { token: hashedToken } });
}

export async function consumeEmailVerifyToken(id: string): Promise<void> {
  await prisma.emailVerifyToken.update({
    where: { id },
    data: { usedAt: new Date() },
  });
}

export async function deleteUserEmailVerifyTokens(userId: string): Promise<void> {
  await prisma.emailVerifyToken.deleteMany({ where: { userId } });
}

// ─── Password Reset Tokens ─────────────────────────────────

export async function createPasswordResetToken(
  userId: string,
  hashedToken: string,
  expiresAt: Date,
): Promise<PasswordResetToken> {
  return prisma.passwordResetToken.create({
    data: { userId, token: hashedToken, expiresAt },
  });
}

export async function findPasswordResetToken(hashedToken: string): Promise<PasswordResetToken | null> {
  return prisma.passwordResetToken.findUnique({ where: { token: hashedToken } });
}

export async function consumePasswordResetToken(id: string): Promise<void> {
  await prisma.passwordResetToken.update({
    where: { id },
    data: { usedAt: new Date() },
  });
}

export async function deleteUserPasswordResetTokens(userId: string): Promise<void> {
  await prisma.passwordResetToken.deleteMany({ where: { userId } });
}

// ─── Refresh Tokens ────────────────────────────────────────

export async function createRefreshToken(data: {
  token: string;
  userId: string;
  expiresAt: Date;
  userAgent?: string;
  ipAddress?: string;
}): Promise<RefreshToken> {
  return prisma.refreshToken.create({ data });
}

export async function findRefreshToken(token: string): Promise<RefreshToken | null> {
  return prisma.refreshToken.findUnique({ where: { token } });
}

export async function revokeRefreshToken(id: string): Promise<void> {
  await prisma.refreshToken.update({ where: { id }, data: { isRevoked: true } });
}

export async function revokeAllUserRefreshTokens(userId: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { userId, isRevoked: false },
    data: { isRevoked: true },
  });
}

export async function deleteExpiredRefreshTokens(): Promise<void> {
  await prisma.refreshToken.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
}

// ─── OTP Codes ─────────────────────────────────────────────

export async function createOtpCode(userId: string, code: string, type: OtpType, expiresAt: Date): Promise<OtpCode> {
  return prisma.otpCode.create({
    data: {
      userId,
      code,
      type,
      expiresAt,
    },
  });
}

export async function findLatestValidOtp(userId: string, type: OtpType): Promise<OtpCode | null> {
  return prisma.otpCode.findFirst({
    where: {
      userId,
      type,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function consumeOtpCode(id: string): Promise<void> {
  await prisma.otpCode.update({
    where: { id },
    data: { usedAt: new Date() },
  });
}

export async function deleteUserOtpCodes(userId: string, type: OtpType): Promise<void> {
  await prisma.otpCode.deleteMany({
    where: { userId, type },
  });
}
