import { Component, input, output } from '@angular/core';

/**
 * Presentational component for brightness controls
 * Pure component with no internal state or business logic
 */
@Component({
    selector: 'pz-brightness-controls',
    standalone: true,
    template: `
        <div class="pz-brightness-controls">
            <div
                class="pz-brightness-button pz-brightness-decrease"
                [class.pz-brightness-button-disabled]="atMin()"
                (click)="decrease.emit()"
                (keydown.enter)="decrease.emit()"
                (keydown.space)="decrease.emit(); $event.preventDefault()"
                role="button"
                aria-label="Decrease brightness"
                tabindex="0"
            ></div>
            <div
                class="pz-brightness-button pz-brightness-increase"
                [class.pz-brightness-button-disabled]="atMax()"
                (click)="increase.emit()"
                (keydown.enter)="increase.emit()"
                (keydown.space)="increase.emit(); $event.preventDefault()"
                role="button"
                aria-label="Increase brightness"
                tabindex="0"
            ></div>
        </div>
    `,
    styles: [],
})
export class BrightnessControlsComponent {
    // Inputs
    atMin = input<boolean>(false);
    atMax = input<boolean>(false);

    // Outputs
    increase = output<void>();
    decrease = output<void>();
}
