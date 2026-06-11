import {
  errorResponse,
  successResponse,
  verifyAdmin,
  listUsersPublic,
  createUser,
  updateUserByAdmin,
  deleteUserByAdmin,
  toPublicUser,
} from '../lib/users.js';

export default async function handler(req) {
  if (req.method !== 'POST') {
    return errorResponse('POST만 허용됩니다.', 405);
  }

  try {
    const body = await req.json();
    const { action, adminId, adminPassword } = body;

    if (!adminId || !adminPassword) {
      return errorResponse('관리자 인증 정보가 필요합니다.', 401);
    }

    const admin = await verifyAdmin(adminId, adminPassword);
    if (!admin) {
      return errorResponse('관리자 권한이 없거나 비밀번호가 올바르지 않습니다.', 403);
    }

    switch (action) {
      case 'list': {
        const users = await listUsersPublic();
        return successResponse({ users });
      }

      case 'create': {
        const user = await createUser({
          userId: body.userId,
          password: body.password,
          name: body.name,
          role: body.role === 'admin' ? 'admin' : 'user',
        });
        return successResponse({ user: toPublicUser(user) });
      }

      case 'update': {
        const user = await updateUserByAdmin({
          targetUserId: body.targetUserId,
          name: body.name,
          role: body.role,
          password: body.password,
        });
        return successResponse({ user: toPublicUser(user) });
      }

      case 'delete': {
        await deleteUserByAdmin(body.targetUserId);
        return successResponse({ deleted: true });
      }

      default:
        return errorResponse('지원하지 않는 작업입니다.');
    }
  } catch (err) {
    if (err.message === 'DUPLICATE_ID') {
      return errorResponse('이미 존재하는 ID입니다.');
    }
    if (err.message === 'NOT_FOUND') {
      return errorResponse('사용자를 찾을 수 없습니다.', 404);
    }
    if (err.message === 'INVALID_INPUT') {
      return errorResponse('입력값이 올바르지 않습니다.');
    }
    if (err.message === 'LAST_ADMIN') {
      return errorResponse('마지막 관리자 계정은 삭제할 수 없습니다.');
    }
    console.error('auth-users-admin error', err);
    return errorResponse('사용자 관리 처리 중 오류가 발생했습니다.', 500);
  }
}
