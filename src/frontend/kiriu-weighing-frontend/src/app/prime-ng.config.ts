import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

// PrimeNG Basic Components
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { PasswordModule } from 'primeng/password';
import { CheckboxModule } from 'primeng/checkbox';
import { RadioButtonModule } from 'primeng/radiobutton';
import { SliderModule } from 'primeng/slider';
import { RatingModule } from 'primeng/rating';

// PrimeNG Layout Components
import { CardModule } from 'primeng/card';
import { PanelModule } from 'primeng/panel';
import { DividerModule } from 'primeng/divider';
import { ToolbarModule } from 'primeng/toolbar';
import { MenuModule } from 'primeng/menu';
import { MenubarModule } from 'primeng/menubar';
import { BreadcrumbModule } from 'primeng/breadcrumb';

// PrimeNG Data Display Components
import { TableModule } from 'primeng/table';
import { ProgressBarModule } from 'primeng/progressbar';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TagModule } from 'primeng/tag';

// PrimeNG Feedback Components
import { MessageModule } from 'primeng/message';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { TooltipModule } from 'primeng/tooltip';
import { BlockUIModule } from 'primeng/blockui';

// PrimeNG Utils
import { RippleModule } from 'primeng/ripple';
import { StyleClassModule } from 'primeng/styleclass';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,

    // Form Components
    ButtonModule,
    InputTextModule,
    InputNumberModule,
    PasswordModule,
    CheckboxModule,
    RadioButtonModule,
    SliderModule,
    RatingModule,

    // Layout Components
    CardModule,
    PanelModule,
    DividerModule,
    ToolbarModule,
    MenuModule,
    MenubarModule,
    BreadcrumbModule,

    // Data Display Components
    TableModule,
    ProgressBarModule,
    ProgressSpinnerModule,
    TagModule,

    // Feedback Components
    MessageModule,
    ToastModule,
    ConfirmDialogModule,
    DialogModule,
    TooltipModule,
    BlockUIModule,

    // Utils
    RippleModule,
    StyleClassModule,
  ],
  exports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,

    // Form Components
    ButtonModule,
    InputTextModule,
    InputNumberModule,
    PasswordModule,
    CheckboxModule,
    RadioButtonModule,
    SliderModule,
    RatingModule,

    // Layout Components
    CardModule,
    PanelModule,
    DividerModule,
    ToolbarModule,
    MenuModule,
    MenubarModule,
    BreadcrumbModule,

    // Data Display Components
    TableModule,
    ProgressBarModule,
    ProgressSpinnerModule,
    TagModule,

    // Feedback Components
    MessageModule,
    ToastModule,
    ConfirmDialogModule,
    DialogModule,
    TooltipModule,
    BlockUIModule,

    // Utils
    RippleModule,
    StyleClassModule,
  ],
})
export class PrimeNGModule {}

// Export individual modules for specific use cases
export {
  ButtonModule,
  InputTextModule,
  InputNumberModule,
  PasswordModule,
  CheckboxModule,
  RadioButtonModule,
  SliderModule,
  RatingModule,
  CardModule,
  PanelModule,
  DividerModule,
  ToolbarModule,
  MenuModule,
  MenubarModule,
  BreadcrumbModule,
  TableModule,
  ProgressBarModule,
  ProgressSpinnerModule,
  TagModule,
  MessageModule,
  ToastModule,
  ConfirmDialogModule,
  DialogModule,
  TooltipModule,
  BlockUIModule,
  RippleModule,
  StyleClassModule,
};
