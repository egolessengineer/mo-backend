import { Global, Module } from '@nestjs/common';
import { EmailService } from './email-service.service';

@Global()
@Module({
  providers: [EmailService]
})
export class EmailServiceModule {}
