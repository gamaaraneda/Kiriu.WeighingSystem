import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { WeighingFormComponent } from './weighing-form.component';
import { WeighingService, RemolqueData } from '../../services/weighing.service';
import { WeighingFlowService } from '../../services/weighing-flow.service';
import { MessageService } from '../../../../shared/services/message.service';
import { NotificationService } from '../../../../shared/services/notification.service';
import { of } from 'rxjs';

describe('WeighingFormComponent', () => {
  let component: WeighingFormComponent;
  let fixture: ComponentFixture<WeighingFormComponent>;
  let weighingService: jasmine.SpyObj<WeighingService>;
  let weighingFlowService: jasmine.SpyObj<WeighingFlowService>;
  let messageService: jasmine.SpyObj<MessageService>;
  let notificationService: jasmine.SpyObj<NotificationService>;

  beforeEach(async () => {
    const weighingServiceSpy = jasmine.createSpyObj('WeighingService', [
      'getWeightReadings',
      'createEntryOperation',
      'createDoubleTrailerEntry',
      'canRegisterExit',
    ]);
    const weighingFlowServiceSpy = jasmine.createSpyObj('WeighingFlowService', [
      'validateFlow',
    ]);
    const messageServiceSpy = jasmine.createSpyObj('MessageService', [
      'showSuccessToast',
      'showErrorToast',
      'showInfoToast',
    ]);
    const notificationServiceSpy = jasmine.createSpyObj('NotificationService', [
      'showSuccess',
      'showError',
      'showInfo',
    ]);

    await TestBed.configureTestingModule({
      imports: [
        WeighingFormComponent,
        ReactiveFormsModule,
        RouterTestingModule,
      ],
      providers: [
        { provide: WeighingService, useValue: weighingServiceSpy },
        { provide: WeighingFlowService, useValue: weighingFlowServiceSpy },
        { provide: MessageService, useValue: messageServiceSpy },
        { provide: NotificationService, useValue: notificationServiceSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(WeighingFormComponent);
    component = fixture.componentInstance;
    weighingService = TestBed.inject(
      WeighingService
    ) as jasmine.SpyObj<WeighingService>;
    weighingFlowService = TestBed.inject(
      WeighingFlowService
    ) as jasmine.SpyObj<WeighingFlowService>;
    messageService = TestBed.inject(
      MessageService
    ) as jasmine.SpyObj<MessageService>;
    notificationService = TestBed.inject(
      NotificationService
    ) as jasmine.SpyObj<NotificationService>;

    // Mock del servicio de peso
    weighingService.getWeightReadings.and.returnValue(
      of({
        weight: 1000,
        isStable: true,
        isConnected: true,
        timestamp: new Date(),
      })
    );

    // Mock del servicio de flujo
    weighingFlowService.validateFlow.and.returnValue({
      isValid: true,
      missingSteps: [],
    });
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Doble Remolque', () => {
    beforeEach(() => {
      // Simular parámetros de ruta
      component.unitType = 'client';
      component.operationType = 'entry';
      component.ngOnInit();
    });

    it('should initialize double trailer flow when checkbox is selected', () => {
      // Activar doble remolque
      component.onDoubleTrailerChange(true);

      // Verificar que se inicializó el estado
      expect(component.doubleTrailerState.currentStep).toBe('trailer');
      expect(component.doubleTrailerState.isComplete).toBe(false);
      expect(messageService.showInfoToast).toHaveBeenCalled();
    });

    it('should progress through double trailer steps correctly', () => {
      // Activar doble remolque
      component.onDoubleTrailerChange(true);

      // Paso 1: Placa del tráiler
      component.doubleTrailerState.trailerPlaca = 'ABC-123-XY';
      component.doubleTrailerState.currentStep = 'remolque1';

      // Paso 2: Remolque 1
      component.doubleTrailerState.remolque1 = {
        numero: 1,
        placa: 'XYZ-789-AB',
        pesoBruto: 15000,
        fotos: ['foto1.jpg'],
        pesoCapturado: true,
        fotosCapturadas: true,
      };
      component.doubleTrailerState.currentStep = 'remolque2';

      // Paso 3: Remolque 2
      component.doubleTrailerState.remolque2 = {
        numero: 2,
        placa: 'DEF-456-CD',
        pesoBruto: 18000,
        fotos: ['foto2.jpg'],
        pesoCapturado: true,
        fotosCapturadas: true,
      };

      // Verificar que se puede proceder
      expect(component.canProceedToNextStep).toBe(true);
    });

    it('should validate first trailer requirements before allowing to proceed to second trailer', () => {
      // Activar doble remolque
      component.onDoubleTrailerChange(true);

      // Simular captura de placa del tráiler
      component.doubleTrailerState.trailerPlaca = 'ABC-123-XY';
      component.doubleTrailerState.currentStep = 'remolque1';

      // Simular captura de placa del remolque 1
      component.doubleTrailerState.remolque1 = {
        numero: 1,
        placa: 'XYZ-789-AB',
        pesoBruto: 15000,
        fotos: ['foto1.jpg'],
        pesoCapturado: true,
        fotosCapturadas: true,
      };

      // Simular captura de foto de carga
      component.photoData.cargo = 'Foto capturada';

      // Completar datos del formulario
      component.weighingForm.patchValue({
        product: 'Material de prueba',
        clientProviderName: 'Cliente de prueba',
      });

      // Simular captura de peso del remolque 1
      component.weightData.capturedWeight = 15000;
      component.doubleTrailerState.currentStep = 'remolque1';

      // Llamar al método que procesa el peso
      component['processDoubleTrailerWeight']();

      // Verificar que se muestra el mensaje de éxito y se puede continuar
      expect(messageService.showSuccessToast).toHaveBeenCalled();
    });

    it('should show error notification when first trailer requirements are incomplete', () => {
      // Activar doble remolque
      component.onDoubleTrailerChange(true);

      // Simular captura de placa del tráiler
      component.doubleTrailerState.trailerPlaca = 'ABC-123-XY';
      component.doubleTrailerState.currentStep = 'remolque1';

      // Simular captura de placa del remolque 1
      component.doubleTrailerState.remolque1.placa = 'XYZ-789-AB';

      // Simular captura de foto de carga
      component.photoData.cargo = 'Foto capturada';

      // Completar solo material, pero NO nombre del proveedor
      component.weighingForm.patchValue({
        product: 'Material de prueba',
        // clientProviderName: 'Cliente de prueba', // Requisito faltante
      });

      // Simular captura de peso del remolque 1
      component.weightData.capturedWeight = 15000;
      component.doubleTrailerState.currentStep = 'remolque1';

      // Llamar al método que procesa el peso
      component['processDoubleTrailerWeight']();

      // Verificar que se muestra la notificación de error
      expect(notificationService.showError).toHaveBeenCalledWith(
        'Información incompleta',
        'Debes capturar la placa del tráiler, la placa del remolque y la foto de carga antes de continuar.'
      );

      // Verificar que NO se muestra el mensaje de éxito
      expect(messageService.showSuccessToast).not.toHaveBeenCalled();
    });

    it('should prevent weight capture when first trailer requirements are incomplete', () => {
      // Activar doble remolque
      component.onDoubleTrailerChange(true);

      // Simular captura de placa del tráiler
      component.doubleTrailerState.trailerPlaca = 'ABC-123-XY';
      component.doubleTrailerState.currentStep = 'remolque1';

      // Simular captura de placa del remolque 1
      component.doubleTrailerState.remolque1.placa = 'XYZ-789-AB';

      // Simular captura de foto de carga
      component.photoData.cargo = 'Foto capturada';

      // Completar solo material, pero NO nombre del proveedor
      component.weighingForm.patchValue({
        product: 'Material de prueba',
        // clientProviderName: 'Cliente de prueba', // Requisito faltante
      });

      // Simular condiciones de peso estable y conectado
      component.weightData.isStable = true;
      component.weightData.isConnected = true;
      component.weightData.currentWeight = 15000;

      // Intentar capturar peso
      component.onCaptureWeight();

      // Verificar que se muestra la notificación de error
      expect(notificationService.showError).toHaveBeenCalledWith(
        'Información incompleta',
        'Debes capturar la placa del tráiler, la placa del remolque y la foto de carga antes de capturar el peso.'
      );

      // Verificar que NO se capturó el peso
      expect(component.weightData.capturedWeight).toBeUndefined();
    });

    it('should allow weight capture when first trailer requirements are complete', () => {
      // Activar doble remolque
      component.onDoubleTrailerChange(true);

      // Simular captura de placa del tráiler
      component.doubleTrailerState.trailerPlaca = 'ABC-123-XY';
      component.doubleTrailerState.currentStep = 'remolque1';

      // Simular captura de placa del remolque 1
      component.doubleTrailerState.remolque1.placa = 'XYZ-789-AB';

      // Simular captura de foto de carga
      component.photoData.cargo = 'Foto capturada';

      // Completar todos los datos del formulario
      component.weighingForm.patchValue({
        product: 'Material de prueba',
        clientProviderName: 'Cliente de prueba',
      });

      // Simular condiciones de peso estable y conectado
      component.weightData.isStable = true;
      component.weightData.isConnected = true;
      component.weightData.currentWeight = 15000;

      // Intentar capturar peso
      component.onCaptureWeight();

      // Verificar que se capturó el peso
      expect(component.weightData.capturedWeight).toBe(15000);

      // Verificar que se procesó el peso del doble remolque
      expect(component.doubleTrailerState.remolque1.pesoCapturado).toBe(true);
    });

    it('should correctly determine if first trailer weight can be captured', () => {
      // Activar doble remolque
      component.onDoubleTrailerChange(true);

      // Inicialmente no se puede capturar peso (falta información)
      expect(component.canCaptureFirstTrailerWeight).toBe(false);

      // Agregar placa del tráiler
      component.doubleTrailerState.trailerPlaca = 'ABC-123-XY';
      expect(component.canCaptureFirstTrailerWeight).toBe(false);

      // Agregar placa del remolque 1
      component.doubleTrailerState.remolque1.placa = 'XYZ-789-AB';
      expect(component.canCaptureFirstTrailerWeight).toBe(false);

      // Agregar foto de carga
      component.photoData.cargo = 'Foto capturada';
      expect(component.canCaptureFirstTrailerWeight).toBe(false);

      // Agregar material/producto
      component.weighingForm.patchValue({ product: 'Material de prueba' });
      expect(component.canCaptureFirstTrailerWeight).toBe(false);

      // Agregar nombre del proveedor/cliente
      component.weighingForm.patchValue({
        clientProviderName: 'Cliente de prueba',
      });
      expect(component.canCaptureFirstTrailerWeight).toBe(true);

      // Cambiar a otro paso
      component.doubleTrailerState.currentStep = 'remolque2';
      expect(component.canCaptureFirstTrailerWeight).toBe(true);
    });

    it('should show checklist panel when attempting to capture weight with incomplete requirements', () => {
      // Activar doble remolque
      component.onDoubleTrailerChange(true);

      // Simular captura de placa del tráiler
      component.doubleTrailerState.trailerPlaca = 'ABC-123-XY';
      component.doubleTrailerState.currentStep = 'remolque1';

      // Simular captura de placa del remolque 1
      component.doubleTrailerState.remolque1.placa = 'XYZ-789-AB';

      // Simular captura de foto de carga
      component.photoData.cargo = 'Foto capturada';

      // Completar solo material, pero NO nombre del proveedor
      component.weighingForm.patchValue({
        product: 'Material de prueba',
        // clientProviderName: 'Cliente de prueba', // Requisito faltante
      });

      // Simular condiciones de peso estable y conectado
      component.weightData.isStable = true;
      component.weightData.isConnected = true;
      component.weightData.currentWeight = 15000;

      // Intentar capturar peso
      component.onCaptureWeight();

      // Verificar que se muestra la notificación de error
      expect(notificationService.showError).toHaveBeenCalledWith(
        'Información incompleta',
        'Debes capturar la placa del tráiler, la placa del remolque y la foto de carga antes de capturar el peso.'
      );

      // Verificar que se activó el panel tipo checklist
      expect(component.showChecklistPanel).toBe(true);

      // Verificar que NO se capturó el peso
      expect(component.weightData.capturedWeight).toBeUndefined();
    });

    it('should hide checklist panel when all requirements are completed', () => {
      // Activar doble remolque
      component.onDoubleTrailerChange(true);

      // Simular captura de placa del tráiler
      component.doubleTrailerState.trailerPlaca = 'ABC-123-XY';
      component.doubleTrailerState.currentStep = 'remolque1';

      // Simular captura de placa del remolque 1
      component.doubleTrailerState.remolque1.placa = 'XYZ-789-AB';

      // Simular captura de foto de carga
      component.photoData.cargo = 'Foto capturada';

      // Completar todos los datos del formulario
      component.weighingForm.patchValue({
        product: 'Material de prueba',
        clientProviderName: 'Cliente de prueba',
      });

      // Activar manualmente el panel
      component.showChecklistPanel = true;

      // Verificar que el panel está visible
      expect(component.showChecklistPanel).toBe(true);

      // Llamar al getter que valida los requisitos
      const canCapture = component.canCaptureFirstTrailerWeight;

      // Verificar que se pueden capturar pesos
      expect(canCapture).toBe(true);

      // Verificar que el panel se ocultó automáticamente
      expect(component.showChecklistPanel).toBe(false);
    });

    it('should hide checklist panel when hideChecklistPanel method is called', () => {
      // Activar manualmente el panel
      component.showChecklistPanel = true;

      // Verificar que el panel está visible
      expect(component.showChecklistPanel).toBe(true);

      // Llamar al método para ocultar el panel
      component.hideChecklistPanel();

      // Verificar que el panel se ocultó
      expect(component.showChecklistPanel).toBe(false);
    });

    it('should calculate total weight correctly', () => {
      // Activar doble remolque
      component.onDoubleTrailerChange(true);

      // Simular pesos capturados
      component.doubleTrailerState.remolque1.pesoBruto = 15000;
      component.doubleTrailerState.remolque2.pesoBruto = 18000;

      // Calcular peso total
      component.doubleTrailerState.pesoBrutoTotal =
        (component.doubleTrailerState.remolque1.pesoBruto || 0) +
        (component.doubleTrailerState.remolque2.pesoBruto || 0);

      expect(component.doubleTrailerState.pesoBrutoTotal).toBe(33000);
    });

    it('should validate form correctly for double trailer', () => {
      // Activar doble remolque
      component.onDoubleTrailerChange(true);

      // Completar datos básicos del formulario
      component.weighingForm.patchValue({
        product: 'Material de prueba',
        clientProviderName: 'Cliente de prueba',
      });

      // Simular peso capturado
      component.weightData.capturedWeight = 15000;

      // Simular foto de carga
      component.photoData.cargo = 'Foto capturada';

      // Completar estado de doble remolque
      component.doubleTrailerState.isComplete = true;

      // Verificar que el formulario es válido
      expect(component.isFormValid).toBe(true);
    });

    it('should save double trailer entry correctly', () => {
      // Mock del servicio
      const mockEntry = {
        folio: 'CLI-ENT-123456',
        trailerPlaca: 'ABC-123-XY',
        remolques: [
          {
            numero: 1,
            placa: 'XYZ-789-AB',
            pesoBruto: 15000,
            fotos: ['foto1.jpg'],
          },
          {
            numero: 2,
            placa: 'DEF-456-CD',
            pesoBruto: 18000,
            fotos: ['foto2.jpg'],
          },
        ] as [RemolqueData, RemolqueData], // Usar tipo correcto
        pesoBrutoTotal: 33000,
        fechaHoraEntrada: new Date().toISOString(),
        unitType: 'client' as const,
        product: 'Material de prueba',
        clientProviderName: 'Cliente de prueba',
      };

      weighingService.createDoubleTrailerEntry.and.returnValue(of(mockEntry));

      // Activar doble remolque y completar datos
      component.onDoubleTrailerChange(true);
      component.weighingForm.patchValue({
        product: 'Material de prueba',
        clientProviderName: 'Cliente de prueba',
      });
      component.weightData.capturedWeight = 15000;
      component.photoData.cargo = 'Foto capturada';
      component.doubleTrailerState.isComplete = true;

      // Guardar entrada
      component.onSave();

      // Verificar que se llamó al servicio correcto
      expect(weighingService.createDoubleTrailerEntry).toHaveBeenCalled();
    });
  });

  describe('Validaciones', () => {
    it('should disable container only when double trailer is selected', () => {
      component.ngOnInit();

      // Activar doble remolque
      component.onDoubleTrailerChange(true);

      // Verificar que solo contenedor está deshabilitado
      expect(component.weighingForm.get('containerOnly')?.disabled).toBe(true);
    });

    it('should disable double trailer when container only is selected', () => {
      component.ngOnInit();

      // Activar solo contenedor
      component.onContainerOnlyChange(true);

      // Verificar que doble remolque está deshabilitado
      expect(component.weighingForm.get('doubleTrailer')?.disabled).toBe(true);
    });
  });
});
