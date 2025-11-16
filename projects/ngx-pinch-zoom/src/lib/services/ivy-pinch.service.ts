/**
 * @fileoverview IvyPinchService - Core Zoom & Pan Engine
 *
 * @description
 * Angular service that handles pinch-to-zoom, pan, and mouse wheel zoom gestures.
 * This is the core logic engine that powers the ngx-pinch-zoom component.
 *
 * **Key Responsibilities:**
 * - Process pinch gestures to calculate scale
 * - Process pan gestures to calculate translation
 * - Apply scale/translation constraints (min/max zoom, pan limits)
 * - Update DOM via CSS transforms
 * - Notify component of state changes via callback
 *
 * **Architecture:**
 * - Angular service with @Injectable decorator
 * - Provided at component level for proper scoping
 * - Uses {@link TouchesService} for gesture detection
 * - Communicates with component via callback function
 * - Manipulates DOM directly via element.style
 *
 * **Transform Mathematics:**
 * - Uses CSS transform matrix for hardware acceleration
 * - Matrix format: `matrix(scaleX, 0, 0, scaleY, translateX, translateY)`
 * - Applied as: `translate3d(moveX, moveY, 0) scale(scale)`
 *
 * **Fixed-Point Zooming:**
 * When zooming, the visual center point (pinch center or mouse cursor) stays fixed.
 * This is achieved through mathematical compensation of translation values.
 *
 * @example
 * ```typescript
 * @Component({
 *   providers: [IvyPinchService]
 * })
 * class MyComponent {
 *   private ivyPinch = inject(IvyPinchService);
 *
 *   ngOnInit() {
 *     this.ivyPinch.init(
 *       {
 *         element: containerElement,
 *         doubleTap: true,
 *         limitZoom: 4,
 *       },
 *       (scale) => console.log('Zoom changed:', scale)
 *     );
 *   }
 * }
 * ```
 */

import { Injectable, inject } from '@angular/core';
import { EventType, TouchesService } from './touches.service';
import { Properties, defaultProperties } from '../models';

/**
 * Core pinch-zoom logic service.
 * Provided at component level for proper instance scoping.
 */
@Injectable()
export class IvyPinchService {
    private readonly touchesService = inject(TouchesService);
    // ========================================================================
    // CONFIGURATION
    // ========================================================================

    /**
     * Merged configuration properties from defaults and user input.
     * Contains all settings like limitZoom, doubleTap, listeners, etc.
     */
    private properties: Properties = defaultProperties;

    // ========================================================================
    // EVENT HANDLING
    // ========================================================================

    /**
     * Touch and mouse event handler instance.
     * Detects gestures and emits typed events (pinch, pan, tap, wheel).
     */
    private touches!: TouchesService;

    /**
     * Current event type being processed.
     * Used to track gesture state machine (undefined → pinch → touchend → undefined).
     */
    private eventType: EventType = undefined;

    // ========================================================================
    // DOM REFERENCES
    // ========================================================================

    /**
     * The container element being transformed.
     * This is the element we apply CSS transforms to.
     */
    private element!: HTMLElement;

    /**
     * Tag name of the target element inside container.
     * Usually 'IMG' but could be any element (DIV, SVG, etc.).
     */
    private elementTarget!: string;

    /**
     * Parent element of the container.
     * Used for calculating pan limits and centering.
     */
    private parentElement!: HTMLElement;

    /**
     * Cached bounding rect of the element.
     * Updated on touchstart and used for coordinate calculations.
     */
    private elementPosition!: DOMRect;

    // ========================================================================
    // ZOOM STATE
    // ========================================================================

    /**
     * Current zoom scale (1 = original size, 2 = 2x zoomed, etc.).
     * This is the primary state variable for zoom level.
     * @public Exposed so component can read current scale
     */
    public scale: number = 1;

    /**
     * Scale value at the start of the current gesture.
     * Used to calculate relative scale changes during pinch.
     * Updated when gesture ends via {@link updateInitialValues}.
     */
    private initialScale: number = 1;

    /**
     * Default maximum zoom scale (3x).
     * Used when limitZoom is not specified.
     */
    private defaultMaxScale: number = 3;

    /**
     * Maximum allowed zoom scale.
     * Can be a number or calculated from original image size.
     * @public Exposed for component access
     */
    public maxScale: number = this.defaultMaxScale;

    // ========================================================================
    // PAN STATE
    // ========================================================================

    /**
     * Current X translation in pixels.
     * Positive values move element right, negative values move left.
     */
    private moveX: number = 0;

    /**
     * Current Y translation in pixels.
     * Positive values move element down, negative values move up.
     */
    private moveY: number = 0;

    /**
     * X translation at the start of current gesture.
     * Used as baseline for calculating pan deltas.
     */
    private initialMoveX: number = 0;

    /**
     * Y translation at the start of current gesture.
     * Used as baseline for calculating pan deltas.
     */
    private initialMoveY: number = 0;

    // ========================================================================
    // GESTURE STATE
    // ========================================================================

    /**
     * X coordinate where touch/mouse gesture started.
     * Relative to element's left edge.
     */
    private startX: number = 0;

    /**
     * Y coordinate where touch/mouse gesture started.
     * Relative to element's top edge.
     */
    private startY: number = 0;

    /**
     * Distance between two touch points during pinch.
     * Measured in pixels using Pythagorean theorem.
     */
    private distance: number = 0;

    /**
     * Distance between touch points when pinch started.
     * Used to calculate scale ratio: `scale = initialScale * (distance / initialDistance)`.
     */
    private initialDistance: number = 0;

    /**
     * X offset from initial position to pinch center.
     * Used for fixed-point pinch zoom calculations.
     */
    private moveXC: number = 0;

