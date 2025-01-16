import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { configData } from './config';

@Injectable()
export class AppService {
  constructor(private readonly configService: ConfigService) {}
  private readonly logger = new Logger();
  config: any = configData(this.configService);
  async getHello() {
    // Health Check
    this.logger.log('Hello World!');
    return {
      message: 'Working at port ' + this.config.PORT + '...',
      response: {},
    };
  }
}
