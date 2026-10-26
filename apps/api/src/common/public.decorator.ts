import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'immo:public';

/**
 * Route accessible sans session. Toutes les autres routes sont protégées
 * par défaut (SessionGuard global).
 */
export const Public = (): MethodDecorator & ClassDecorator => SetMetadata(IS_PUBLIC_KEY, true);
