# Implementation Guide

Practical step-by-step guides for implementing features and fixing bugs. For architecture details, see [ARCHITECTURE.md](ARCHITECTURE.md). For quick lookups, see [QUICK_REFERENCE.md](QUICK_REFERENCE.md).

## Table of Contents

- [Adding New Features](#adding-new-features)
- [Fixing Bugs](#fixing-bugs)
- [Common Customizations](#common-customizations)
- [Performance Optimization](#performance-optimization)
- [Debugging Techniques](#debugging-techniques)
- [Testing Strategies](#testing-strategies)

## Adding New Features

### Feature: Add Rotation Support

Let's add the ability to rotate images with a two-finger twist gesture.

#### Step 1: Add Properties

**File: `interfaces.ts`**

```typescript
export interface Properties {
    // ... existing properties
    enableRotation?: boolean;
    rotationLockThreshold?: number; // Degrees before rotation activates
}
```

**File: `properties.ts`**

```typescript
export const defaultProperties: Properties = {
    // ... existing defaults
    enableRotation: false,
    rotationLockThreshold: 10,
};
```

#### Step 2: Add Input Signal

**File: `pinch-zoom.component.ts`**

```typescript
export class PinchZoomComponent implements OnInit, OnDestroy {
    // ... existing inputs
    enableRotation = input<boolean>(defaultProperties.enableRotation!);
    rotationLockThreshold = input<number>(defaultProperties.rotationLockThreshold!);

    // Add to mergedProperties
    mergedProperties = computed<ComponentProperties>(() => {
        return {
            // ... existing properties
            enableRotation: this.enableRotation(),
            rotationLockThreshold: this.rotationLockThreshold(),
        };
    });
}
```

#### Step 3: Add State to IvyPinch

**File: `ivypinch.ts`**

```typescript
export class IvyPinch {
    // ... existing properties

    // Rotation state
    public rotation: number = 0; // Current rotation in degrees
    private initialRotation: number = 0; // Rotation at gesture start
    private rotationAngle: number = 0; // Cumulative rotation

    // ... existing methods

    private handleRotation = (event: any): void => {
        if (!this.properties.enableRotation) {
            return;
        }

        // Get two touch points
        const touches = event.touches;
        if (touches.length !== 2) {
            return;
        }

        const touch1 = touches[0];
        const touch2 = touches[1];

        // Calculate angle between fingers
        const angle = Math.atan2(touch2.clientY - touch1.clientY, touch2.clientX - touch1.clientX) * (180 / Math.PI);

        // Initialize on first move
        if (this.rotationAngle === 0) {
            this.rotationAngle = angle;
            this.initialRotation = this.rotation;
            return;
        }

        // Calculate rotation delta
        let delta = angle - this.rotationAngle;

        // Normalize to -180 to 180
        if (delta > 180) delta -= 360;
        if (delta < -180) delta += 360;

        // Apply threshold to prevent accidental rotation
        if (Math.abs(delta) < this.properties.rotationLockThreshold!) {
            return;
        }

        // Update rotation
        this.rotation = this.initialRotation + delta;

        // Apply transform with rotation
        this.transformElementWithRotation(this.scale, this.moveX, this.moveY, this.rotation);
    };

    private transformElementWithRotation(scale: number, moveX: number, moveY: number, rotation: number): void {
        const transform = `
            translate3d(${moveX}px, ${moveY}px, 0)
            scale(${scale})
            rotate(${rotation}deg)
        `;

        this.element.style.transform = transform;
    }

    private resetRotation(): void {
        this.rotationAngle = 0;
    }
}
```

#### Step 4: Register Event Handler

**File: `ivypinch.ts` (in constructor)**

```typescript
constructor(properties: Properties, private zoomChanged: (scale: number) => void) {
    // ... existing initialization

    // Register rotation handler alongside pinch
    this.touches.on('pinch', (event) => {
        this.handlePinch(event);
        this.handleRotation(event);  // Also handle rotation
    });

    // Reset rotation on touch end
    this.touches.on('touchend', () => {
        this.resetRotation();
    });
}
```

#### Step 5: Add Output Event (Optional)

**File: `pinch-zoom.component.ts`**

```typescript
export class PinchZoomComponent implements OnInit, OnDestroy {
    // ... existing outputs
    rotationChanged = output<number>();

    // Update callback to include rotation
    private handleScaleCallback = (scale: number, rotation?: number): void => {
        this.currentScale.set(scale);
        this.zoomChanged.emit(scale);

        if (rotation !== undefined) {
            this.rotationChanged.emit(rotation);
        }
    };
}
```

#### Step 6: Update IvyPinch Callback

**File: `ivypinch.ts`**

```typescript
private zoomChanged: (scale: number, rotation?: number) => void;

private handleRotation = (event: any): void => {
    // ... rotation logic

    // Notify component of both scale and rotation
    this.zoomChanged(this.scale, this.rotation);
};
```

#### Step 7: Test

```html
<pinch-zoom [enableRotation]="true" [rotationLockThreshold]="15" (rotationChanged)="onRotationChange($event)">
    <img src="image.jpg" />
</pinch-zoom>
```

### Feature: Add Zoom Animation Easing

Add custom easing functions for smoother zoom animations.

#### Step 1: Define Easing Functions

**File: `ivypinch.ts`**

```typescript
type EasingFunction = 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';

const easingFunctions = {
    linear: (t: number) => t,
    'ease-in': (t: number) => t * t,
    'ease-out': (t: number) => t * (2 - t),
    'ease-in-out': (t: number) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
};
```

#### Step 2: Add Property

**File: `interfaces.ts`**

```typescript
export interface Properties {
    // ... existing
    zoomEasing?: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
}
```

#### Step 3: Implement Animated Zoom

**File: `ivypinch.ts`**

```typescript
private animateZoom(
    targetScale: number,
    duration: number = this.properties.transitionDuration!
): void {
    const startScale = this.scale;
    const startTime = Date.now();
    const easing = easingFunctions[this.properties.zoomEasing || 'ease-out'];

    const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easedProgress = easing(progress);

        // Interpolate scale
        const currentScale = startScale + (targetScale - startScale) * easedProgress;

        // Apply transform
        this.transformElement(currentScale, this.moveX, this.moveY);
        this.scale = currentScale;
        this.zoomChanged(this.scale);

        // Continue animation
        if (progress < 1) {
            requestAnimationFrame(animate);
        }
    };

    requestAnimationFrame(animate);
}
```

## Fixing Bugs

### Bug: Image Jumps on First Touch

**Problem**: When user first touches the image, it jumps to a different position.

**Cause**: Initial touch position not properly stored, causing incorrect delta calculation.

#### Step 1: Identify the Issue

Add logging to `touches.ts`:

```typescript
handleTouchStart(event: TouchEvent) {
    console.log('[Touches] touchstart', {
        touches: event.touches.length,
        positions: Array.from(event.touches).map(t => ({
            x: t.clientX,
            y: t.clientY
        }))
    });

    this.touches = Array.from(event.touches);
}
```

#### Step 2: Fix Initialization

**File: `ivypinch.ts`**

```typescript
private handleLinearSwipe = (event: any): void => {
    // Store initial position on first move
    if (this.moveStartX === undefined) {
        this.moveStartX = event.touches[0].clientX;
        this.moveStartY = event.touches[0].clientY;
        this.initialMoveX = this.moveX;
        this.initialMoveY = this.moveY;
        return;  // Don't move on first touch
    }

    // Calculate delta from initial position
    const deltaX = event.touches[0].clientX - this.moveStartX;
    const deltaY = event.touches[0].clientY - this.moveStartY;

    // Apply delta to initial position
    this.moveX = this.initialMoveX + deltaX;
    this.moveY = this.initialMoveY + deltaY;

    this.transformElement(this.scale, this.moveX, this.moveY);
};

// Reset on touch end
private resetSwipeState(): void {
    this.moveStartX = undefined;
    this.moveStartY = undefined;
}
```

#### Step 3: Test Fix

1. Touch image
2. Verify no jump occurs
3. Move finger
4. Verify smooth panning

### Bug: Double-Tap Sometimes Doesn't Work

**Problem**: Double-tap zoom is inconsistent.

**Cause**: Timing window too strict or touch positions too far apart.

#### Fix 1: Adjust Timing Window

**File: `touches.ts`**

```typescript
detectDoubleTap(): boolean {
    const now = Date.now();
    const timeSinceLastTap = now - this.lastTapTime;

    // Increase window from 300ms to 500ms
    const DOUBLE_TAP_WINDOW = 500;

    if (timeSinceLastTap < DOUBLE_TAP_WINDOW && timeSinceLastTap > 0) {
        this.eventType = 'tap';
        this.lastTapTime = 0;
        return true;
    }

    this.lastTapTime = now;

    clearTimeout(this.doubleTapTimeout);
    this.doubleTapTimeout = window.setTimeout(() => {
        this.lastTapTime = 0;
    }, DOUBLE_TAP_WINDOW);

    return false;
}
```

#### Fix 2: Check Touch Position Distance

```typescript
detectDoubleTap(): boolean {
    const now = Date.now();
    const timeSinceLastTap = now - this.lastTapTime;

    // Check if taps are close together in space
    const touch = this.touches[0];
    const touchDistance = this.lastTapPosition ?
        Math.sqrt(
            Math.pow(touch.clientX - this.lastTapPosition.x, 2) +
            Math.pow(touch.clientY - this.lastTapPosition.y, 2)
        ) : 0;

    const DOUBLE_TAP_WINDOW = 500;
    const DOUBLE_TAP_DISTANCE = 50;  // Max 50px apart

    if (
        timeSinceLastTap < DOUBLE_TAP_WINDOW &&
        timeSinceLastTap > 0 &&
        touchDistance < DOUBLE_TAP_DISTANCE
    ) {
        this.eventType = 'tap';
        this.lastTapTime = 0;
        this.lastTapPosition = null;
        return true;
    }

    // Store tap position
    this.lastTapTime = now;
    this.lastTapPosition = {
        x: touch.clientX,
        y: touch.clientY
    };

    clearTimeout(this.doubleTapTimeout);
    this.doubleTapTimeout = window.setTimeout(() => {
        this.lastTapTime = 0;
        this.lastTapPosition = null;
    }, DOUBLE_TAP_WINDOW);

    return false;
}
```

### Bug: Memory Leak on Component Destroy

**Problem**: Application memory grows over time when components are created and destroyed.

**Cause**: Event listeners not properly removed.

#### Step 1: Verify Listeners Are Removed

**File: `touches.ts`**

```typescript
destroy(): void {
    console.log('[Touches] Removing listeners');

    // Remove all listeners
    Object.keys(this.listeners).forEach(key => {
        const listener = this.listeners[key];
        const element = this.getElementToListenTo();

        element.removeEventListener(key, listener);
    });

    // Clear references
    this.listeners = {};
    this.handlers = {
        pinch: [],
        pan: [],
        tap: []
    };

    console.log('[Touches] Cleanup complete');
}
```

#### Step 2: Ensure destroy() is Called

**File: `pinch-zoom.component.ts`**

```typescript
ngOnDestroy(): void {
    console.log('[PinchZoom] Component destroying');

    if (this.pinchZoom) {
        this.pinchZoom.destroy();
        this.pinchZoom = null as any;  // Clear reference
    }

    console.log('[PinchZoom] Component destroyed');
}
```

#### Step 3: Test with Chrome DevTools

1. Open Chrome DevTools
2. Go to Memory tab
3. Take heap snapshot
4. Create/destroy component 10 times
5. Take another heap snapshot
6. Compare snapshots
7. Verify no PinchZoomComponent instances retained

### Feature: Click-to-Zoom (Real-World Example)

This is a complete, real implementation added to the library for anomaly detection and defect inspection use cases.

**Goal**: Allow users to click any point on the image to zoom to that exact location, perfect for quickly examining suspicious areas in images.

#### Step 1: Add Input Signals

**File: `pinch-zoom.component.ts`**

```typescript
export class PinchZoomComponent implements OnInit, OnDestroy {
    // ... existing inputs

    // Click-to-zoom inputs
    enableClickToZoom = input<boolean>(false);
    clickToZoomScale = input<number>(2.5);

    // ... rest of class
}
```

**Why this works**:

- `enableClickToZoom` - Feature flag to avoid interfering with existing functionality
- `clickToZoomScale` - Configurable zoom level (default 2.5x is good for defect inspection)

#### Step 2: Add zoomToPoint Method to IvyPinch

**File: `ivypinch.ts`**

```typescript
export class IvyPinch {
    // Add after zoomOut() method

    public zoomToPoint(clientX: number, clientY: number, targetScale: number): void {
        // Update element position
        this.getElementPosition();

        // Calculate the click point relative to the element
        const xRelativeToElement = clientX - this.elementPosition.left;
        const yRelativeToElement = clientY - this.elementPosition.top;

        // Clamp target scale to limits
        let newScale = targetScale;
        if (newScale > this.maxScale) {
            newScale = this.maxScale;
        }
        if (newScale < (this.properties.minScale || 0)) {
            newScale = this.properties.minScale || 0;
        }

        // If already at target scale or zoomed in, reset zoom
        if (this.scale >= targetScale || this.scale > 1) {
            this.resetScale();
            return;
        }

        // Calculate the new position to keep the clicked point centered
        this.scale = newScale;
        this.zoomChanged(this.scale);

        // Calculate the zoom offset to keep clicked point under cursor
        const scaleRatio = newScale / this.initialScale;
        this.moveX = this.initialMoveX - xRelativeToElement * (scaleRatio - 1);
        this.moveY = this.initialMoveY - yRelativeToElement * (scaleRatio - 1);

        this.centeringImage();
        this.updateInitialValues();
        this.transformElement(this.properties.transitionDuration || 200);
    }
}
```

**Key points**:

- Uses `getElementPosition()` to get fresh position (element may have moved)
- Calculates click position relative to element bounds
- Applies zoom offset to keep clicked point under cursor
- Respects min/max scale limits
- Smooth animation using existing transition duration

#### Step 3: Add Component Wrapper Method

**File: `pinch-zoom.component.ts`**

```typescript
export class PinchZoomComponent implements OnInit, OnDestroy {
    // ... existing methods

    zoomToPoint(event: MouseEvent): void {
        if (!this.enableClickToZoom() || this.isDisabled()) {
            return;
        }

        // Prevent default to avoid conflicts
        event.preventDefault();
        event.stopPropagation();

        // Get click coordinates
        const clientX = event.clientX;
        const clientY = event.clientY;

        // Call IvyPinch method with target scale
        this.pinchZoom?.zoomToPoint(clientX, clientY, this.clickToZoomScale());
    }
}
```

**Why this works**:

- Checks feature flag and disabled state
- Prevents event propagation to avoid conflicts with other gestures
- Delegates to IvyPinch for actual zoom logic

#### Step 4: Add Click Handler to Template

**File: `pinch-zoom.component.html`**

```html
<div
    class="pinch-zoom-content"
    [class.pz-dragging]="isDragging()"
    [class.pz-click-to-zoom]="enableClickToZoom()"
    (click)="enableClickToZoom() ? zoomToPoint($event) : null"
>
    <ng-content></ng-content>
</div>
```

**Key points**:

- Conditional click handler (only active when enabled)
- CSS class for visual feedback (cursor changes)
- Works alongside existing touch/pan gestures

#### Step 5: Add CSS Cursor Feedback

**File: `pinch-zoom.component.sass`**

```sass
.pz-click-to-zoom
  cursor: zoom-in

.pz-click-to-zoom.pz-dragging
  cursor: all-scroll  // Dragging takes priority
```

**UX improvement**: User knows they can click to zoom when cursor changes

#### Result

Users can now:

1. Enable click-to-zoom with `[enableClickToZoom]="true"`
2. Click any suspicious area on the image
3. Image zooms to 2.5x with clicked point centered
4. Click again to zoom out
5. Works perfectly with brightness control for defect inspection

**Real-world usage**:

```html
<pinch-zoom [enableClickToZoom]="true" [clickToZoomScale]="2.5" [enableBrightnessControl]="true">
    <img src="product-defect-scan.jpg" />
</pinch-zoom>
```

**Testing checklist**:

- ✅ Click to zoom in to point
- ✅ Click again to zoom out
- ✅ Respects max zoom limit
- ✅ Works with pan gesture
- ✅ Cursor shows zoom-in icon
- ✅ Disabled when `disabled=true`

## Common Customizations

### Custom: Programmatic Zoom to Specific Point

Zoom to a specific coordinate programmatically.

**File: `ivypinch.ts`**

```typescript
public zoomToPoint(
    targetScale: number,
    pointX: number,
    pointY: number,
    animated: boolean = true
): void {
    // Constrain scale
    targetScale = Math.max(this.minScale, targetScale);
    targetScale = Math.min(this.maxScale, targetScale);

    // Calculate position adjustment to keep point fixed
    const scaleRatio = targetScale / this.scale;

    const elementRect = this.element.getBoundingClientRect();
    const centerX = elementRect.left + elementRect.width / 2;
    const centerY = elementRect.top + elementRect.height / 2;

    // Adjust position
    const newMoveX = this.moveX - (pointX - centerX) * (scaleRatio - 1);
    const newMoveY = this.moveY - (pointY - centerY) * (scaleRatio - 1);

    if (animated) {
        this.animateZoomToPoint(targetScale, newMoveX, newMoveY);
    } else {
        this.scale = targetScale;
        this.moveX = newMoveX;
        this.moveY = newMoveY;
        this.transformElement(this.scale, this.moveX, this.moveY);
        this.zoomChanged(this.scale);
    }
}

private animateZoomToPoint(
    targetScale: number,
    targetMoveX: number,
    targetMoveY: number
): void {
    const startScale = this.scale;
    const startMoveX = this.moveX;
    const startMoveY = this.moveY;
    const startTime = Date.now();
    const duration = this.properties.transitionDuration!;

    const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Ease-out function
        const eased = progress * (2 - progress);

        // Interpolate
        const currentScale = startScale + (targetScale - startScale) * eased;
        const currentMoveX = startMoveX + (targetMoveX - startMoveX) * eased;
        const currentMoveY = startMoveY + (targetMoveY - startMoveY) * eased;

        // Apply
        this.scale = currentScale;
        this.moveX = currentMoveX;
        this.moveY = currentMoveY;
        this.transformElement(this.scale, this.moveX, this.moveY);
        this.zoomChanged(this.scale);

        if (progress < 1) {
            requestAnimationFrame(animate);
        }
    };

    requestAnimationFrame(animate);
}
```

**Usage:**

```typescript
// In component
@ViewChild('pinchZoom') pinchZoomRef!: PinchZoomComponent;

zoomToTopLeft() {
    const ivyPinch = this.pinchZoomRef['pinchZoom'];  // Access private property
    ivyPinch.zoomToPoint(2, 100, 100, true);
}
```

### Custom: Zoom Level Indicator

Add a visual indicator of current zoom level.

**File: `pinch-zoom.component.ts`**

```typescript
export class PinchZoomComponent implements OnInit, OnDestroy {
    // ... existing code

    // Add computed signal for zoom percentage
    zoomPercentage = computed<number>(() => {
        return Math.round(this.scale() * 100);
    });

    // Add computed signal for zoom bar width
    zoomBarWidth = computed<string>(() => {
        const max = this.maxScale();
        const current = this.scale();
        const percent = (current / max) * 100;
        return `${percent}%`;
    });
}
```

**File: `pinch-zoom.component.html`**

```html
<div class="pinch-zoom-container">
    <ng-content></ng-content>

    <!-- Zoom indicator -->
    @if (isZoomedIn()) {
    <div class="zoom-indicator">
        <div class="zoom-label">{{ zoomPercentage() }}%</div>
        <div class="zoom-bar">
            <div class="zoom-bar-fill" [style.width]="zoomBarWidth()"></div>
        </div>
    </div>
    }
</div>
```

**File: `pinch-zoom.component.sass`**

```sass
.zoom-indicator
    position: absolute
    top: 10px
    left: 10px
    background: rgba(0, 0, 0, 0.7)
    color: white
    padding: 8px 12px
    border-radius: 4px
    font-size: 12px
    pointer-events: none
    z-index: 10

.zoom-label
    margin-bottom: 4px

.zoom-bar
    width: 100px
    height: 4px
    background: rgba(255, 255, 255, 0.3)
    border-radius: 2px
    overflow: hidden

.zoom-bar-fill
    height: 100%
    background: white
    transition: width 0.1s
```

## Performance Optimization

### Optimization: Throttle Pan Events

Reduce the number of transform updates during panning.

**File: `ivypinch.ts`**

```typescript
private lastPanTime: number = 0;
private readonly PAN_THROTTLE_MS = 16;  // ~60fps

private handleLinearSwipe = (event: any): void => {
    // Throttle pan events
    const now = Date.now();
    if (now - this.lastPanTime < this.PAN_THROTTLE_MS) {
        return;  // Skip this event
    }
    this.lastPanTime = now;

    // ... existing pan logic
};
```

### Optimization: Use RequestAnimationFrame

Batch transform updates to animation frames.

**File: `ivypinch.ts`**

```typescript
private rafId: number | null = null;
private pendingTransform: {
    scale: number;
    moveX: number;
    moveY: number;
} | null = null;

private transformElement(scale: number, moveX: number, moveY: number): void {
    // Store pending transform
    this.pendingTransform = { scale, moveX, moveY };

    // Schedule update
    if (this.rafId === null) {
        this.rafId = requestAnimationFrame(() => {
            if (this.pendingTransform) {
                const { scale, moveX, moveY } = this.pendingTransform;

                const transform = `
                    translate3d(${moveX}px, ${moveY}px, 0)
                    scale(${scale})
                `;

                this.element.style.transform = transform;

                this.pendingTransform = null;
                this.rafId = null;
            }
        });
    }
}

public destroy(): void {
    // Cancel pending animation frame
    if (this.rafId !== null) {
        cancelAnimationFrame(this.rafId);
        this.rafId = null;
    }

    // ... existing destroy logic
}
```

### Optimization: Debounce Resize Calculations

Avoid expensive calculations on every resize event.

**File: `ivypinch.ts`**

```typescript
private resizeTimeout: number | null = null;

private handleResize = (): void => {
    // Clear existing timeout
    if (this.resizeTimeout !== null) {
        clearTimeout(this.resizeTimeout);
    }

    // Debounce resize handling
    this.resizeTimeout = window.setTimeout(() => {
        this.recalculateMaxScale();
        this.constrainScale();
        this.resizeTimeout = null;
    }, 200);
};

public destroy(): void {
    // Clear resize timeout
    if (this.resizeTimeout !== null) {
        clearTimeout(this.resizeTimeout);
        this.resizeTimeout = null;
    }

    // ... existing destroy logic
}
```

## Debugging Techniques

### Technique 1: Visual Transform Debugging

Add visual overlay showing current transform state.

**Create: `transform-debugger.component.ts`**

```typescript
import { Component, input, computed } from '@angular/core';

@Component({
    selector: 'transform-debugger',
    standalone: true,
    template: `
        <div class="debug-overlay">
            <div class="debug-info">
                <div>Scale: {{ scale() }}</div>
                <div>Position: ({{ moveX() }}, {{ moveY() }})</div>
                <div>Zoomed: {{ isZoomedIn() ? 'Yes' : 'No' }}</div>
            </div>
            <div class="debug-grid"></div>
        </div>
    `,
    styles: [
        `
            .debug-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                pointer-events: none;
                z-index: 9999;
            }

            .debug-info {
                position: absolute;
                top: 10px;
                right: 10px;
                background: rgba(0, 0, 0, 0.8);
                color: #0f0;
                padding: 10px;
                font-family: monospace;
                font-size: 12px;
            }

            .debug-grid {
                width: 100%;
                height: 100%;
                background-image:
                    linear-gradient(rgba(0, 255, 0, 0.1) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(0, 255, 0, 0.1) 1px, transparent 1px);
                background-size: 50px 50px;
            }
        `,
    ],
})
export class TransformDebugger {
    scale = input<number>(1);
    moveX = input<number>(0);
    moveY = input<number>(0);

    isZoomedIn = computed(() => this.scale() > 1);
}
```

**Usage:**

```html
<pinch-zoom #pz>
    <img src="image.jpg" />
</pinch-zoom>

<transform-debugger [scale]="pz.scale()" [moveX]="pz.moveX()" [moveY]="pz.moveY()"> </transform-debugger>
```

### Technique 2: Event Flow Logging

Add comprehensive logging to trace event flow.

**File: `touches.ts`**

```typescript
private logEvent(stage: string, data: any): void {
    if (!this.debug) return;

    console.log(`[Touches:${stage}]`, {
        eventType: this.eventType,
        touches: this.touches.length,
        distance: this.distance,
        ...data
    });
}

handleTouchStart(event: TouchEvent): void {
    this.logEvent('touchstart', { count: event.touches.length });
    // ... existing logic
}

handleTouchMove(event: TouchEvent): void {
    this.logEvent('touchmove', {
        gesture: this.eventType,
        distance: this.distance
    });
    // ... existing logic
}
```

## Testing Strategies

### Unit Testing IvyPinch

**File: `ivypinch.spec.ts`**

```typescript
import { IvyPinch } from './ivypinch';
import { Properties } from './interfaces';

describe('IvyPinch', () => {
    let element: HTMLElement;
    let ivyPinch: IvyPinch;
    let zoomCallback: jasmine.Spy;

    beforeEach(() => {
        element = document.createElement('div');
        element.innerHTML = '<img src="test.jpg" />';
        document.body.appendChild(element);

        zoomCallback = jasmine.createSpy('zoomCallback');

        const properties: Properties = {
            transitionDuration: 200,
            doubleTap: true,
            limitZoom: 3,
        };

        ivyPinch = new IvyPinch(properties, zoomCallback);
    });

    afterEach(() => {
        ivyPinch.destroy();
        document.body.removeChild(element);
    });

    it('should initialize with scale 1', () => {
        expect(ivyPinch.scale).toBe(1);
    });

    it('should respect max zoom limit', () => {
        // Simulate pinch zoom beyond limit
        const mockEvent = {
            touches: [
                { clientX: 0, clientY: 0 },
                { clientX: 500, clientY: 0 },
            ],
        };

        // This would zoom to 5x, but limit is 3x
        ivyPinch['handlePinch'](mockEvent);

        expect(ivyPinch.scale).toBeLessThanOrEqual(3);
    });

    it('should call zoom callback when scale changes', () => {
        ivyPinch.scale = 2;
        ivyPinch['zoomChanged'](2);

        expect(zoomCallback).toHaveBeenCalledWith(2);
    });
});
```

### Integration Testing

**File: `pinch-zoom.component.spec.ts`**

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PinchZoomComponent } from './pinch-zoom.component';

describe('PinchZoomComponent', () => {
    let component: PinchZoomComponent;
    let fixture: ComponentFixture<PinchZoomComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [PinchZoomComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(PinchZoomComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should initialize with scale 1', () => {
        expect(component.scale()).toBe(1);
    });

    it('should update isZoomedIn when scale changes', () => {
        expect(component.isZoomedIn()).toBe(false);

        component['currentScale'].set(2);

        expect(component.isZoomedIn()).toBe(true);
    });

    it('should emit zoomChanged when scale updates', (done) => {
        component.zoomChanged.subscribe((scale: number) => {
            expect(scale).toBe(2);
            done();
        });

        component['handleScaleCallback'](2);
    });
});
```

---

## Summary

This guide covers:

- ✅ Adding new features (rotation, easing)
- ✅ Fixing common bugs (jumps, double-tap, memory leaks)
- ✅ Common customizations (zoom to point, indicators)
- ✅ Performance optimization (throttling, RAF, debouncing)
- ✅ Debugging techniques (visual debugging, logging)
- ✅ Testing strategies (unit tests, integration tests)

For architecture details, see [ARCHITECTURE.md](ARCHITECTURE.md).
For quick lookups, see [QUICK_REFERENCE.md](QUICK_REFERENCE.md).