    /**
     * Y offset from initial position to pinch center.
     * Used for fixed-point pinch zoom calculations.
     */
    private moveYC: number = 0;

    /**
     * X coordinate of pinch center when draggableOnPinch is enabled.
     * Midpoint between two touch points.
     */
    private initialPinchCenterX = 0;

    /**
     * Y coordinate of pinch center when draggableOnPinch is enabled.
     * Midpoint between two touch points.
     */
    private initialPinchCenterY = 0;

    /**
     * Callback function invoked when zoom scale changes.
     * Component uses this to emit zoomChanged event.
     * Initialized in init() method.
     */
    private zoomChanged!: (scale: number) => void;

    // ========================================================================
    // COMPUTED PROPERTIES
    // ========================================================================

    /**
     * Minimum scale at which panning is enabled.
     * Defaults to 1.0001 (just above 1.0) to prevent panning at original size.
     */
    get minPanScale(): number {
        return this.getPropertiesValue('minPanScale') || 1.0001;
    }

    /**
     * Full resolution image configuration.
     * When set, loads high-res image at specified zoom level.
     */
    get fullImage(): { path: string; minScale?: number } | undefined {
        return this.properties.fullImage;
    }

    // ========================================================================
    // INITIALIZATION
    // ========================================================================

    /**
     * Initializes the IvyPinch service with configuration and callback.
     * Must be called before using any other methods.
     *
     * @param properties - Configuration options for zoom behavior
     * @param zoomChanged - Callback invoked when scale changes
     * @throws {Error} If properties.element is not provided
     *
     * @example
     * ```typescript
     * this.ivyPinch.init(
     *   {
     *     element: document.querySelector('.zoom-container'),
     *     doubleTap: true,
     *     limitZoom: 5,
     *     wheel: true,
     *   },
     *   (scale) => console.log('New scale:', scale)
     * );
     * ```
     */
    init(properties: Properties, zoomChanged: (scale: number) => void): void {
        if (!properties.element) {
            throw new Error('IvyPinchService: element property is required');
        }

        this.element = properties.element;
        this.zoomChanged = zoomChanged;

        // Set max scale if provided
        if (typeof properties.limitZoom === 'number') {
            this.maxScale = properties.limitZoom;
        }

        // Detect target element type (IMG, DIV, SVG, etc.)
        const firstChild = this.element.querySelector('*');
        this.elementTarget = firstChild?.tagName || 'IMG';
        this.parentElement = this.element.parentElement || this.element;

        // Merge properties with defaults
        this.properties = Object.assign({}, defaultProperties, properties);
        this.detectLimitZoom();

        // Initialize touch/mouse event handler
        this.touchesService.init({
            element: this.element,
            listeners: properties.listeners,
            resize: properties.autoHeight,
            mouseListeners: {
                mousedown: 'handleMousedown',
                mouseup: 'handleMouseup',
                wheel: 'handleWheel',
            },
        });
        this.touches = this.touchesService;

        // Set initial styles
        this.setBasicStyles();

        // Register event listeners
        this.touches.on('touchstart', this.handleTouchstart as any);
        this.touches.on('touchend', this.handleTouchend as any);
        this.touches.on('mousedown', this.handleTouchstart as any);
        this.touches.on('mouseup', this.handleTouchend as any);
        this.touches.on('pan', this.handlePan as any);
        this.touches.on('mousemove', this.handlePan as any);
        this.touches.on('pinch', this.handlePinch as any);

        if (this.properties.wheel) {
            this.touches.on('wheel', this.handleWheel as any);
        }

        if (this.properties.doubleTap) {
            this.touches.on('double-tap', this.handleDoubleTap as any);
        }

        if (this.properties.autoHeight) {
            this.touches.on('resize', this.handleResize);
        }
    }

    // ========================================================================
    // EVENT HANDLERS - LIFECYCLE
    // ========================================================================

    /**
     * Handles touch/mouse start events.
     * Initializes gesture tracking and caches element position.
     *
     * @param event - Touch or mouse event
     * @private
     */
    private handleTouchstart = (event: TouchEvent | MouseEvent): void => {
        this.touches.addEventListeners('mousemove');
        this.getElementPosition();

        if (this.eventType === undefined) {
            this.getTouchstartPosition(event);
        }
    };

    /**
     * Handles touch/mouse end events.
     * Finalizes gesture, applies constraints, and resets state.
     *
     * **Responsibilities:**
     * - Enforce minimum scale (reset to 1 if below)
     * - Auto zoom out if configured
     * - Align image to prevent gaps
     * - Update initial values for next gesture
     * - Clean up event listeners
     *
     * @param event - Touch or mouse event
     * @private
     */
    private handleTouchend = (event: TouchEvent | MouseEvent): void => {
        if (event.type === 'touchend') {
            const touches = (event as TouchEvent).touches;

            // Enforce minimum scale
            if (this.scale < 1) {
                this.scale = 1;
                this.zoomChanged(this.scale);
            }

            // Auto zoom out after pinch
            if (this.properties.autoZoomOut && this.eventType === 'pinch') {
                this.scale = 1;
                this.zoomChanged(this.scale);
            }

            // Align image to prevent gaps at edges
            if (this.eventType === 'pinch' || (this.eventType === 'pan' && this.scale > this.minPanScale)) {
                this.alignImage();
            }

            // Persist state for next gesture
            if (
                this.eventType === 'pinch' ||
                this.eventType === 'pan' ||
                this.eventType === 'horizontal-swipe' ||
                this.eventType === 'vertical-swipe'
            ) {
                this.updateInitialValues();
            }

            this.eventType = 'touchend';

            // Reset if all fingers lifted
            if (touches && touches.length === 0) {
                this.eventType = undefined;
            }
        }

        if (event.type === 'mouseup') {
            this.updateInitialValues();
            this.eventType = undefined;
        }

        this.touches.removeEventListeners('mousemove');
    };

