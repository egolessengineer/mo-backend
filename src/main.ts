import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as dotenv from 'dotenv';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger, ValidationPipe } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  try {
    console.log('starting');
    dotenv.config(); // Load environment variables from .env file
    let loggerLevel: any = ['debug', 'error', 'log', 'verbose', 'warn'];
    if (process.env.LOGGER == '0') {
      loggerLevel = false;
    } else if (process.env.LOGGER == '1') {
      loggerLevel = ['error', 'warn'];
    } else if (process.env.LOGGER == '2') {
      loggerLevel = ['debug', 'error', 'log', 'verbose', 'warn'];
    }

    const app = await NestFactory.create(AppModule, {
      logger: loggerLevel,
    });
    // console.log('app--->', app);
    const logger = new Logger();
    const configService = app.get<ConfigService>(ConfigService);
    const config = new DocumentBuilder()
      .setTitle('MO Backend')
      .setDescription('API Documentation')
      .setVersion('1.0')
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, document);
    // console.log('document----->', document);
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        // forbidNonWhitelisted: true,
      }),
    );
    console.log('app.useglobalpipes');
    // app.connectMicroservice<MicroserviceOptions>({
    //   transport: Transport.MQTT,
    //   options: {
    //     url: configService.get('MQTT_CONN'),
    //     protocol: 'mqtts',
    //   },
    // });
    // try {
    //   await app.connectMicroservice<MicroserviceOptions>({
    //     transport: Transport.MQTT,
    //     options: {
    //       url: configService.get('MQTT_CONN'),
    //       protocol: 'mqtts',
    //     },
    //   });
    // } catch (error) {
    //   console.error('Error connecting to MQTT microservice:', error);
    // }

    console.log('app.connectMicroservices');
    app.enableCors({}); //for development purposes only
    console.log('app.enableCors');
    // await app.startAllMicroservices();
    // console.log('app.startAllMicroservices');
    await app.listen(configService.get('PORT') || 3000);
    console.log(`🚀🚀 server starting at 5000 🚀🚀`);
    logger.log('M.O. Backend is up at port ' + configService.get('PORT'));
  } catch (error) {
    console.error(
      'Error during application startup:',
      error.message,
      error.stack,
    );
  }
}

bootstrap();
