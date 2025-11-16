# Changelog

All notable changes to this project will be documented in this file.

## [20.0.0] - 2025-11-16

### 🎉 Major Modernization: Angular 20 + Professional Architecture

This release modernizes ngx-pinch-zoom with Angular 20 signals API, professional architecture patterns, and new features. The core zoom/pan mathematics from the original library have been preserved and enhanced, while the Angular implementation has been completely rebuilt following modern best practices.

### ✨ New Features

- **🎯 Click to Zoom**: Click any point on the image to zoom to that exact location - perfect for anomaly detection workflows
- **☀️ Brightness Control**: Built-in brightness adjustment controls alongside zoom controls
- **📁 Professional Architecture**: Clean folder structure with models/, services/, components/containers/, components/presentational/
- **🎨 Smart/Dumb Components**: Explicit separation of container (smart) and presentational (dumb) components
- **⚡ Angular 20 + Signals**: Complete rewrite using Angular 20 with modern signals API
- **💉 Service-Based Architecture**: Business logic extracted into reusable Angular services
- **🔄 Signal-Based State**: BrightnessService and ZoomStateService for reactive state management
- **📚 Comprehensive JSDoc**: 778 lines of inline documentation explaining algorithms and architecture
- **🏗️ TypeScript 5.8**: Latest TypeScript with full strict mode compliance
- **📦 Standalone Component**: No NgModule needed, fully standalone architecture

### 🔄 Changed

- **Input Properties**: Migrated all `@Input()` to `input()` signals
- **Output Events**: Migrated `@Output()` EventEmitters to `output()` signals
- **Component Properties**: Converted getters to computed signals
- **Type Safety**: Improved null safety and type inference throughout codebase
- **Module Resolution**: Updated to `bundler` strategy for better compatibility

### 🗑️ Removed

- **Cypress**: Removed Cypress testing framework and all related configuration
- **Karma/Jasmine**: Removed old testing infrastructure
- **ESLint**: Removed eslint and unnecessary linting dependencies
- **Polyfills**: Removed polyfills.ts (not needed in modern browsers)
- **Test Files**: Removed \*.spec.ts files (to be reimplemented with modern testing tools)
- **Backward Compatibility Inputs**: Removed deprecated kebab-case input bindings

### 🔧 Technical Changes

- Updated `tsconfig.json` with modern settings:
    - `moduleResolution: "bundler"`
    - `strict: true`
    - `strictTemplates: true`
- Simplified `angular.json` configuration
- Removed deprecated tslint configuration
- Updated package scripts for simpler workflow
- Added Prettier for code formatting

### 📦 Dependencies

#### Updated

- `@angular/*`: 19.0.0 → 20.0.0
- `typescript`: 5.5.4 → 5.8.0
- `rxjs`: 7.5.2 → 7.8.0
- `tslib`: 2.3.1 → 2.8.0
- `ng-packagr`: 19.0.0 → 20.0.0
- `@types/node`: 16.18.24 → 22.0.0
- `prettier`: 2.7.1 → 3.0.0

#### Removed

- `cypress`
- `@cypress/schematic`
- `karma` and related packages
- `jasmine` and related packages
- `eslint` and plugins
- `@angular-eslint/*`

### 🐛 Bug Fixes

- Fixed strict TypeScript errors in `touches.ts`
- Fixed null safety issues in `ivypinch.ts`
- Improved event listener type safety
- Fixed undefined property access issues
- Resolved module resolution conflicts

### 📚 Documentation

- Completely rewritten README.md with Angular 20 examples
- Added CONTRIBUTING.md with comprehensive maintainer guide
- Added usage examples with signals
- Documented all computed properties
- Added migration guide from older versions
- Included architecture documentation

### ⚠️ Breaking Changes

1. **Minimum Angular Version**: Now requires Angular 20.0.0+
2. **Minimum TypeScript Version**: Now requires TypeScript 5.8.0+
3. **Minimum Node Version**: Now requires Node.js 18.19.1+
4. **Component Properties**: Computed properties must be called as functions:

    ```typescript
    // Before
    component.scale;

    // After
    component.scale();
    ```

5. **Removed Exports**: Some internal utilities may no longer be exported

### 🔄 Migration Guide

For users upgrading from previous versions:

1. Update Angular to 20+:

    ```bash
    ng update @angular/core@20 @angular/cli@20
    ```

2. Update your package.json:

    ```bash
    npm install @brianpooe/ngx-pinch-zoom@20.0.0
    ```

3. Template changes: None required! Input/output binding syntax remains the same.

4. Component reference changes (if using ViewChild):

    ```typescript
    // Before
    @ViewChild('pinchZoom') pinchZoom: PinchZoomComponent;

    // After (recommended)
    pinchZoom = viewChild<PinchZoomComponent>('pinchZoom');
    ```

5. Accessing computed properties:

    ```typescript
    // Before
    const scale = this.pinchZoom.scale;

    // After
    const scale = this.pinchZoom()?.scale();
    ```

### 🏗️ Architecture Changes

**Professional Folder Structure:**
```
lib/
├── models/                     # All data models and interfaces
├── services/                   # Business logic and utility classes
│   ├── brightness.service.ts   # Angular service
│   ├── zoom-state.service.ts   # Angular service
│   ├── ivy-pinch.service.ts    # Core zoom logic (utility class)
│   └── touches.service.ts      # Gesture detection (utility class)
└── components/
    ├── containers/             # Smart components (with DI)
    └── presentational/         # Dumb components (pure UI)
```

**Design Patterns Implemented:**
- Smart/Dumb (Container/Presentational) component pattern
- Service-based architecture for business logic
- Signal-based reactive state management
- Dependency injection throughout
- Barrel exports for clean imports

### 🙏 Credits

This modernization builds on the excellent core zoom logic from the original ngx-pinch-zoom library.

**Core Logic Credits:**
- Pinch-to-zoom mathematics and transform algorithms retained from original
- Touch/mouse gesture detection logic adapted from original
- Original zoom constraints and calculations preserved

**Original Library:**
- **Author:** [Nikita Drozhzhin](https://github.com/drozhzhin-n-e) (drozhzhin.n.e@gmail.com) - Original creator and core zoom algorithms
- **Repository:** [drozhzhin-n-e/ngx-pinch-zoom](https://github.com/drozhzhin-n-e/ngx-pinch-zoom)

**Angular 19/20 Compatibility Fork:**
- **Contributors:**
  - [Konstantin Schütte](https://www.meddv.de) (medDV-GmbH team) - Angular 19/20 compatibility updates
  - [Björn Schmidt](https://www.meddv.de) (medDV-GmbH team) - Angular 19/20 compatibility updates
- **Repository:** [medDV-GmbH/ngx-pinch-zoom](https://github.com/medDV-GmbH/ngx-pinch-zoom)

**This Version:**
- **Maintainer:** [Brian Pooe](https://github.com/brianpooe) - Angular 20 signals migration, architecture redesign, new features (brightness control, click-to-zoom), comprehensive documentation

---

## Previous Versions

For changelog of versions prior to 20.0.0, see the [original repository](https://github.com/medDV-GmbH/ngx-pinch-zoom).
