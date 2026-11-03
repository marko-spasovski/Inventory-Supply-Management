import { Subject, Observable } from 'rxjs';
import { share, filter } from 'rxjs/operators';
import { Kafka, Consumer, EachMessagePayload } from 'kafkajs';
import { KafkaEvent, KafkaTopic } from '../../domain/events/kafka-event.types';
import { config } from '../config/config';

export class KafkaConsumerStream {
  private readonly kafka: Kafka;
  private consumer!: Consumer;

  // The single bridge between the imperative KafkaJS world and RxJS
  private readonly subject$ = new Subject<KafkaEvent>();

  // share() — all subscribers share one underlying Kafka connection
  readonly messages$: Observable<KafkaEvent> = this.subject$.pipe(share());

  constructor() {
    this.kafka = new Kafka({
      clientId: config.kafka.clientId,
      brokers:  config.kafka.brokers,
    });
  }

  // Type-safe filtered stream for a specific topic
  topic$<T extends KafkaTopic>(
    topic: T
  ): Observable<Extract<KafkaEvent, { topic: T }>> {
    return this.messages$.pipe(
      filter((e): e is Extract<KafkaEvent, { topic: T }> => e.topic === topic),
    );
  }

  async connect(): Promise<void> {
    this.consumer = this.kafka.consumer({ groupId: config.kafka.groupId });
    await this.consumer.connect();
    console.log('[Kafka] connected');

    const topics = Object.values(config.kafka.topics);
    await this.consumer.subscribe({ topics, fromBeginning: false });
    console.log('[Kafka] subscribed to:', topics);

    await this.consumer.run({
      eachMessage: async ({ topic, message }: EachMessagePayload) => {
        if (!message.value) return;
        try {
          const payload = JSON.parse(message.value.toString());
          // Only crossing here — from callback world into Observable world
          this.subject$.next({ topic, payload } as KafkaEvent);
        } catch (err) {
          console.error(`[Kafka] parse error on "${topic}":`, err);
        }
      },
    });
  }

  async disconnect(): Promise<void> {
    this.subject$.complete();
    await this.consumer?.disconnect();
    console.log('[Kafka] disconnected');
  }
}