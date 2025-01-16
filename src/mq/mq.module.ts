import { DynamicModule, Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';

@Module({})
export class MqttModule {
  static register({ name }): DynamicModule {
    return {
      module: MqttModule,
      imports: [
        ClientsModule.registerAsync([
          {
            name,
            useFactory: async (configService: ConfigService) => ({
              transport: Transport.MQTT,
              options: {
                url: await configService.get('MQTT_CONN'),
                protocol: 'mqtts',
              },
            }),
            inject: [ConfigService],
          },
        ]),
      ],
      exports: [ClientsModule],
    };
  }
}
