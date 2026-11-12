import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import type { Request, Response } from 'express';
import { Observable, tap } from 'rxjs';
import { User } from '../user/entities/user.entity';

type AuthenticatedRequest = Request & { user?: User };

@Injectable()
export class HttpAuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(HttpAuditInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const response = context.switchToHttp().getResponse<Response>();
    const startedAt = Date.now();

    return next.handle().pipe(
      tap({
        next: () => this.writeLog(request, response, startedAt),
        error: () => this.writeLog(request, response, startedAt),
      }),
    );
  }

  private writeLog(
    request: AuthenticatedRequest,
    response: Response,
    startedAt: number,
  ): void {
    const actor = request.user?.id_usuario ?? 'anonymous';
    const requestId = response.getHeader('X-Request-Id') ?? 'untracked';
    const message = `${request.method} ${request.path} ${response.statusCode} ${Date.now() - startedAt}ms actor=${actor} request=${requestId}`;
    if (response.statusCode >= 500) {
      this.logger.error(message);
      return;
    }
    this.logger.log(message);
  }
}
