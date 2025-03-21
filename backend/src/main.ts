import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Get configuration variables
  const port = configService.get<number>('PORT', 5001);
  const host = configService.get<string>('HOST', '0.0.0.0');
  const apiPrefix = configService.get<string>('API_PREFIX', 'api');
  const enableCors = configService.get<boolean>('ENABLE_CORS', true);
  const enableSwagger = configService.get<boolean>('ENABLE_SWAGGER', true);

  // Enable CORS if configured
  if (enableCors) {
    app.enableCors();
  }

  // Enable security middleware
  app.use(helmet());

  // Enable validation
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Set global prefix for all routes
  app.setGlobalPrefix(apiPrefix);

  // Setup Swagger documentation
  if (enableSwagger) {
    const config = new DocumentBuilder()
      .setTitle('Atherlabs Airdrop API')
      .setDescription('API documentation for Atherlabs Token Airdrop Platform')
      .setVersion('1.0')
      .addTag('blockchain', 'Blockchain interaction endpoints')
      .addTag('whitelist', 'Whitelist management endpoints')
      .addApiKey({ type: 'apiKey', name: 'admin_key', in: 'header' }, 'admin_key')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document);
  }

  // Start the server
  await app.listen(port, host);

  console.log(`Application is running on: ${host}:${port}/${apiPrefix}`);
  if (enableSwagger) {
    console.log(`Swagger documentation is available at: ${host}:${port}/docs`);
  }
}

bootstrap();
