import { errorResponse, successResponse } from '../lib/users.js';
import {
  verifyRequestToken,
  getReadStatusMap,
  saveReadStatusMap,
  patchReadStatus,
} from '../lib/readStatus.js';

export default async function handler(req) {
  if (req.method !== 'POST') {
    return errorResponse('POST만 허용됩니다.', 405);
  }

  try {
    const body = await req.json();
    const { action, token } = body;

    const userId = verifyRequestToken(token);
    if (!userId) {
      return errorResponse('로그인이 필요하거나 세션이 만료되었습니다. 다시 로그인해 주세요.', 401);
    }

    switch (action) {
      case 'get': {
        const statusMap = await getReadStatusMap(userId);
        return successResponse({ statusMap });
      }

      case 'save': {
        const statusMap = await saveReadStatusMap(userId, body.statusMap);
        return successResponse({ statusMap });
      }

      case 'patch': {
        const { bookId, readStatus } = body;
        if (!bookId) {
          return errorResponse('bookId가 필요합니다.');
        }
        const statusMap = await patchReadStatus(userId, bookId, readStatus);
        return successResponse({ statusMap });
      }

      default:
        return errorResponse('지원하지 않는 작업입니다.');
    }
  } catch (err) {
    console.error('read-status error', err);
    return errorResponse('독서 상태 처리 중 오류가 발생했습니다.', 500);
  }
}
