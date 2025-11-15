# ngx-pinch-zoom

[![Angular](https://img.shields.io/badge/Angular-20-red.svg)](https://angular.io/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg)](https://www.typescriptlang.org/)

An Angular library for pinch-to-zoom functionality on touch-enabled devices and mouse interactions. Built with Angular 20+ and modern signals API.

## Features

- 🎯 **Angular 20+ with Signals** - Modern reactive programming
- 📱 **Touch & Mouse Support** - Works on all devices
- 🔄 **Pinch to Zoom** - Natural gesture support
- 🖱️ **Mouse Wheel Zoom** - Desktop-friendly
- 👆 **Double Tap** - Quick zoom in/out
- 🎯 **Click to Zoom** - Click any point to zoom in precisely
- ☀️ **Brightness Control** - Adjust image brightness on the fly
- 🎨 **Highly Configurable** - Extensive options
- 📦 **Standalone Component** - No module imports needed
- ⚡ **Performance Optimized** - Uses signals for reactivity

## Installation

```bash
npm install @meddv/ngx-pinch-zoom
```

## Quick Start

### 1. Import the Component

```typescript
import { Component } from '@angular/core';
import { PinchZoomComponent } from '@meddv/ngx-pinch-zoom';

@Component({
    selector: 'app-root',
    standalone: true,
    imports: [PinchZoomComponent],
    template: `
        <pinch-zoom>
            <img src="path/to/image.jpg" alt="Zoomable image" />
        </pinch-zoom>
    `,
})
export class AppComponent {}
```

### 2. Add Viewport Meta Tag

For proper touch support, add this to your `index.html`:

```html
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1.0, user-scalable=no" />
```

## Usage Examples

### Basic Usage

```html
<pinch-zoom>
    <img src="image.jpg" />
</pinch-zoom>
```

### With Configuration (Using Signals)

```typescript
import { Component, signal } from '@angular/core';
import { PinchZoomComponent } from '@meddv/ngx-pinch-zoom';

@Component({
    selector: 'app-example',
    standalone: true,
    imports: [PinchZoomComponent],
    template: `
        <pinch-zoom
            [transitionDuration]="200"
            [doubleTap]="true"
            [limitZoom]="3"
            [autoZoomOut]="false"
            [disabled]="isDisabled()"
            (zoomChanged)="onZoomChange($event)"
        >
            <img src="image.jpg" />
        </pinch-zoom>
    `,
})
export class ExampleComponent {
    isDisabled = signal(false);

    onZoomChange(scale: number) {
        console.log('Current zoom level:', scale);
    }
}
```

### Programmatic Control

```typescript
import { Component, viewChild } from '@angular/core';
import { PinchZoomComponent } from '@meddv/ngx-pinch-zoom';

@Component({
    selector: 'app-controls',
    standalone: true,
    imports: [PinchZoomComponent],
    template: `
        <pinch-zoom #pinchZoom>
            <img src="image.jpg" />
        </pinch-zoom>

        <button (click)="zoomIn()">Zoom In</button>
        <button (click)="zoomOut()">Zoom Out</button>
        <button (click)="reset()">Reset</button>
    `,
})
export class ControlsComponent {
    pinchZoom = viewChild<PinchZoomComponent>('pinchZoom');

    zoomIn() {
        this.pinchZoom()?.zoomIn(0.5);
    }

    zoomOut() {
        this.pinchZoom()?.zoomOut(0.5);
    }

    reset() {
        this.pinchZoom()?.toggleZoom();
    }
}
```

### Click to Zoom

Enable click-to-zoom for quick inspection of specific areas:

```typescript
import { Component } from '@angular/core';
import { PinchZoomComponent } from '@meddv/ngx-pinch-zoom';

@Component({
    selector: 'app-click-zoom',
    standalone: true,
    imports: [PinchZoomComponent],
    template: `
        <pinch-zoom [enableClickToZoom]="true" [clickToZoomScale]="2.5">
            <img src="image.jpg" />
        </pinch-zoom>
    `,
})
export class ClickZoomComponent {}
```

This is particularly useful for:

- **Anomaly detection** - Click on suspicious areas to zoom in
- **Defect inspection** - Quickly examine specific spots
- **Detail review** - Fast workflow for inspecting multiple points

When enabled:

- Click any point on the image to zoom to that exact location
- Click again to zoom out back to original view
- Cursor changes to zoom-in icon to indicate the feature is active

### Brightness Control

Enable brightness controls alongside zoom controls:

```typescript
import { Component } from '@angular/core';
import { PinchZoomComponent } from '@meddv/ngx-pinch-zoom';

@Component({
    selector: 'app-brightness',
    standalone: true,
    imports: [PinchZoomComponent],
    template: `
        <pinch-zoom
            [enableBrightnessControl]="true"
            [brightnessStep]="0.1"
            [minBrightness]="0.1"
            [maxBrightness]="2.0"
            (brightnessChanged)="onBrightnessChange($event)"
        >
            <img src="image.jpg" />
        </pinch-zoom>
    `,
})
export class BrightnessComponent {
    onBrightnessChange(brightness: number) {
        console.log('Current brightness:', brightness);
    }
}
```

Programmatic brightness control:

```typescript
import { Component, viewChild } from '@angular/core';
import { PinchZoomComponent } from '@meddv/ngx-pinch-zoom';

@Component({
    selector: 'app-brightness-controls',
    standalone: true,
    imports: [PinchZoomComponent],
    template: `
        <pinch-zoom #pinchZoom>
            <img src="image.jpg" />
        </pinch-zoom>

        <button (click)="brightnessIn()">Brighter</button>
        <button (click)="brightnessOut()">Darker</button>
        <button (click)="resetBrightness()">Reset Brightness</button>
    `,
})
export class BrightnessControlsComponent {
    pinchZoom = viewChild<PinchZoomComponent>('pinchZoom');

    brightnessIn() {
        this.pinchZoom()?.brightnessIn();
    }

    brightnessOut() {
        this.pinchZoom()?.brightnessOut();
    }

    resetBrightness() {
        this.pinchZoom()?.resetBrightness();
    }
}
```

## Configuration Options

| Input                     | Type                              | Default                 | Description                               |
| ------------------------- | --------------------------------- | ----------------------- | ----------------------------------------- |
| `transitionDuration`      | `number`                          | `200`                   | Animation duration in milliseconds        |
| `doubleTap`               | `boolean`                         | `true`                  | Enable double-tap to zoom                 |
| `doubleTapScale`          | `number`                          | `2`                     | Scale factor for double-tap zoom          |
| `autoZoomOut`             | `boolean`                         | `false`                 | Automatically reset zoom after pinch      |
| `limitZoom`               | `number \| 'original image size'` | `'original image size'` | Maximum zoom level                        |
| `minScale`                | `number`                          | `0`                     | Minimum allowed scale                     |
| `disabled`                | `boolean`                         | `false`                 | Disable all zoom functionality            |
| `disablePan`              | `boolean`                         | `false`                 | Disable panning with one finger           |
| `disableZoomControl`      | `'disable' \| 'never' \| 'auto'`  | `'auto'`                | Control zoom button visibility            |
| `overflow`                | `'hidden' \| 'visible'`           | `'hidden'`              | CSS overflow behavior                     |
| `zoomControlScale`        | `number`                          | `1`                     | Scale factor for zoom controls            |
| `backgroundColor`         | `string`                          | `'rgba(0,0,0,0.85)'`    | Container background color                |
| `limitPan`                | `boolean`                         | `false`                 | Prevent panning past image edges          |
| `minPanScale`             | `number`                          | `1.0001`                | Minimum scale at which panning is enabled |
| `listeners`               | `'auto' \| 'mouse and touch'`     | `'mouse and touch'`     | Event listener mode                       |
| `wheel`                   | `boolean`                         | `true`                  | Enable mouse wheel zoom                   |
| `wheelZoomFactor`         | `number`                          | `0.2`                   | Zoom factor for mouse wheel               |
| `autoHeight`              | `boolean`                         | `false`                 | Calculate height from image dimensions    |
| `draggableImage`          | `boolean`                         | `false`                 | Make image draggable                      |
| `draggableOnPinch`        | `boolean`                         | `false`                 | Allow dragging while pinching             |
| `enableBrightnessControl` | `boolean`                         | `false`                 | Enable brightness adjustment controls     |
| `brightnessStep`          | `number`                          | `0.1`                   | Brightness adjustment increment           |
| `minBrightness`           | `number`                          | `0.1`                   | Minimum brightness value                  |
| `maxBrightness`           | `number`                          | `2.0`                   | Maximum brightness value                  |
| `enableClickToZoom`       | `boolean`                         | `false`                 | Enable click-to-zoom functionality        |
| `clickToZoomScale`        | `number`                          | `2.5`                   | Target scale when clicking to zoom        |

## Outputs

| Output              | Type                       | Description                              |
| ------------------- | -------------------------- | ---------------------------------------- |
| `zoomChanged`       | `OutputEmitterRef<number>` | Emits current scale when zoom changes    |
| `brightnessChanged` | `OutputEmitterRef<number>` | Emits current brightness when it changes |

## Methods

Access these methods via template reference or `viewChild`:

| Method               | Parameters          | Returns  | Description                                         |
| -------------------- | ------------------- | -------- | --------------------------------------------------- |
| `toggleZoom()`       | -                   | `void`   | Toggle between zoomed in/out                        |
| `zoomIn(value)`      | `value: number`     | `number` | Zoom in by value, returns new scale                 |
| `zoomOut(value)`     | `value: number`     | `number` | Zoom out by value, returns new scale                |
| `brightnessIn()`     | -                   | `number` | Increase brightness by step, returns new brightness |
| `brightnessOut()`    | -                   | `number` | Decrease brightness by step, returns new brightness |
| `resetBrightness()`  | -                   | `void`   | Reset brightness to default (1.0)                   |
| `zoomToPoint(event)` | `event: MouseEvent` | `void`   | Zoom to the clicked point (used internally)         |
| `destroy()`          | -                   | `void`   | Clean up event listeners                            |

## Computed Properties

The component exposes several computed signals:

| Property                | Type      | Description                                 |
| ----------------------- | --------- | ------------------------------------------- |
| `scale()`               | `number`  | Current zoom scale                          |
| `isZoomedIn()`          | `boolean` | Whether image is zoomed in                  |
| `isDisabled()`          | `boolean` | Whether zoom is disabled                    |
| `isDragging()`          | `boolean` | Whether user is currently dragging          |
| `isZoomLimitReached()`  | `boolean` | Whether max zoom is reached                 |
| `maxScale()`            | `number`  | Maximum allowed scale                       |
| `isControl()`           | `boolean` | Whether zoom controls should be shown       |
| `brightness()`          | `number`  | Current brightness value                    |
| `isBrightnessControl()` | `boolean` | Whether brightness controls should be shown |
| `isBrightnessAtMin()`   | `boolean` | Whether brightness is at minimum            |
| `isBrightnessAtMax()`   | `boolean` | Whether brightness is at maximum            |

## Angular 20 Signals

This library fully embraces Angular 20's signals API:

### Input Signals

All component inputs are now signal-based for better performance and reactivity.

```typescript
// Before (Angular <16)
@Input() disabled: boolean = false;

// Now (Angular 20+)
disabled = input<boolean>(false);
```

### Output Signals

Outputs use the new output() API:

```typescript
// Before
@Output() zoomChanged = new EventEmitter<number>();

// Now
zoomChanged = output<number>();
```

### Computed Signals

Derived state uses computed signals:

```typescript
isZoomedIn = computed<boolean>(() => {
    return this.scale() > 1;
});
```

## Browser Support

- Chrome/Edge (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- iOS Safari (latest 2 versions)
- Chrome for Android (latest 2 versions)

## Requirements

- Angular 20.0.0 or higher
- TypeScript 5.8.0 or higher
- Node.js 18.19.1, 20.11.1, or 22.0.0+

## Migration from Older Versions

If you're upgrading from a pre-signals version:

1. **Inputs**: No changes needed in templates, binding syntax remains the same
2. **Outputs**: Event binding syntax remains the same
3. **ViewChild**: Update to `viewChild` signal (optional but recommended)
4. **Component properties**: Access computed properties by calling them: `component.scale()`

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and guidelines.

## License

MIT

## Credits

This project was forked and modernized for Angular 19/20 compatibility.

Original library: [ngx-pinch-zoom](https://github.com/drozhzhin-n-e/ngx-pinch-zoom)

## Issues and Support

Please report issues on [GitHub Issues](https://github.com/yourusername/ngx-pinch-zoom/issues)
