import { Component, signal } from '@angular/core';
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

    // Use signals for reactive state management
    zoomstate = signal(1);
    brightnessstate = signal(1.0);

    onZoomChanged(zoom: number): void {
        this.zoomstate.set(zoom);
    }

    onBrightnessChanged(brightness: number): void {
        this.brightnessstate.set(brightness);
    }
}
