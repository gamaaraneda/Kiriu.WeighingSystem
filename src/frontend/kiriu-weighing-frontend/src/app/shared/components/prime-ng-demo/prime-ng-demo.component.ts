import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PrimeNGModule } from '../../../prime-ng.config';

@Component({
  selector: 'app-prime-ng-demo',
  standalone: true,
  imports: [CommonModule, FormsModule, PrimeNGModule],
  templateUrl: './prime-ng-demo.component.html',
  styleUrls: ['./prime-ng-demo.component.scss'],
})
export class PrimeNgDemoComponent {
  // Form data
  name: string = '';
  email: string = '';
  weight: number = 0;
  rating: number = 0;
  accepted: boolean = false;
  gender: string = '';
  description: string = '';

  // Table data
  products = [
    { code: 'P001', name: 'Producto 1', price: 100.5, category: 'Categoría A' },
    {
      code: 'P002',
      name: 'Producto 2',
      price: 200.75,
      category: 'Categoría B',
    },
    {
      code: 'P003',
      name: 'Producto 3',
      price: 150.25,
      category: 'Categoría A',
    },
    { code: 'P004', name: 'Producto 4', price: 300.0, category: 'Categoría C' },
    { code: 'P005', name: 'Producto 5', price: 175.8, category: 'Categoría B' },
  ];

  // Loading state
  isLoading = false;

  // Methods
  save() {
    console.log('Guardando datos...', {
      name: this.name,
      email: this.email,
      weight: this.weight,
      rating: this.rating,
      accepted: this.accepted,
      gender: this.gender,
      description: this.description,
    });
  }

  simulateLoading() {
    this.isLoading = true;
    setTimeout(() => {
      this.isLoading = false;
    }, 2000);
  }

  deleteProduct(product: any) {
    console.log('Eliminando producto:', product);
    this.products = this.products.filter((p) => p.code !== product.code);
  }

  editProduct(product: any) {
    console.log('Editando producto:', product);
  }

  clearForm() {
    this.name = '';
    this.email = '';
    this.weight = 0;
    this.rating = 0;
    this.accepted = false;
    this.gender = '';
    this.description = '';
  }

  getCategorySeverity(category: string): string {
    switch (category) {
      case 'Categoría A':
        return 'success';
      case 'Categoría B':
        return 'info';
      case 'Categoría C':
        return 'warn';
      default:
        return 'secondary';
    }
  }
}
