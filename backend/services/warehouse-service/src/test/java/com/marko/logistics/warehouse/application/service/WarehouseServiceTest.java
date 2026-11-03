    package com.marko.logistics.warehouse.application.service;

    import com.marko.logistics.warehouse.application.dto.CreateWarehouseRequest;
    import com.marko.logistics.warehouse.application.dto.UpdateWarehouseRequest;
    import com.marko.logistics.warehouse.application.dto.WarehouseResponse;
    import com.marko.logistics.warehouse.application.port.out.WarehouseRepositoryPort;
    import com.marko.logistics.warehouse.domain.enums.City;
    import com.marko.logistics.warehouse.domain.enums.Country;
    import com.marko.logistics.warehouse.domain.exception.WarehouseNotFoundException;
    import com.marko.logistics.warehouse.domain.model.Warehouse;
    import com.marko.logistics.warehouse.infrastructure.messaging.InventoryKafkaProducer;
    import org.apache.kafka.clients.producer.KafkaProducer;
    import org.junit.jupiter.api.BeforeEach;
    import org.junit.jupiter.api.Test;

    import java.util.List;
    import java.util.Optional;
    import java.util.UUID;

    import static org.junit.jupiter.api.Assertions.assertEquals;
    import static org.junit.jupiter.api.Assertions.assertThrows;
    import static org.mockito.ArgumentMatchers.any;
    import static org.mockito.Mockito.*;

    public class WarehouseServiceTest {
        private WarehouseRepositoryPort repository;
        private WarehouseService service;
        private InventoryKafkaProducer kafkaProducer;

        @BeforeEach
        void setUp() {
            repository = mock(WarehouseRepositoryPort.class);
            service = new WarehouseService(repository, kafkaProducer);
        }

        @Test
        void createWarehouse_returnsWarehouseResponse(){
            CreateWarehouseRequest request = new CreateWarehouseRequest("W1", Country.SLOVENIA, City.MARIBOR, 100);
            when(repository.save(any())).thenAnswer(i -> i.getArgument(0));

            WarehouseResponse response = service.createWarehouse(request);

            assertEquals("W1", response.name());
            assertEquals(100, response.totalCapacity());
            verify(repository, times(1)).save(any());
        }

        @Test
        void updateWarehouse_updatesWarehouse() {
            UUID id = UUID.randomUUID();
            Warehouse warehouse = Warehouse.create("Old", Country.SLOVENIA, City.MARIBOR, 50);
            UpdateWarehouseRequest request = new UpdateWarehouseRequest("New", Country.SLOVENIA, City.MARIBOR, 150, 0);

            when(repository.findById(id)).thenReturn(Optional.of(warehouse));
            when(repository.save(any())).thenAnswer(i -> i.getArgument(0));

            WarehouseResponse response = service.updateWarehouse(id, request);

            assertEquals("New", response.name());
            assertEquals(150, response.totalCapacity());
            verify(repository, times(1)).save(warehouse);
        }

        @Test
        void updateWarehouse_throwsExceptionIfNotFound() {
            UUID id = UUID.randomUUID();
            UpdateWarehouseRequest request = new UpdateWarehouseRequest("New", Country.SLOVENIA, City.MARIBOR, 150, 0);

            when(repository.findById(id)).thenReturn(Optional.empty());

            assertThrows(WarehouseNotFoundException.class, () -> service.updateWarehouse(id, request));
        }

        @Test
        void deleteWarehouseById_deletesWarehouse() {
            UUID id = UUID.randomUUID();
            Warehouse warehouse = Warehouse.create("Delete", Country.SLOVENIA, City.MARIBOR, 10);

            when(repository.findById(id)).thenReturn(Optional.of(warehouse));
            doNothing().when(repository).deleteById(id);

            service.deleteWarehouseById(id);
            verify(repository, times(1)).deleteById(id);
        }

        @Test
        void deleteWarehouseById_throwsIfNotFound() {
            UUID id = UUID.randomUUID();
            when(repository.findById(id)).thenReturn(Optional.empty());

            assertThrows(WarehouseNotFoundException.class, () -> service.deleteWarehouseById(id));
            verify(repository, never()).deleteById(any());
        }

        @Test
        void getAllWarehouses_returnsAll() {
            Warehouse w1 = Warehouse.create("W1", Country.SLOVENIA, City.MARIBOR, 100);
            Warehouse w2 = Warehouse.create("W2", Country.SLOVENIA, City.LJUBLJANA, 200);

            when(repository.findAll()).thenReturn(List.of(w1, w2));

            List<WarehouseResponse> all = service.getAllWarehouses();
            assertEquals(2, all.size());
            assertEquals("W1", all.get(0).name());
        }

        @Test
        void getWarehouseById_returnsWarehouse() {
            UUID id = UUID.randomUUID();
            Warehouse w = Warehouse.create("W", Country.SLOVENIA, City.MARIBOR, 100);
            when(repository.findById(id)).thenReturn(Optional.of(w));

            WarehouseResponse response = service.getWarehouseById(id);

            assertEquals("W", response.name());
        }

        @Test
        void getWarehouseById_throwsIfNotFound() {
            UUID id = UUID.randomUUID();
            when(repository.findById(id)).thenReturn(Optional.empty());

            assertThrows(WarehouseNotFoundException.class, () -> service.getWarehouseById(id));
        }
    }
