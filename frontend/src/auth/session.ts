import * as api from "../services/authApi";
import { invalidateApiSession, onUnauthorized } from "../services/apiClient";
import { createAuthSession } from "../utils/authSession";

export const authSession = createAuthSession(api, invalidateApiSession);
onUnauthorized(authSession.expire);
