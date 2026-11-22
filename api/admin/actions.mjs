import { executeAdminAction } from '../../server/services/adminService.mjs'
import {
  readAdminJsonBody,
  requireAdmin,
  sendAdminError,
  sendAdminJson,
} from '../../server/lib/adminHttp.mjs'

export default async function adminActionsHandler(req, res) {
  if (!requireAdmin(req, res)) return
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return sendAdminJson(res, 405, { error: 'method_not_allowed' })
  }
  try {
    const body = await readAdminJsonBody(req)
    const result = await executeAdminAction(body)
    return sendAdminJson(res, 200, result)
  } catch (error) {
    return sendAdminError(res, error)
  }
}
