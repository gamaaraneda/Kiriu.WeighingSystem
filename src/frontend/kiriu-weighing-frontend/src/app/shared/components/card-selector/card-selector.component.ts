import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface CardSelectorData {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  icon: string;
  iconClass: string;
  buttonText: string;
  buttonClass: string;
}

@Component({
  selector: 'app-card-selector',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './card-selector.component.html',
  styleUrls: ['./card-selector.component.scss'],
})
export class CardSelectorComponent {
  @Input() card!: CardSelectorData;
  @Output() cardSelected = new EventEmitter<CardSelectorData>();

  /**
   * Maneja el click en la tarjeta
   */
  onCardClick(): void {
    this.cardSelected.emit(this.card);
  }
}
