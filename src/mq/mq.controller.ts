import { Controller, Get, Inject, Post } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import {
  Payload,
  Ctx,
  MqttContext,
  MessagePattern,
} from '@nestjs/microservices';
import { map } from 'rxjs';

@Controller('mq')
export class MqttController {
  constructor(@Inject('notificationProxy') private client: ClientProxy) {}

  // we can subscribe for the specific topic and listen for the data which gets published from clients.
  @MessagePattern('bac7fecf-0e50-4ba4-9efd-d1047028316b')
  listenFromClient(@Payload() data, @Ctx() context: MqttContext) {}

  /* this is just for sample purpose to demonstarate how we can sent data to specific topic which client
     and subscribe and listen for */
  // @Post('bell')
  // async sentToClient() {
  //   try {
  //     return this.client.emit('user_id_topic', `{msg:asati}`).pipe(
  //       map((data) => {
  //         return `Notification sent successfully!`;
  //       }),
  //     );
  //   } catch (e) {
  //     return e;
  //   }
  // }
}
