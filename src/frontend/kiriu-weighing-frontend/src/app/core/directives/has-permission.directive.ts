import {
  Directive,
  Input,
  TemplateRef,
  ViewContainerRef,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { Subscription } from 'rxjs';
import { PermissionsService } from '../services/permissions.service';

@Directive({
  selector: '[appHasPermission]',
  standalone: true,
})
export class HasPermissionDirective implements OnInit, OnDestroy {
  private subscription?: Subscription;
  private permissions: string | string[] = '';
  private requireAll: boolean = false;

  constructor(
    private templateRef: TemplateRef<any>,
    private viewContainer: ViewContainerRef,
    private permissionsService: PermissionsService
  ) {}

  @Input() set appHasPermission(permissions: string | string[]) {
    this.permissions = permissions;
    this.updateView();
  }

  @Input() set appHasPermissionRequireAll(requireAll: boolean) {
    this.requireAll = requireAll;
    this.updateView();
  }

  ngOnInit(): void {
    this.updateView();

    // Escuchar cambios en el localStorage para actualizar permisos en tiempo real
    window.addEventListener('storage', this.handleStorageChange.bind(this));
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
    window.removeEventListener('storage', this.handleStorageChange.bind(this));
  }

  private handleStorageChange(event: StorageEvent): void {
    if (event.key === 'kiriu-user') {
      this.updateView();
    }
  }

  private updateView(): void {
    // Siempre limpiar la vista anterior antes de crear una nueva
    this.viewContainer.clear();

    if (this.hasPermission()) {
      this.viewContainer.createEmbeddedView(this.templateRef);
    }
  }

  private hasPermission(): boolean {
    if (!this.permissions) {
      return false;
    }

    if (Array.isArray(this.permissions)) {
      return this.requireAll
        ? this.permissionsService.hasAllPermissions(this.permissions)
        : this.permissionsService.hasAnyPermission(this.permissions);
    } else {
      return this.permissionsService.hasPermission(this.permissions);
    }
  }
}