    // ========================================================================
    // EVENT HANDLERS - GESTURES
    // ========================================================================

    /**
     * Handles pan (drag) gestures.
     *
     * **Algorithm:**
     * 1. Check if panning is allowed (scale >= minPanScale && !disablePan)
     * 2. Calculate delta from start position
     * 3. Update moveX/moveY
     * 4. Apply pan limits if enabled
     * 5. Center image to prevent gaps
     * 6. Apply CSS transform
     *
     * @param event - Touch or mouse event
     * @private
     */
    private handlePan = (event: TouchEvent | MouseEvent): void => {
        // Panning only allowed when zoomed in
        if (this.scale < this.minPanScale || this.properties.disablePan) {
            return;
        }

        event.preventDefault();
        const { clientX, clientY } = this.getClientPosition(event);

        // Initialize start position on first pan move
        if (!this.eventType) {
            this.startX = clientX - this.elementPosition.left;
            this.startY = clientY - this.elementPosition.top;
        }

        this.eventType = 'pan';

        // Calculate new position: initial + delta
        this.moveX = this.initialMoveX + (this.moveLeft(event, 0) - this.startX);
        this.moveY = this.initialMoveY + (this.moveTop(event, 0) - this.startY);

        // Prevent panning past edges
        if (this.properties.limitPan) {
            this.limitPanY();
            this.limitPanX();
        }

        // Center image on mouse drag
        if (event.type === 'mousemove' && this.scale > this.minPanScale) {
            this.centeringImage();
        }

        this.transformElement(0);
    };

    /**
     * Handles double-tap gesture.
     * Delegates to {@link toggleZoom} method.
     *
     * @param event - Touch event
     * @private
     */
    private handleDoubleTap = (event: TouchEvent): void => {
        this.toggleZoom(event);
        return;
    };

    /**
     * Handles pinch-to-zoom gesture.
     *
     * **Two Modes:**
     *
     * **Mode 1: Fixed pinch** (`draggableOnPinch: false`)
     * - Pinch center stays visually fixed
     * - Cannot pan while pinching
     * - Simpler math, better performance
     *
     * **Mode 2: Draggable pinch** (`draggableOnPinch: true`)
     * - Can pan while pinching
     * - Pinch center can move
     * - More complex calculations
     *
     * **Algorithm (Mode 1):**
     * 1. Calculate distance between touch points
     * 2. Calculate scale: `newScale = initialScale * (distance / initialDistance)`
     * 3. Calculate position offset to keep pinch center fixed
     * 4. Apply zoom and pan limits
     * 5. Transform element
     *
     * **Algorithm (Mode 2):**
     * 1. Track pinch center position
     * 2. Calculate scale from distance ratio
     * 3. Calculate drag delta (movement of pinch center)
     * 4. Calculate scale translation offset
     * 5. Combine drag and scale adjustments
     * 6. Apply limits and transform
     *
     * @param event - Touch event with two or more touches
     * @private
     */
    private handlePinch = (event: TouchEvent): void => {
        event.preventDefault();

        // MODE 1: Fixed pinch (pinch center stays fixed)
        if (!this.properties.draggableOnPinch) {
            if (this.eventType === undefined || this.eventType === 'pinch') {
                const touches = event.touches;

                // Initialize on first pinch move
                if (!this.eventType) {
                    this.initialDistance = this.getDistance(touches);

                    const moveLeft0 = this.moveLeft(event, 0);
                    const moveLeft1 = this.moveLeft(event, 1);
                    const moveTop0 = this.moveTop(event, 0);
                    const moveTop1 = this.moveTop(event, 1);

                    // Store offset from initial position to pinch center
                    this.moveXC = (moveLeft0 + moveLeft1) / 2 - this.initialMoveX;
                    this.moveYC = (moveTop0 + moveTop1) / 2 - this.initialMoveY;
                }

                this.eventType = 'pinch';
                this.distance = this.getDistance(touches);

                // Scale formula: newScale = initialScale * (currentDistance / initialDistance)
                this.scale = this.initialScale * (this.distance / this.initialDistance);
                this.zoomChanged(this.scale);

                // Position adjustment to keep pinch center visually fixed
                // Formula: newPos = initialPos - (scaleRatio * offset - offset)
                this.moveX = this.initialMoveX - ((this.distance / this.initialDistance) * this.moveXC - this.moveXC);
                this.moveY = this.initialMoveY - ((this.distance / this.initialDistance) * this.moveYC - this.moveYC);

                this.handleLimitZoom();

                if (this.properties.limitPan) {
                    this.limitPanY();
                    this.limitPanX();
                }

                this.transformElement(0);
            }

            return;
        }

        // MODE 2: Draggable pinch (can pan while pinching)
        const touches = event.touches;

        // Initialize on first pinch move
        if (!this.eventType) {
            this.eventType = 'pinch';
            this.initialDistance = this.getDistance(touches);

            // Calculate initial pinch center
            const lx0 = this.moveLeft(event, 0),
                lx1 = this.moveLeft(event, 1),
                ty0 = this.moveTop(event, 0),
                ty1 = this.moveTop(event, 1);

            this.initialPinchCenterX = (lx0 + lx1) / 2;
            this.initialPinchCenterY = (ty0 + ty1) / 2;

            // Store offset from initial position to pinch center
            this.moveXC = this.initialPinchCenterX - this.initialMoveX;
            this.moveYC = this.initialPinchCenterY - this.initialMoveY;
        }

        this.eventType = 'pinch';

        // Calculate scale from distance ratio
        this.distance = this.getDistance(touches);
        const scaleRatio = this.distance / this.initialDistance;
        this.scale = this.initialScale * scaleRatio;
        this.zoomChanged(this.scale);

        // Calculate current pinch center
        const curLX0 = this.moveLeft(event, 0),
            curLX1 = this.moveLeft(event, 1),
            curTY0 = this.moveTop(event, 0),
            curTY1 = this.moveTop(event, 1);

        const currentCenterX = (curLX0 + curLX1) / 2;
        const currentCenterY = (curTY0 + curTY1) / 2;

        // Calculate drag component (movement of pinch center)
        const deltaX = currentCenterX - this.initialPinchCenterX;
        const deltaY = currentCenterY - this.initialPinchCenterY;

        // Calculate scale translation component
        const scaleTransX = (scaleRatio - 1) * this.moveXC;
        const scaleTransY = (scaleRatio - 1) * this.moveYC;

        // Combine drag and scale adjustments
        this.moveX = this.initialMoveX + deltaX - scaleTransX;
        this.moveY = this.initialMoveY + deltaY - scaleTransY;

        this.handleLimitZoom();
        if (this.properties.limitPan) {
            this.limitPanY();
            this.limitPanX();
        }
        this.transformElement(0);
    };

