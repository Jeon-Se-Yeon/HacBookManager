import {
  errorResponse,
  successResponse,
  createUser,
  toPublicUser,
  getAdminSignupCode,
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
    const name = body.name;
    const role = body.role === 'admin' ? 'admin' : 'user';
    const adminCode = body.adminCode;

    if (!userId || !password) {
      return errorResponse('ID와 비밀번호를 입력해주세요.');
    }
    if (!name?.trim()) {
      return errorResponse('회원가입 시 이름을 입력해주세요.');
    }

    if (role === 'admin') {
      const signupCode = getAdminSignupCode();
      if (!signupCode || String(adminCode || '').trim() !== signupCode) {
        return errorResponse('관리자 등록 코드가 올바르지 않습니다.');
      }
    }

    const user = await createUser({ userId, password, name, role });
    const token = createSessionToken(user.id);
    return successResponse({ user: toPublicUser(user), token });
  } catch (err) {
    if (err.message === 'DUPLICATE_ID') {
      return errorResponse('이미 존재하는 ID입니다.');
    }
    if (err.message === 'INVALID_INPUT') {
      return errorResponse('입력값이 올바르지 않습니다.');
    }
    console.error('auth-signup error', err);
    return errorResponse('회원가입 처리 중 오류가 발생했습니다.', 500);
  }
}
