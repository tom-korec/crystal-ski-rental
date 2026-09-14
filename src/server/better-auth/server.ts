import 'server-only';

import { headers } from 'next/headers';
import { cache } from 'react';

import { auth } from '.';

/** One session lookup per request, however many guards and components ask for it. */
export const getSession = cache(async () => auth.api.getSession({ headers: await headers() }));
