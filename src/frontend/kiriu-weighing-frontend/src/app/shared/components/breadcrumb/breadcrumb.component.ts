import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  WeighingFlowService,
  BreadcrumbItem,
} from '../../../features/weighing/services/weighing-flow.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-breadcrumb',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './breadcrumb.component.html',
  styleUrls: ['./breadcrumb.component.scss'],
})
export class BreadcrumbComponent implements OnInit, OnDestroy {
  private weighingFlowService = inject(WeighingFlowService);
  private router = inject(Router);
  private subscription = new Subscription();

  breadcrumbItems: BreadcrumbItem[] = [];

  ngOnInit(): void {
    // Suscribirse a cambios en el breadcrumb
    this.subscription.add(
      this.weighingFlowService.breadcrumb$.subscribe((items) => {
        this.breadcrumbItems = items;
      })
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  onBreadcrumbClick(item: BreadcrumbItem): void {
    if (item.isClickable && item.route) {
      this.router.navigate(item.route);
    }
  }

  isLastItem(item: BreadcrumbItem): boolean {
    return (
      this.breadcrumbItems.indexOf(item) === this.breadcrumbItems.length - 1
    );
  }
}
