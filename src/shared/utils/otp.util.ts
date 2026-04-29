import * as bcrypt from 'bcryptjs';

export async function hashOtp(otp: string): Promise<string> {
  return bcrypt.hash(otp, 10);
}

export async function verifyOtpHash(
  otp: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(otp, hash);
}