    /**
     * Handles mouse wheel zoom.
     *
     * **Algorithm:**
     * 1. Calculate zoom factor based on wheel direction
     * 2. Clamp new scale to min/max limits
     * 3. Calculate cursor position relative to image
     * 4. Apply zoom centered on cursor position
     *
     * **Zoom Factor Rounding:**
     * - Snaps to scale 1.0 near minimum
     * - Snaps to maxScale near maximum
     * - Provides smooth zoom experience
     *
     * @param event - Wheel event
     * @private
     */
    private handleWheel = (event: WheelEvent): void => {
        event.preventDefault();

        const wheelZoomFactor = this.properties.wheelZoomFactor || 0;
        const zoomFactor = event.deltaY < 0 ? wheelZoomFactor : -wheelZoomFactor;
        let newScale = this.initialScale + zoomFactor;

        // Round to limits for smooth experience
        if (newScale < 1 + wheelZoomFactor) {
            newScale = 1;
        } else if (newScale < this.maxScale && newScale > this.maxScale - wheelZoomFactor) {
            newScale = this.maxScale;
        }

        // Enforce hard limits
        if (newScale < 1 || newScale > this.maxScale) {
            return;
        }

        // Prevent redundant zooms
        if (newScale === this.scale) {
            return;
        }

        this.getElementPosition();
        this.scale = newScale;
        this.zoomChanged(this.scale);

        // Calculate cursor position over image
        const xCenter = event.clientX - this.elementPosition.left - this.initialMoveX;
        const yCenter = event.clientY - this.elementPosition.top - this.initialMoveY;

        // Zoom centered on cursor
        this.setZoom({
            scale: newScale,
            center: [xCenter, yCenter],
        });
    };

    /**
     * Handles window resize events.
     * Recalculates auto-height if enabled.
     *
     * @param _event - Resize event (unused)
     * @private
     */
    private handleResize = (_event: Event): void => {
        this.setAutoHeight();
    };

    // ========================================================================
    // ZOOM CONSTRAINT LOGIC
    // ========================================================================

    /**
     * Enforces min/max zoom limits.
     *
     * **Algorithm:**
     * 1. Check if scale exceeds limits
     * 2. Calculate current position ratios
     * 3. Clamp scale to limits
     * 4. Recalculate position to maintain visual consistency
     *
     * **Why preserve position ratios:**
     * When scale is clamped, we want the image to stay visually
     * centered on the same point, not jump to a different position.
     *
     * @private
     */
    private handleLimitZoom(): void {
        const limitZoom = this.maxScale;
        const minScale = this.properties.minScale || 0;

        if (this.scale > limitZoom || this.scale <= minScale) {
            const imageWidth = this.getImageWidth();
            const imageHeight = this.getImageHeight();
            const enlargedImageWidth = imageWidth * this.scale;
            const enlargedImageHeight = imageHeight * this.scale;

            // Calculate position ratios before clamping
            const moveXRatio = this.moveX / (enlargedImageWidth - imageWidth);
            const moveYRatio = this.moveY / (enlargedImageHeight - imageHeight);

            // Clamp scale
            if (this.scale > limitZoom) {
                this.scale = limitZoom;
                this.zoomChanged(this.scale);
            }

            if (this.scale <= minScale) {
                this.scale = minScale;
                this.zoomChanged(this.scale);
            }

            // Recalculate position with clamped scale
            const newImageWidth = imageWidth * this.scale;
            const newImageHeight = imageHeight * this.scale;

            this.moveX = -Math.abs(moveXRatio * (newImageWidth - imageWidth));
            this.moveY = -Math.abs(-moveYRatio * (newImageHeight - imageHeight));
        }
    }

    // ========================================================================
    // COORDINATE CALCULATIONS
    // ========================================================================

    /**
     * Calculates X position of touch/mouse relative to element left edge.
     *
     * @param event - Touch or mouse event
     * @param index - Touch index (for multi-touch)
     * @returns X coordinate relative to element
     * @private
     */
    private moveLeft(event: TouchEvent | MouseEvent, index: number = 0): number {
        const clientX = this.getClientPosition(event, index).clientX;
        return clientX - this.elementPosition.left;
    }

    /**
     * Calculates Y position of touch/mouse relative to element top edge.
     *
     * @param event - Touch or mouse event
     * @param index - Touch index (for multi-touch)
     * @returns Y coordinate relative to element
     * @private
     */
    private moveTop(event: TouchEvent | MouseEvent, index: number = 0): number {
        const clientY = this.getClientPosition(event, index).clientY;
        return clientY - this.elementPosition.top;
    }

