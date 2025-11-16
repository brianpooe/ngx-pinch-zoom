import { Component, input, output } from '@angular/core';

/**
 * Presentational component for zoom controls
 * Pure component with no internal state or business logic
 */
@Component({
    selector: 'pz-zoom-controls',
    standalone: true,
    template: `
        <div
            class="pz-zoom-button"
            [class.pz-zoom-button-out]="isZoomedIn()"
            (click)="toggle.emit()"
            (keydown.enter)="toggle.emit()"
            (keydown.space)="toggle.emit(); $event.preventDefault()"
            role="button"
            [attr.aria-label]="isZoomedIn() ? 'Zoom out' : 'Zoom in'"
            tabindex="0"
        ></div>
    `,
    styles: [],
})
export class ZoomControlsComponent {
    // Inputs
    isZoomedIn = input<boolean>(false);

    // Outputs
    toggle = output<void>();
}
