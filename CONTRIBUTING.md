# Contributing to ngx-pinch-zoom

## For New Maintainers

This document provides comprehensive information for maintaining and developing this Angular library.

## Project Overview

**ngx-pinch-zoom** is an Angular library providing touch-enabled image zoom and pan functionality. The library is built with Angular 20+ and uses the modern signals API for reactivity.

### Key Features

- Touch and mouse support for pinch-to-zoom
- Wheel zoom support
- Double-tap to zoom
- Pan and drag functionality
- Configurable zoom limits and behaviors
- Standalone component (no NgModule required)
- Built with Angular signals for optimal performance

## Architecture

### Project Structure

```
ngx-pinch-zoom/
├── projects/ngx-pinch-zoom/          # Library source code
│   └── src/lib/
│       ├── pinch-zoom.component.ts    # Main component with signals API
│       ├── ivypinch.ts                # Core zoom logic
│       ├── touches.ts                 # Touch/mouse event handling
│       ├── interfaces.ts              # TypeScript interfaces
│       └── properties.ts              # Default configuration
├── src/                               # Demo application
├── angular.json                       # Angular CLI configuration
├── package.json                       # Dependencies and scripts
└── tsconfig.json                      # TypeScript configuration
```

### Core Components

1. **PinchZoomComponent** (`pinch-zoom.component.ts`)
   - Main Angular component
   - Uses signals for all inputs and outputs
   - Implements modern Angular patterns (inject, computed, effect)
   - Standalone component

2. **IvyPinch** (`ivypinch.ts`)
   - Core zoom/pan logic
   - Handles transformations and calculations
   - No Angular dependencies (plain TypeScript class)

3. **Touches** (`touches.ts`)
   - Event handling for touch and mouse interactions
   - Gesture detection (pinch, pan, tap, double-tap)
   - Cross-browser compatibility

## Development Setup

### Prerequisites

- Node.js 18.19.1+, 20.11.1+, or 22.0.0+
- npm 9.0.0+ or 10.0.0+

### Installation

```bash
# Install dependencies
npm install

# Build the library
npm run build-lib

# Start demo app
npm start
```

### Available Scripts

```bash
npm run build-lib    # Build the library
npm run build        # Build the demo app
npm start            # Serve the demo app
npm run format       # Format code with Prettier
npm run format:check # Check code formatting
```

## Building the Library

The library is built using Angular's ng-packagr:

```bash
npm run build-lib
```

Output is generated in `dist/ngx-pinch-zoom/` with:
- ESM bundles
- TypeScript declaration files
- package.json for npm publishing
- README.md

## Angular Signals Migration

This library has been migrated to use Angular signals (Angular 20+). Here's what changed:

### Before (Traditional Approach)

```typescript
@Input() disabled: boolean;
@Output() zoomChanged = new EventEmitter<number>();

get scale(): number {
  return this.pinchZoom.scale;
}
```

### After (Signals Approach)

```typescript
disabled = input<boolean>(false);
zoomChanged = output<number>();

scale = computed<number>(() => {
  return this.currentScale();
});
```

### Key Benefits

1. **Better Performance**: Signals provide fine-grained reactivity
2. **Simpler State Management**: No need for manual change detection
3. **Type Safety**: Improved TypeScript inference
4. **Modern Angular**: Aligns with Angular's future direction

## Making Changes

### Code Style

- Use Prettier for formatting (config in `.prettierrc`)
- Follow TypeScript strict mode rules
- Use meaningful variable names
- Add JSDoc comments for public APIs

### TypeScript Configuration

The project uses strict TypeScript settings:

```json
{
  "strict": true,
  "strictNullChecks": true,
  "strictInjectionParameters": true,
  "strictInputAccessModifiers": true,
  "strictTemplates": true
}
```

### Adding New Features

1. **Update the component** (`pinch-zoom.component.ts`):
   - Add input signals for configuration
   - Add computed signals for derived state
   - Update the component template if needed

2. **Update core logic** (`ivypinch.ts`):
   - Add properties to the `Properties` interface
   - Implement the functionality
   - Test calculations thoroughly

3. **Document the feature**:
   - Update README.md with the new property
   - Add usage examples
   - Document default values

### Testing Changes

Currently, the test infrastructure has been simplified. To test changes:

1. Build the library: `npm run build-lib`
2. Run the demo app: `npm start`
3. Manually test in the browser
4. Test on both desktop (mouse) and touch devices

**Future improvement**: Add Jest or Vitest for unit testing.

## Common Tasks

### Updating Dependencies

```bash
# Update Angular to latest version
npx ng update @angular/core @angular/cli

# Update other dependencies
npm update
```

### Publishing to npm

1. Update version in `package.json`
2. Update version in `projects/ngx-pinch-zoom/package.json`
3. Build the library: `npm run build-lib`
4. Publish: `cd dist/ngx-pinch-zoom && npm publish`

### Debugging

1. **Component Issues**:
   - Check signal reactivity with Angular DevTools
   - Use `effect(() => console.log(signalValue()))`

2. **Touch/Mouse Issues**:
   - Add console.logs in `touches.ts` event handlers
   - Check browser dev tools for event listeners

3. **Transform Issues**:
   - Inspect `ivypinch.ts` transformElement method
   - Check CSS transform values in browser inspector

## Browser Compatibility

The library supports all modern browsers:

- Chrome/Edge (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Performance Considerations

1. **Signals**: Use computed signals for derived state
2. **Event Listeners**: Properly clean up in ngOnDestroy
3. **Transform**: Use CSS transforms (hardware accelerated)
4. **Change Detection**: OnPush strategy compatible (signals don't require manual CD)

## Troubleshooting

### Build Failures

**TypeScript errors**: Ensure strict mode compliance
```bash
# Check TypeScript version
npx tsc --version  # Should be ~5.8.0
```

**Dependency conflicts**: Clear cache and reinstall
```bash
rm -rf node_modules package-lock.json
npm install
```

### Runtime Issues

**Signals not updating**: Check if effects are running
**Touch events not working**: Verify viewport meta tag in host app
**Zoom calculations off**: Check element positioning and getBoundingClientRect

## Getting Help

- Create an issue on GitHub
- Check existing issues for similar problems
- Review the README.md for usage examples

## Code of Conduct

- Be respectful and constructive
- Test your changes before submitting
- Document new features
- Keep the codebase clean and maintainable
