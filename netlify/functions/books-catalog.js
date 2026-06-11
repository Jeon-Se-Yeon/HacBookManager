import { errorResponse, successResponse, findUserById } from '../lib/users.js';
import { verifySessionToken } from '../lib/session.js';
import { getCatalog, saveCatalog } from '../lib/catalog.js';

export default async function handler(req) {
  if (req.method !== 'POST') {
    return errorResponse('POST만 허용됩니다.', 405);
  }

  try {
    const body = await req.json();
    const { action, token } = body;

    const userId = verifySessionToken(token);
    if (!userId) {
      return errorResponse('로그인이 필요하거나 세션이 만료되었습니다. 다시 로그인해 주세요.', 401);
    }

    switch (action) {
      case 'get': {
        const catalog = await getCatalog();
        return successResponse({ catalog: catalog || [] });
      }

      case 'save': {
        const user = await findUserById(userId);
        if (!user || user.role !== 'admin') {
          return errorResponse('관리자만 서적 목록을 저장할 수 있습니다.', 403);
        }
        const catalog = await saveCatalog(body.catalog);
        return successResponse({ catalog });
      }

      default:
        return errorResponse('지원하지 않는 작업입니다.');
    }
  } catch (err) {
    console.error('books-catalog error', err);
    return errorResponse('서적 목록 처리 중 오류가 발생했습니다.', 500);
  }
}
