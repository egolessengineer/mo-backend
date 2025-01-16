import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { map } from 'rxjs';

@Injectable()
export class MqttService {
  constructor(@Inject('notificationProxy') private client: ClientProxy) {}

  async sentToClient(pattern, message) {
    try {
      return this.client.emit(pattern, message).pipe(
        map((data: any) => {
          return `Notification sent successfully!` + data;
        }),
      );
    } catch (e) {
      return e;
    }
  }
}