    /**
     * Extracts client coordinates from touch or mouse event.
     *
     * **Handles:**
     * - Touch events (touchstart, touchmove)
     * - Mouse events (mousedown, mousemove)
     * - Multi-touch (via index parameter)
     *
     * @param event - Touch or mouse event
     * @param index - Touch index for multi-touch events
     * @returns Object with clientX and clientY
     * @private
     */
    private getClientPosition(event: TouchEvent | MouseEvent, index: number = 0): { clientX: number; clientY: number } {
        let clientX = 0;
        let clientY = 0;

        if (event.type === 'touchstart' || event.type === 'touchmove') {
            clientX = (event as TouchEvent).touches[index].clientX;
            clientY = (event as TouchEvent).touches[index].clientY;
        } else if (event.type === 'mousedown' || event.type === 'mousemove') {
            clientX = (event as MouseEvent).clientX;
            clientY = (event as MouseEvent).clientY;
        }

        return {
            clientX,
            clientY,
        };
    }

    /**
     * Caches element position for coordinate calculations.
     * Called on touchstart and wheel events.
     *
     * @private
     */
    private getElementPosition(): void {
        this.elementPosition = (this.element.parentElement || this.element).getBoundingClientRect();
    }

    /**
     * Stores initial touch/mouse position for gesture tracking.
     *
     * @param event - Touch or mouse event
     * @private
     */
    private getTouchstartPosition(event: TouchEvent | MouseEvent): void {
        const { clientX, clientY } = this.getClientPosition(event);

        this.startX = clientX - this.elementPosition.left;
        this.startY = clientY - this.elementPosition.top;
    }

    /**
     * Calculates Euclidean distance between two touch points.
     *
     * **Formula:** `√((x₁ - x₂)² + (y₁ - y₂)²)`
     *
     * Used for pinch gesture scale calculations.
     *
     * @param touches - Touch list with at least 2 touches
     * @returns Distance in pixels
     * @private
     */
    private getDistance(touches: TouchList): number {
        return Math.sqrt(Math.pow(touches[0].pageX - touches[1].pageX, 2) + Math.pow(touches[0].pageY - touches[1].pageY, 2));
    }

    // ========================================================================
    // PAN CONSTRAINT LOGIC
    // ========================================================================

    /**
     * Centers image and prevents gaps at edges.
     *
     * **Responsibilities:**
     * - Reset position if moved into positive territory
     * - Enforce pan limits
     * - Center small images
     *
     * @returns True if position was changed
     * @private
     */
    private centeringImage(): boolean {
        const img = this.getImageElement();
        const initialMoveX = this.moveX;
        const initialMoveY = this.moveY;

        // Reset if dragged too far right or down
        if (this.moveY > 0) {
            this.moveY = 0;
        }
        if (this.moveX > 0) {
            this.moveX = 0;
        }

        if (img) {
            this.limitPanY();
            this.limitPanX();
        }

        // Center small images
        if (img && this.scale < 1) {
            if (this.moveX < this.element.offsetWidth * (1 - this.scale)) {
                this.moveX = this.element.offsetWidth * (1 - this.scale);
            }
        }

        return initialMoveX !== this.moveX || initialMoveY !== this.moveY;
    }

    /**
     * Limits vertical panning to prevent gaps.
     *
     * **Algorithm:**
     * - If image smaller than container: center it
     * - If image larger: prevent panning past top/bottom edges
     *
     * @private
     */
    private limitPanY(): void {
        const imgHeight = this.getImageHeight();
        const scaledImgHeight = imgHeight * this.scale;
        const parentHeight = this.parentElement.offsetHeight;
        const elementHeight = this.element.offsetHeight;

        if (scaledImgHeight < parentHeight) {
            // Image smaller than container: center it
            this.moveY = (parentHeight - elementHeight * this.scale) / 2;
        } else {
            // Image larger: prevent panning past edges
            const imgOffsetTop = ((imgHeight - elementHeight) * this.scale) / 2;

            if (this.moveY > imgOffsetTop) {
                this.moveY = imgOffsetTop;
            } else if (scaledImgHeight + Math.abs(imgOffsetTop) - parentHeight + this.moveY < 0) {
                this.moveY = -(scaledImgHeight + Math.abs(imgOffsetTop) - parentHeight);
            }
        }
    }

    /**
     * Limits horizontal panning to prevent gaps.
     *
     * **Algorithm:**
     * - If image smaller than container: center it
     * - If image larger: prevent panning past left/right edges
     *
     * @private
     */
    private limitPanX(): void {
        const imgWidth = this.getImageWidth();
        const scaledImgWidth = imgWidth * this.scale;
        const parentWidth = this.parentElement.offsetWidth;
        const elementWidth = this.element.offsetWidth;

        if (scaledImgWidth < parentWidth) {
            // Image smaller than container: center it
            this.moveX = (parentWidth - elementWidth * this.scale) / 2;
        } else {
            // Image larger: prevent panning past edges
            const imgOffsetLeft = ((imgWidth - elementWidth) * this.scale) / 2;

            if (this.moveX > imgOffsetLeft) {
                this.moveX = imgOffsetLeft;
            } else if (scaledImgWidth + Math.abs(imgOffsetLeft) - parentWidth + this.moveX < 0) {
                this.moveX = -(imgWidth * this.scale + Math.abs(imgOffsetLeft) - parentWidth);
            }
        }
    }

    // ========================================================================
    // STYLE MANAGEMENT
    // ========================================================================

