# ngx-pinch-zoom

[![Angular](https://img.shields.io/badge/Angular-20-red.svg)](https://angular.io/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg)](https://www.typescriptlang.org/)
[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Modern Angular 20 pinch-zoom component with signals, smart/dumb architecture, and professional folder structure. Built following Angular best practices with clean separation of concerns.

## Features

- 🎯 **Angular 20 + Signals** - Modern reactive programming with signals API
- 📱 **Touch & Mouse Support** - Works seamlessly on all devices
- 🔄 **Pinch to Zoom** - Natural multi-touch gesture support
- 🖱️ **Mouse Wheel Zoom** - Desktop-friendly scrolling zoom
- 👆 **Double Tap** - Quick zoom in/out with double tap
- 🎯 **Click to Zoom** - Click any point to zoom precisely - perfect for anomaly detection
- ☀️ **Brightness Control** - Adjust image brightness on the fly
- 🏗️ **Professional Architecture** - Smart/Dumb components, service-based logic
- 📦 **Standalone Component** - No module imports needed
- ⚡ **Performance Optimized** - Signals for reactivity, computed values cached

## Installation

```bash
npm install @brianpooe/ngx-pinch-zoom
```

## Quick Start

### Import the Component

```typescript
import { Component } from '@angular/core';
import { PinchZoomComponent } from '@brianpooe/ngx-pinch-zoom';

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

### Add Viewport Meta Tag

For proper touch support, add this to your `index.html`:

```html
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1.0, user-scalable=no" />
```

## Documentation

For comprehensive documentation including:

- Configuration options
- Usage examples
- API reference
- Migration guide
- Architecture details

See the [main README](../../README.md)

## Architecture

This library follows Angular best practices with a clean, professional architecture:

### Directory Structure

```
lib/
├── models/                     # Data models and interfaces
│   ├── interfaces.model.ts     # Core zoom/pan interfaces
│   ├── properties.model.ts     # Default properties and configs
│   ├── zoom-config.model.ts    # Zoom configuration types
│   ├── transform-state.model.ts # Transform state types
│   ├── brightness-state.model.ts # Brightness state types
│   └── click-to-zoom.model.ts  # Click-to-zoom types
│
├── services/                   # Business logic
│   ├── brightness.service.ts   # Angular service for brightness state
│   ├── zoom-state.service.ts   # Angular service for zoom state
│   ├── ivy-pinch.service.ts    # Angular service for core zoom/pan engine
│   └── touches.service.ts      # Angular service for gesture detection
│
└── components/
    ├── containers/             # Smart components (with DI)
    │   └── pinch-zoom/
    │       ├── pinch-zoom.container.ts     # Main container component
    │       ├── pinch-zoom.container.html   # Template
    │       └── pinch-zoom.container.sass   # Styles
    │
    └── presentational/         # Dumb components (pure UI)
        ├── zoom-controls/      # Zoom in/out button
        └── brightness-controls/ # Brightness +/- buttons
```

### Design Patterns

**Smart/Dumb Component Pattern**

- **Container Components** (`components/containers/`): Manage state, handle business logic, inject services
- **Presentational Components** (`components/presentational/`): Pure UI, inputs/outputs only, no dependencies

**Service-Based Architecture**

- All business logic extracted into reusable Angular services
- `BrightnessService` and `ZoomStateService` manage reactive state
- `IvyPinchService` and `TouchesService` are Angular services handling core zoom/gesture logic
- All services use Angular's DI system and are provided at component level

**Signal-Based Reactivity**

- All component inputs use `input()` signals
- All outputs use `output()` signals
- Computed values use `computed()` for automatic reactivity
- Effects use `effect()` for side effects

**Modern Dependency Injection**

- Using `inject()` function instead of constructor DI
- Proper service scoping with `providers` array
- Clean separation of concerns

## Code Quality

- **778 lines of JSDoc documentation** - Every method and property explained
- **Full TypeScript strict mode** - Maximum type safety
- **Clean imports** - Barrel exports for easy consumption
- **Zero technical debt** - Modern patterns throughout

## Use Cases

This library is particularly well-suited for:

- **Anomaly Detection Workflows** - Click-to-zoom for quick inspection of suspicious areas
- **Image Carousels** - Swipe through images with zoom capability
- **Defect Inspection** - Brightness control helps spot issues in dark or bright areas
- **Medical Imaging** - Precise zoom and brightness for detailed examination
- **Quality Assurance** - Quick review of captured images for defects

## Credits

This library modernizes the original ngx-pinch-zoom for Angular 20 while preserving its excellent core zoom logic.

**Core Logic Attribution:**
- Pinch-to-zoom mathematics and transform algorithms from original library
- Touch and mouse gesture detection logic adapted from original
- Zoom constraints and pan limit calculations from original

**Modernization & New Features:**
- Angular 20 signals API implementation
- Professional architecture with smart/dumb components
- Brightness control feature
- Click-to-zoom feature
- Service-based state management
- Comprehensive JSDoc documentation

**Original Library:**
- **Author:** [Nikita Drozhzhin](https://github.com/drozhzhin-n-e) (drozhzhin.n.e@gmail.com) - Original creator and core zoom algorithms
- **Repository:** [drozhzhin-n-e/ngx-pinch-zoom](https://github.com/drozhzhin-n-e/ngx-pinch-zoom)

**Angular 19/20 Compatibility Fork:**
- **Contributors:**
  - [Konstantin Schütte](https://www.meddv.de) (medDV-GmbH) - Angular 19/20 compatibility updates
  - [Björn Schmidt](https://www.meddv.de) (medDV-GmbH) - Angular 19/20 compatibility updates
- **Repository:** [medDV-GmbH/ngx-pinch-zoom](https://github.com/medDV-GmbH/ngx-pinch-zoom)

**Current Version:**
- **Maintainer:** [Brian Pooe](https://github.com/brianpooe) - Angular 20 signals migration, architecture redesign, new features

## License

MIT

## Issues and Support

Please report issues on [GitHub Issues](https://github.com/brianpooe/ngx-pinch-zoom/issues)
