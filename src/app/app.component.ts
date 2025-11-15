import { Component } from '@angular/core';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.sass'],
    standalone: false,
})
export class AppComponent {
    title = 'ivypinchApp';
    public zoomstate = 1;
    public brightnessstate = 1.0;

    onZoomChanged(zoom: number) {
        this.zoomstate = zoom;
    }

    onBrightnessChanged(brightness: number) {
        this.brightnessstate = brightness;
    }
}
