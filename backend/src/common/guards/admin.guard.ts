import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();

    // Get admin API key from environment
    const adminApiKey = this.configService.get<string>('ADMIN_API_KEY');

    if (!adminApiKey) {
      throw new UnauthorizedException('Admin API key not configured');
    }

    // Get API key from request header
    const apiKey = request.headers['x-api-key'] as string;

    if (!apiKey) {
      throw new UnauthorizedException('API key is required');
    }

    // Compare API keys
    if (apiKey !== adminApiKey) {
      throw new UnauthorizedException('Invalid API key');
    }

    return true;
  }
}
