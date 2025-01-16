import { ConfigService } from '@nestjs/config';
import { Expose, plainToInstance } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsString, validateSync } from 'class-validator';

export const configData = (configService: ConfigService) => ({
  PORT: configService.get<string>('PORT'),
  JWT_SECRET: configService.get<string>('JWT_SECRET'),
  DATABASE_URL: configService.get<string>('DATABASE_URL'),
  GOOGLE_CLIENT_ID: configService.get<string>('GOOGLE_CLIENT_ID'),
  GOOGLE_SECRET: configService.get<string>('GOOGLE_SECRET'),
  BACKEND_URL: configService.get<string>('BACKEND_URL'),
  FRONTEND_URL: configService.get<string>('FRONTEND_URL'),
  SENDGRID_API_KEY: configService.get<string>('SENDGRID_API_KEY'),
  SENDGRID_EMAIL: configService.get<string>('SENDGRID_EMAIL'),
  S3_BUCKET: configService.get<string>('S3_BUCKET'),
  S3_ACCESS_ID: configService.get<string>('S3_ACCESS_ID'),
  S3_SECRET_ACCESS_KEY: configService.get<string>('S3_SECRET_ACCESS_KEY'),
  S3_REGION: configService.get<string>('S3_REGION'),
  HEDERA_NETWORK: configService.get<string>('HEDERA_NETWORK'),
  HEDERA_ACCOUNT_ID: configService.get<string>('HEDERA_ACCOUNT_ID'),
  HEDERA_PUBLIC_KEY: configService.get<string>('HEDERA_PUBLIC_KEY'),
  HEDERA_PRIVATE_KEY: configService.get<string>('HEDERA_PRIVATE_KEY'),
  HEDERA_TESTNET_ENDPOINT: configService.get<string>('HEDERA_TESTNET_ENDPOINT'),
  WEB3_STORAGE: configService.get<string>('WEB3_STORAGE'),
  MO_FEE_ADDR: configService.get<string>('MO_FEE_ADDR'),
  LOGGER: configService.get<string>('LOGGER'),
  USDC_ADDRESS: configService.get<string>('USDC_ADDRESS'),
  NODE_ADDRESS: configService.get<string>('NODE_ADDRESS'),
  WEB3_STORAGE_KEY: configService.get<string>('WEB3_STORAGE_KEY'),
  WEB3_STORAGE_PROOF: configService.get<string>('WEB3_STORAGE_PROOF'),
  MQTT_CONN: configService.get<string>('MQTT_CONN'),
  BYTECODE_FILEID: configService.get<string>('BYTECODE_FILEID'),
});

class RequiredVariables {
  @Expose()
  @IsString()
  @IsNotEmpty()
  PORT: string;

  @Expose()
  @IsString()
  @IsNotEmpty()
  JWT_SECRET: string;

  @Expose()
  @IsString()
  @IsNotEmpty()
  DATABASE_URL: string;

  @Expose()
  @IsString()
  @IsNotEmpty()
  GOOGLE_CLIENT_ID: string;

  @Expose()
  @IsString()
  @IsNotEmpty()
  GOOGLE_SECRET: string;

  @Expose()
  @IsString()
  @IsNotEmpty()
  BACKEND_URL: string;

  @Expose()
  @IsString()
  @IsNotEmpty()
  FRONTEND_URL: string;

  @Expose()
  @IsString()
  @IsNotEmpty()
  SENDGRID_API_KEY: string;

  @Expose()
  @IsString()
  @IsNotEmpty()
  SENDGRID_EMAIL: string;

  @Expose()
  @IsString()
  @IsNotEmpty()
  S3_BUCKET: string;

  @Expose()
  @IsString()
  @IsNotEmpty()
  S3_ACCESS_ID: string;

  @Expose()
  @IsString()
  @IsNotEmpty()
  S3_SECRET_ACCESS_KEY: string;

  @Expose()
  @IsString()
  @IsNotEmpty()
  S3_REGION: string;

  @Expose()
  @IsString()
  @IsNotEmpty()
  HEDERA_ACCOUNT_ID: string;

  @Expose()
  @IsString()
  @IsNotEmpty()
  HEDERA_PUBLIC_KEY: string;

  @Expose()
  @IsString()
  @IsNotEmpty()
  HEDERA_PRIVATE_KEY: string;

  @Expose()
  @IsString()
  @IsNotEmpty()
  HEDERA_NETWORK: string;

  @Expose()
  @IsString()
  @IsNotEmpty()
  HEDERA_TESTNET_ENDPOINT: string;

  @Expose()
  @IsString()
  @IsNotEmpty()
  WEB3_STORAGE: string;

  @Expose()
  @IsString()
  @IsNotEmpty()
  MO_FEE_ADDR: string;

  @Expose()
  @IsString()
  @IsNotEmpty()
  LOGGER: string;

  @Expose()
  @IsString()
  @IsNotEmpty()
  USDC_ADDRESS: string;

  @Expose()
  @IsString()
  @IsNotEmpty()
  NODE_ADDRESS: string;

  @Expose()
  @IsString()
  @IsNotEmpty()
  WEB3_STORAGE_KEY: string;

  @Expose()
  @IsString()
  @IsNotEmpty()
  MQTT_CONN: string;

  @Expose()
  @IsString()
  @IsNotEmpty()
  BYTECODE_FILEID: string;
}

export function validate(config: Record<string, unknown>) {
  let updatedConfig = config;

  const nodeEnv = process.env.NODE_ENV?.trim();
  if (nodeEnv) {
    const prefix = `${nodeEnv.toUpperCase()}_`;
    console.log(prefix, 'NODE_ENV');

    updatedConfig = Object.entries(config).reduce((acc, [key, value]) => {
      const newKey = key.startsWith(prefix) ? key.replace(prefix, '') : key;
      acc[newKey] = value;
      return acc;
    }, {});
  }

  const validatedConfig = plainToInstance(RequiredVariables, updatedConfig, {
    enableImplicitConversion: true,
    excludeExtraneousValues: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    //  Gather all the errors and throw it
    const issues: string[] = errors.map((error) => {
      const keys = Object.keys(error.constraints);
      return error.constraints[keys[0]];
    });

    issues.push('Invalid .env config');

    throw issues.join('\n');
  }

  return validatedConfig;
}