    /**
     * Sets initial CSS styles on container element.
     *
     * **Styles Applied:**
     * - display: flex (for centering)
     * - alignItems: center (vertical centering)
     * - justifyContent: center (horizontal centering)
     * - transformOrigin: 0 0 (for matrix transform)
     *
     * @private
     */
    private setBasicStyles(): void {
        this.element.style.display = 'flex';
        this.element.style.alignItems = 'center';
        this.element.style.justifyContent = 'center';
        this.element.style.transformOrigin = '0 0';
        this.setImageSize();
        this.setDraggableImage();
    }

    /**
     * Removes all styles set by {@link setBasicStyles}.
     * Called on {@link destroy}.
     *
     * @private
     */
    private removeBasicStyles(): void {
        this.element.style.display = '';
        this.element.style.alignItems = '';
        this.element.style.justifyContent = '';
        this.element.style.transformOrigin = '';
        this.removeImageSize();
        this.removeDraggableImage();
    }

    /**
     * Sets draggable attribute on image element.
     *
     * @private
     */
    private setDraggableImage(): void {
        const imgElement = this.getImageElement();

        if (imgElement) {
            imgElement.draggable = this.properties.draggableImage || false;
        }
    }

    /**
     * Removes draggable attribute from image element.
     *
     * @private
     */
    private removeDraggableImage(): void {
        const imgElement = this.getImageElement();

        if (imgElement) {
            imgElement.draggable = true;
        }
    }

    /**
     * Sets max-width and max-height on image element.
     * Ensures image fits within container.
     *
     * @private
     */
    private setImageSize(): void {
        const imgElement = this.getImageElements();

        if (imgElement.length) {
            imgElement[0].style.maxWidth = '100%';
            imgElement[0].style.maxHeight = '100%';

            this.setAutoHeight();
        }
    }

    /**
     * Calculates and sets auto-height based on image aspect ratio.
     *
     * **Formula:** `height = parentWidth / (imageWidth / imageHeight)`
     *
     * Only applied if autoHeight property is enabled.
     *
     * @private
     */
    private setAutoHeight(): void {
        const imgElement = this.getImageElements();

        if (!this.properties.autoHeight || !imgElement.length) {
            return;
        }

        const imgNaturalWidth = imgElement[0].getAttribute('width') || '1';
        const imgNaturalHeight = imgElement[0].getAttribute('height') || '1';
        const sizeRatio = +imgNaturalWidth / +imgNaturalHeight;
        const parentWidth = this.parentElement.offsetWidth;

        imgElement[0].style.maxHeight = parentWidth / sizeRatio + 'px';
    }

    /**
     * Removes max-width and max-height from image element.
     *
     * @private
     */
    private removeImageSize(): void {
        const imgElement = this.getImageElements();

        if (imgElement.length) {
            imgElement[0].style.maxWidth = '';
            imgElement[0].style.maxHeight = '';
        }
    }

    // ========================================================================
    // STATE MANAGEMENT
    // ========================================================================

    /**
     * Resets zoom to original size (scale = 1).
     *
     * **Actions:**
     * 1. Set scale to 1
     * 2. Reset translation to 0,0
     * 3. Update initial values
     * 4. Apply transform with animation
     *
     * @private
     */
    private resetScale(): void {
        this.scale = 1;
        this.zoomChanged(this.scale);
        this.moveX = 0;
        this.moveY = 0;
        this.updateInitialValues();
        this.transformElement(this.properties.transitionDuration || 200);
    }

    /**
     * Updates initial values after gesture ends.
     * Persists current state as baseline for next gesture.
     *
     * **Updated Values:**
     * - initialScale = scale
     * - initialMoveX = moveX
     * - initialMoveY = moveY
     *
     * @private
     */
    private updateInitialValues(): void {
        this.initialScale = this.scale;
        this.initialMoveX = this.moveX;
        this.initialMoveY = this.moveY;
    }

    // ========================================================================
    // DOM MEASUREMENTS
    // ========================================================================

    /**
     * Gets the height of the target element (usually IMG).
     *
     * @returns Element offset height in pixels, or 0 if not initialized
     * @private
     */
    private getImageHeight(): number {
        const img = this.getImageElement();
        return img?.offsetHeight || 0;
    }

    /**
     * Gets the width of the target element (usually IMG).
     *
     * @returns Element offset width in pixels, or 0 if not initialized
     * @private
     */
    private getImageWidth(): number {
        const img = this.getImageElement();
        return img?.offsetWidth || 0;
    }

    /**
     * Gets the first element matching elementTarget tag.
     *
     * @returns Target element or undefined if not found
     * @private
     */
    private getImageElement(): HTMLElement | undefined {
        // Guard against accessing element before initialization (important in zoneless mode)
        if (!this.element) {
            return undefined;
        }

        const imgElement = this.element.getElementsByTagName(this.elementTarget);

        if (imgElement.length) {
            return imgElement[0] as HTMLElement;
        }
        return undefined;
    }

    /**
     * Gets all elements matching elementTarget tag.
     *
     * @returns HTMLCollection of matching elements
     * @private
     */
    private getImageElements(): HTMLCollectionOf<HTMLElement> {
        return this.element.getElementsByTagName(this.elementTarget) as HTMLCollectionOf<HTMLElement>;
    }

    // ========================================================================
    // CSS TRANSFORM APPLICATION
    // ========================================================================

    /**
     * Applies CSS transform to element.
     *
     * **Transform Format:**
     * `matrix(scaleX, skewY, skewX, scaleY, translateX, translateY)`
     *
     * **Why matrix instead of translate/scale:**
     * - Single composite transform (better performance)
     * - Hardware acceleration
     * - No transform order issues
     *
     * @param duration - Transition duration in milliseconds
     * @private
     */
    private transformElement(duration: number): void {
        this.element.style.transition = 'all ' + duration + 'ms';
        this.element.style.transform =
            'matrix(' + Number(this.scale) + ', 0, 0, ' + Number(this.scale) + ', ' + Number(this.moveX) + ', ' + Number(this.moveY) + ')';
    }

