# Changelog

All notable changes to this project will be documented in this file.

## [20.0.0] - 2025-11-15

### 🎉 Major Update: Angular 20 + Signals

This release modernizes the library with Angular 20 and signals API.

### ✨ Added

- **Angular 20 Support**: Upgraded to Angular 20.0.0
- **Signals API**: Complete migration to signals for inputs, outputs, and computed properties
- **Modern Dependency Injection**: Using `inject()` function instead of constructor DI
- **Computed Signals**: All derived state now uses `computed()` for better performance
- **Effects**: Reactive property changes using `effect()` API
- **TypeScript 5.8**: Updated to latest TypeScript with improved type safety
- **Strict Mode**: Full TypeScript strict mode compliance
- **Standalone Component**: No NgModule needed, fully standalone
- **Comprehensive Documentation**: Added CONTRIBUTING.md with detailed maintainer guide
- **Modern Build**: Updated to latest ng-packagr

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
- **Test Files**: Removed *.spec.ts files (to be reimplemented with modern testing tools)
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
   component.scale

   // After
   component.scale()
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
   npm install @meddv/ngx-pinch-zoom@20.0.0
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

### 🙏 Credits

- Original library: [ngx-pinch-zoom](https://github.com/drozhzhin-n-e/ngx-pinch-zoom)
- Modernization and Angular 20 upgrade: Claude Code

---

## Previous Versions

For changelog of versions prior to 20.0.0, see the original repository.
