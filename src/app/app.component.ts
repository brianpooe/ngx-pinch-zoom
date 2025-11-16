import { Component, signal, computed, viewChild, effect } from '@angular/core';
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
    private readonly ZOOM_STEP = 0.5;
    private readonly MIN_BRIGHTNESS = 1.0;
    private readonly MAX_BRIGHTNESS = 3.0;

    // Computed signals for button states
    isZoomAtMin = computed(() => {
        const zoom = this.customZoomState();
        return zoom <= this.MIN_ZOOM + 0.01; // Small tolerance for float comparison
    });

    isBrightnessAtMin = computed(() => this.customBrightnessState() <= this.MIN_BRIGHTNESS);
    isBrightnessAtMax = computed(() => this.customBrightnessState() >= this.MAX_BRIGHTNESS);

    constructor() {
        // Ensure initial zoom state is properly set when component loads
        effect(() => {
            const pinch = this.customPinch();
            if (pinch) {
                // Sync initial state if not already synced
                const currentScale = pinch.scale();
                if (this.customZoomState() !== currentScale) {
                    this.customZoomState.set(currentScale);
                }
            }
        });
    }

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

        const currentScale = this.customZoomState();

        // Try to zoom in and check the result
        const newScale = pinch.zoomIn(this.ZOOM_STEP);

        // If scale didn't change (much), we're at max, so reset
        if (Math.abs(newScale - currentScale) < 0.01) {
            pinch.destroy();
            this.customZoomState.set(1); // Manually reset state
        }
    }

    handleZoomOut(): void {
        const pinch = this.customPinch();
        if (!pinch) return;

        const currentScale = this.customZoomState();

        // Don't allow going below min
        if (currentScale <= this.MIN_ZOOM) return;

        pinch.zoomOut(this.ZOOM_STEP);
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