    /**
     * Aligns image after gesture ends.
     * Applies centering with animation if position changed.
     *
     * @private
     */
    private alignImage(): void {
        const isMoveChanged = this.centeringImage();

        if (isMoveChanged) {
            this.updateInitialValues();
            this.transformElement(this.properties.transitionDuration || 200);
        }
    }

    // ========================================================================
    // DEVICE DETECTION
    // ========================================================================

    /**
     * Detects if device has touch screen.
     *
     * **Methods:**
     * 1. Check for 'ontouchstart' in window
     * 2. Check for vendor-prefixed touch-enabled media queries
     *
     * @returns True if touch screen detected
     * @private
     */
    private isTouchScreen(): boolean {
        const prefixes = ' -webkit- -moz- -o- -ms- '.split(' ');

        if ('ontouchstart' in window) {
            return true;
        }

        const query = ['(', prefixes.join('touch-enabled),('), 'heartz', ')'].join('');
        return this.getMatchMedia(query);
    }

    /**
     * Checks if media query matches.
     *
     * @param query - Media query string
     * @returns True if query matches
     * @private
     */
    private getMatchMedia(query: string): boolean {
        return window.matchMedia(query).matches;
    }

    // ========================================================================
    // PUBLIC API - STATE QUERIES
    // ========================================================================

    /**
     * Checks if element is currently in draggable state.
     *
     * **Returns true if:**
     * - Pan is enabled AND
     * - Image is larger than container (when zoomed in or naturally large)
     *
     * Used by component to set cursor styles.
     *
     * **Zoneless Mode:**
     * - Returns false if service not initialized (important for computed signals)
     *
     * @returns True if element can be dragged
     * @public
     */
    public isDragging(): boolean {
        // Guard against accessing before initialization (critical in zoneless mode)
        if (!this.element || !this.parentElement || this.properties.disablePan) {
            return false;
        }

        const imgHeight = this.getImageHeight();
        const imgWidth = this.getImageWidth();

        if (this.scale > 1) {
            return imgHeight * this.scale > this.parentElement.offsetHeight || imgWidth * this.scale > this.parentElement.offsetWidth;
        }
        if (this.scale === 1) {
            return imgHeight > this.parentElement.offsetHeight || imgWidth > this.parentElement.offsetWidth;
        }

        return false;
    }

    // ========================================================================
    // PUBLIC API - MAX ZOOM DETECTION
    // ========================================================================

    /**
     * Detects and sets maximum zoom limit.
     *
     * **Modes:**
     * - Number: Use explicit limit
     * - 'original image size': Calculate from image natural dimensions
     *
     * @public
     */
    public detectLimitZoom(): void {
        // Assign to default only if not already set
        this.maxScale ??= this.defaultMaxScale;

        if (this.properties.limitZoom === 'original image size' && this.elementTarget === 'IMG') {
            // Poll until image dimensions available
            this.pollLimitZoomForOriginalImage();
        }
    }

    /**
     * Polls for image natural dimensions to calculate max scale.
     *
     * **Why polling:**
     * Image may not be loaded when constructor runs.
     * We need naturalWidth/naturalHeight which are only available after load.
     *
     * **Formula:** `maxScale = naturalWidth / offsetWidth`
     *
     * @private
     */
    private pollLimitZoomForOriginalImage(): void {
        const poll = setInterval(() => {
            const maxScaleForOriginalImage = this.getMaxScaleForOriginalImage();
            if (typeof maxScaleForOriginalImage === 'number') {
                this.maxScale = maxScaleForOriginalImage;
                clearInterval(poll);
            }
        }, 10);
    }

    /**
     * Calculates max scale from image natural dimensions.
     *
     * @returns Max scale or undefined if image not loaded
     * @private
     */
    private getMaxScaleForOriginalImage(): number {
        let maxScale!: number;
        const img = this.element.getElementsByTagName('img')[0];

        if (img.naturalWidth && img.offsetWidth) {
            maxScale = img.naturalWidth / img.offsetWidth;
        }

        return maxScale;
    }

    // ========================================================================
    // PUBLIC API - ZOOM CONTROLS
    // ========================================================================

    /**
     * Toggles between zoomed in and zoomed out states.
     *
     * **Behavior:**
     * - If scale = 1: Zoom in
     * - If scale > 1: Zoom out (reset to 1)
     *
     * **Zoom-in Modes:**
     * - Touch event: Zoom to tap point (doubleTapScale)
     * - No event: Zoom to center (zoomControlScale)
     *
     * @param event - Touch event (for double-tap) or false (for button click)
     * @public
     */
    public toggleZoom(event: TouchEvent | boolean = false): void {
        if (this.initialScale === 1) {
            // Zoom in
            if (event && (event as TouchEvent).changedTouches) {
                // Double-tap: zoom to tap point
                if (this.properties.doubleTapScale === undefined) {
                    return;
                }

                const changedTouches = (event as TouchEvent).changedTouches;
                this.scale = this.initialScale * this.properties.doubleTapScale!;
                this.zoomChanged(this.scale);

                // Calculate offset to center on tap point
                this.moveX =
                    this.initialMoveX - (changedTouches[0].clientX - this.elementPosition.left) * (this.properties.doubleTapScale - 1);
                this.moveY =
                    this.initialMoveY - (changedTouches[0].clientY - this.elementPosition.top) * (this.properties.doubleTapScale - 1);
            } else {
                // Button click: zoom to center
                const zoomControlScale = this.properties.zoomControlScale || 0;
                this.scale = this.initialScale * (zoomControlScale + 1);
                this.zoomChanged(this.scale);

                this.moveX = this.initialMoveX - (this.element.offsetWidth * (this.scale - 1)) / 2;
                this.moveY = this.initialMoveY - (this.element.offsetHeight * (this.scale - 1)) / 2;
            }

            this.centeringImage();
            this.updateInitialValues();
            this.transformElement(this.properties.transitionDuration || 200);
        } else {
            // Zoom out (reset)
            this.resetScale();
        }
    }

