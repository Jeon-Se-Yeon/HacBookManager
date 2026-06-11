import {
  errorResponse,
  successResponse,
  findUserById,
  verifyUserPassword,
  toPublicUser,
} from '../lib/users.js';
import { createSessionToken } from '../lib/session.js';

export default async function handler(req) {
  if (req.method !== 'POST') {
    return errorResponse('POST만 허용됩니다.', 405);
  }

  try {
    const body = await req.json();
    const userId = body.userId;
    const password = body.password;

    if (!userId || !password) {
      return errorResponse('ID와 비밀번호를 입력해주세요.');
    }

    const user = await findUserById(userId);
    if (!user) {
      return errorResponse('ID 또는 비밀번호가 올바르지 않습니다.', 401);
    }

    const valid = await verifyUserPassword(user, password);
    if (!valid) {
      return errorResponse('ID 또는 비밀번호가 올바르지 않습니다.', 401);
    }

    const token = createSessionToken(user.id);
    return successResponse({ user: toPublicUser(user), token });
  } catch (err) {
    console.error('auth-login error', err);
    return errorResponse('로그인 처리 중 오류가 발생했습니다.', 500);
  }
}
