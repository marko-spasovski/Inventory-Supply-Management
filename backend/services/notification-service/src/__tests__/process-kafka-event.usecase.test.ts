import { firstValueFrom, of, Subject } from 'rxjs';
import { toArray } from 'rxjs/operators';
import { ProcessKafkaEventUseCase } from '../application/use-cases/process-kafka-event.usecase';
import { NotificationRepository } from '../domain/repository/notification.repository';
import { NotificationBroadcaster } from '../application/ports/in/notification-broadcaster.port';
import { Notification } from '../domain/entites/notification.entity';
import { KafkaEvent } from '../domain/events/kafka-event.types';

function makeRepo(): NotificationRepository {
  return {
    save: jest.fn((n: Notification) => of(n)),
    findAll: jest.fn(),
    findUnread: jest.fn(),
    markAsRead: jest.fn(),
    markAllAsRead: jest.fn(),
  } as unknown as NotificationRepository;
}

function makeBroadcaster(): NotificationBroadcaster & { broadcast: jest.Mock } {
  return { broadcast: jest.fn() };
}

describe('ProcessKafkaEventUseCase', () => {
  it('maps order.created → ORDER/info notification', async () => {
    const repo = makeRepo();
    const broadcaster = makeBroadcaster();
    const usecase = new ProcessKafkaEventUseCase(repo, broadcaster);

    const event: KafkaEvent = {
      topic: 'order.created',
      payload: {
        orderId: 'o-1', companyId: 'c-1', companyName: 'Acme',
        warehouseId: 'w-1', status: 'REQUESTED', createdAt: '2026-01-01T00:00:00Z',
      },
    };

    const result = await firstValueFrom(usecase.execute(of(event)));

    expect(result.category).toBe('ORDER');
    expect(result.severity).toBe('info');
    expect(result.title).toBe('New order received');
    expect(result.message).toContain('Acme');
    expect(result.resourceId).toBe('o-1');
    expect(repo.save).toHaveBeenCalledTimes(1);
    expect(broadcaster.broadcast).toHaveBeenCalledWith(result);
  });

  it('maps order.status.changed → ORDER, severity by new status', async () => {
    const usecase = new ProcessKafkaEventUseCase(makeRepo(), makeBroadcaster());
    const event: KafkaEvent = {
      topic: 'order.status.changed',
      payload: { orderId: 'o-1', oldStatus: 'REQUESTED', newStatus: 'DELIVERED', changedAt: 'now' },
    };

    const result = await firstValueFrom(usecase.execute(of(event)));
    expect(result.category).toBe('ORDER');
    expect(result.severity).toBe('success');
    expect(result.message).toContain('REQUESTED');
    expect(result.message).toContain('DELIVERED');
  });

  it('maps rejected status to error severity', async () => {
    const usecase = new ProcessKafkaEventUseCase(makeRepo(), makeBroadcaster());
    const event: KafkaEvent = {
      topic: 'order.status.changed',
      payload: { orderId: 'o-1', oldStatus: 'REQUESTED', newStatus: 'REJECTED', changedAt: 'now' },
    };

    const result = await firstValueFrom(usecase.execute(of(event)));
    expect(result.severity).toBe('error');
  });

  it('maps inventory.low → INVENTORY/warning', async () => {
    const usecase = new ProcessKafkaEventUseCase(makeRepo(), makeBroadcaster());
    const event: KafkaEvent = {
      topic: 'inventory.low',
      payload: { warehouseId: 'w-1', capacityLeft: 5 },
    };

    const result = await firstValueFrom(usecase.execute(of(event)));
    expect(result.category).toBe('INVENTORY');
    expect(result.severity).toBe('warning');
    expect(result.message).toContain('5 units left');
    expect(result.resourceId).toBe('w-1');
  });

  it('maps inventory.out → INVENTORY/error', async () => {
    const usecase = new ProcessKafkaEventUseCase(makeRepo(), makeBroadcaster());
    const event: KafkaEvent = {
      topic: 'inventory.out',
      payload: { warehouseId: 'w-1' },
    };

    const result = await firstValueFrom(usecase.execute(of(event)));
    expect(result.severity).toBe('error');
  });

  it('throws on unknown topic', () => {
    const usecase = new ProcessKafkaEventUseCase(makeRepo(), makeBroadcaster());
    const subj = new Subject<KafkaEvent>();

    const collected = firstValueFrom(usecase.execute(subj.asObservable()).pipe(toArray()));
    subj.next({ topic: 'unknown.topic' as never, payload: {} as never });
    subj.complete();

    return expect(collected).rejects.toThrow(/Unhandled topic/);
  });

  it('processes multiple events in order', async () => {
    const repo = makeRepo();
    const broadcaster = makeBroadcaster();
    const usecase = new ProcessKafkaEventUseCase(repo, broadcaster);

    const events: KafkaEvent[] = [
      { topic: 'inventory.low', payload: { warehouseId: 'w-1', capacityLeft: 5 } },
      { topic: 'inventory.out', payload: { warehouseId: 'w-2' } },
    ];

    const results = await firstValueFrom(usecase.execute(of(...events)).pipe(toArray()));

    expect(results).toHaveLength(2);
    expect(repo.save).toHaveBeenCalledTimes(2);
    expect(broadcaster.broadcast).toHaveBeenCalledTimes(2);
  });
});
