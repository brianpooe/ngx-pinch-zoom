import { Component, signal, computed, viewChild } from '@angular/core';
import { PinchZoomComponent } from '@brianpooe/ngx-pinch-zoom';

/**
 * Example app demonstrating all ngx-pinch-zoom features.
 * Uses Angular 20 standalone component with signals.
 */
@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.sass'],
    standalone: true,
    imports: [PinchZoomComponent],
})
export class AppComponent {
    title = 'ivypinchApp';

    // Use signals for reactive state management (general examples)
    zoomstate = signal(1);
    brightnessstate = signal(1.0);

    // Separate state for custom controls example
    customZoomState = signal(1);
    customBrightnessState = signal(1.0);

    // Reference to custom controls pinch-zoom instance
    customPinch = viewChild<PinchZoomComponent>('customPinch');

    // Custom controls configuration
    private readonly MIN_ZOOM = 1;
    private readonly MIN_BRIGHTNESS = 1.0;
    private readonly MAX_BRIGHTNESS = 2.0;

    // Computed signals for button states
    isZoomAtMin = computed(() => this.customZoomState() <= this.MIN_ZOOM);
    isBrightnessAtMin = computed(() => this.customBrightnessState() <= this.MIN_BRIGHTNESS);
    isBrightnessAtMax = computed(() => this.customBrightnessState() >= this.MAX_BRIGHTNESS);

    onZoomChanged(zoom: number): void {
        this.zoomstate.set(zoom);
    }

    onBrightnessChanged(brightness: number): void {
        this.brightnessstate.set(brightness);
    }

    // Custom controls event handlers
    onCustomZoomChanged(zoom: number): void {
        this.customZoomState.set(zoom);
    }

    onCustomBrightnessChanged(brightness: number): void {
        this.customBrightnessState.set(brightness);
    }

    // Custom control handlers with min/max and reset behavior
    handleZoomIn(): void {
        const pinch = this.customPinch();
        if (!pinch) return;

        const maxScale = pinch.maxScale();
        const currentScale = this.customZoomState();

        if (currentScale >= maxScale) {
            // At max, reset to min
            pinch.destroy();
        } else {
            pinch.zoomIn(0.5);
        }
    }

    handleZoomOut(): void {
        const pinch = this.customPinch();
        if (!pinch || this.isZoomAtMin()) return;

        pinch.zoomOut(0.5);
    }

    handleBrightnessIn(): void {
        const pinch = this.customPinch();
        if (!pinch) return;

        if (this.isBrightnessAtMax()) {
            // At max, reset to normal (1.0)
            pinch.resetBrightness();
        } else {
            pinch.brightnessIn();
        }
    }

    handleBrightnessOut(): void {
        const pinch = this.customPinch();
        if (!pinch || this.isBrightnessAtMin()) return;

        pinch.brightnessOut();
    }
}