    /**
     * Increases zoom by specified value.
     *
     * **Behavior:**
     * - Adds value to current scale
     * - Clamps to maxScale
     * - Zooms to center point
     *
     * @param value - Amount to increase scale
     * @returns New scale value
     * @public
     */
    public zoomIn(value: number): number {
        const scale = this.scale + value;

        if (scale >= this.maxScale) {
            this.scale = this.maxScale;
            this.zoomChanged(this.scale);

            return this.scale;
        }

        this.setZoom({ scale });

        return this.scale;
    }

    /**
     * Decreases zoom by specified value.
     *
     * **Behavior:**
     * - Subtracts value from current scale
     * - Clamps to minScale
     * - Zooms to center point
     *
     * @param value - Amount to decrease scale
     * @returns New scale value
     * @public
     */
    public zoomOut(value: number): number {
        const scale = this.scale - value;

        if (scale <= (this.properties.minScale || 0)) {
            this.scale = this.properties.minScale || 0;
            this.zoomChanged(this.scale);

            return this.scale;
        }

        this.setZoom({ scale });

        return this.scale;
    }

    /**
     * Zooms to specific point on image.
     *
     * **Used by:** Click-to-zoom feature
     *
     * **Algorithm:**
     * 1. Get click coordinates relative to element
     * 2. Clamp target scale to limits
     * 3. If already zoomed, reset
     * 4. Calculate offset to keep clicked point under cursor
     * 5. Apply transform
     *
     * **Math:**
     * ```
     * scaleRatio = newScale / initialScale
     * moveX = initialMoveX - xRelative * (scaleRatio - 1)
     * moveY = initialMoveY - yRelative * (scaleRatio - 1)
     * ```
     *
     * @param clientX - Click X coordinate (viewport)
     * @param clientY - Click Y coordinate (viewport)
     * @param targetScale - Desired zoom scale
     * @public
     */
    public zoomToPoint(clientX: number, clientY: number, targetScale: number): void {
        this.getElementPosition();

        // Calculate click point relative to element
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

        // If already at target or zoomed in, reset
        if (this.scale >= targetScale || this.scale > 1) {
            this.resetScale();
            return;
        }

        // Apply zoom
        this.scale = newScale;
        this.zoomChanged(this.scale);

        // Calculate offset to keep clicked point fixed
        const scaleRatio = newScale / this.initialScale;
        this.moveX = this.initialMoveX - xRelativeToElement * (scaleRatio - 1);
        this.moveY = this.initialMoveY - yRelativeToElement * (scaleRatio - 1);

        this.centeringImage();
        this.updateInitialValues();
        this.transformElement(this.properties.transitionDuration || 200);
    }

    /**
     * Sets zoom to specific scale with optional center point.
     *
     * **Internal method** used by zoomIn, zoomOut, handleWheel.
     *
     * **Modes:**
     * - With center: Zoom to specific point
     * - Without center: Zoom to element center
     *
     * @param properties - Object with scale and optional center
     * @private
     */
    private setZoom(properties: { scale: number; center?: number[] }): void {
        this.scale = properties.scale;
        this.zoomChanged(this.scale);

        let xCenter;
        let yCenter;
        const visibleAreaWidth = this.element.offsetWidth;
        const visibleAreaHeight = this.element.offsetHeight;
        const scalingPercent = (visibleAreaWidth * this.scale) / (visibleAreaWidth * this.initialScale);

        if (properties.center) {
            xCenter = properties.center[0];
            yCenter = properties.center[1];
        } else {
            xCenter = visibleAreaWidth / 2 - this.initialMoveX;
            yCenter = visibleAreaHeight / 2 - this.initialMoveY;
        }

        this.moveX = this.initialMoveX - (scalingPercent * xCenter - xCenter);
        this.moveY = this.initialMoveY - (scalingPercent * yCenter - yCenter);

        this.centeringImage();
        this.updateInitialValues();
        this.transformElement(this.properties.transitionDuration || 200);
    }

    // ========================================================================
    // PUBLIC API - LIFECYCLE
    // ========================================================================

    /**
     * Destroys the IvyPinch instance.
     *
     * **Cleanup:**
     * - Resets zoom to original state
     * - Removes CSS transforms
     * - Removes CSS styles
     * - Destroys touch event handlers
     * - Removes event listeners
     *
     * **Important:** Call this when removing the component to prevent memory leaks.
     *
     * @public
     */
    public destroy(): void {
        // Reset zoom to initial state before cleanup
        this.scale = 1;
        this.moveX = 0;
        this.moveY = 0;
        this.element.style.transform = 'none';
        this.element.style.transition = 'none';

        // Clean up styles and event listeners
        this.removeBasicStyles();
        this.touches.destroy();
    }

    // ========================================================================
    // UTILITIES
    // ========================================================================

    /**
     * Gets property value with fallback to default.
     *
     * @param propertyName - Property key
     * @returns Property value or default
     * @private
     */
    private getPropertiesValue<K extends keyof Properties>(propertyName: K): Properties[K] {
        if (this.properties && this.properties[propertyName] !== undefined) {
            return this.properties[propertyName];
        } else {
            return defaultProperties[propertyName];
        }
    }
}
