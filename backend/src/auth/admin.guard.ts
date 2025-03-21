import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Observable } from 'rxjs';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private configService: ConfigService) {}

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    const adminApiKey = this.configService.get<string>('ADMIN_API_KEY');
    
    if (!adminApiKey) {
      return false;
    }

    const providedKey = request.headers['admin_key'];

    return providedKey === adminApiKey;
  }
}
