/**
 * The single implicit operator.
 *
 * B-Matrix has no authentication by design — it is a single-operator tool. One
 * User row exists purely so campaigns and leads have an owner to hang their
 * foreign keys on. It is created lazily on first use and then cached.
 */

import { prisma } from '../config/database.js';

const OPERATOR_EMAIL = 'operator@bmatrix.local';

let cachedId: string | null = null;

export async function getOperatorId(): Promise<string> {
  if (cachedId) return cachedId;

  const user = await prisma.user.upsert({
    where: { email: OPERATOR_EMAIL },
    update: {},
    create: { email: OPERATOR_EMAIL, name: 'Operator' },
  });

  cachedId = user.id;
  return cachedId;
}
