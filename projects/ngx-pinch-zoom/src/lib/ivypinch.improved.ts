/**
 * ============================================================================
 * IvyPinch - Core Zoom & Pan Logic
 * ============================================================================
 *
 * This is a heavily commented version of ivypinch.ts for maintainer reference.
 * Use this file to understand how the core logic works.
 *
 * Key Responsibilities:
 * 1. Process pinch gestures to calculate scale
 * 2. Process pan gestures to calculate translation
 * 3. Apply scale/translation constraints (min/max zoom, pan limits)
 * 4. Update DOM via CSS transforms
 * 5. Notify component of state changes
 *
 * Architecture:
 * - Pure TypeScript class (no Angular dependencies)
 * - Uses Touches class for event detection
 * - Communicates with component via callback function
 * - Manipulates DOM directly via element.style
 *
 * Transform Mathematics:
 * - Uses CSS transform matrix for hardware acceleration
 * - Format: matrix(scaleX, 0, 0, scaleY, translateX, translateY)
 * - Applies: translate3d(moveX, moveY, 0) scale(scale)
 *
 * For full documentation, see docs/ARCHITECTURE.md
 */

import { EventType, Touches } from './touches';
import { Properties } from './interfaces';
import { defaultProperties } from './properties';

export class IvyPinch {
    // ========================================================================
    // CONFIGURATION PROPERTIES
    // ========================================================================

    /**
     * Merged properties from defaults and user input.
     * Contains all configuration like limitZoom, doubleTap, etc.
     */
    private readonly properties: Properties = defaultProperties;

    // ========================================================================
    // EVENT HANDLING
    // ========================================================================

    /**
     * Touch and mouse event handler instance.
     * Detects gestures and emits typed events (pinch, pan, tap).
     */
    private touches!: Touches;

    // ========================================================================
    // DOM REFERENCES
    // ========================================================================

    /**
     * The element being transformed (pinch-zoom container).
     * This is the element we apply CSS transforms to.
     */
    private readonly element: HTMLElement;

    /**
     * Tag name of the target element inside container.
     * Usually 'IMG' but could be any element.
     */
    private readonly elementTarget!: string;

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
     * Current zoom scale (1 = original size, 2 = 2x zoomed, etc.)
     * This is the primary state variable for zoom level.
     * PUBLIC: Exposed so component can read current scale.
     */
    public scale: number = 1;

    /**
     * Scale value at the start of the current gesture.
     * Used to calculate relative scale changes during pinch.
     * Updated when gesture ends via updateInitialValues().
     */
    private initialScale: number = 1;

    /**
     * Maximum allowed scale value.
     * Either set from properties.limitZoom or calculated from image size.
     */
    public maxScale!: number;

    /**
     * Default maximum scale when no limit is specified.
     * Used as fallback value.
     */
    private readonly defaultMaxScale: number = 3;

    // ========================================================================
    // TRANSLATION STATE (Pan Position)
    // ========================================================================

    /**
     * Current horizontal offset in pixels.
     * Positive = moved right, Negative = moved left.
     * Applied via CSS transform translate.
     */
    private moveX: number = 0;

    /**
     * Current vertical offset in pixels.
     * Positive = moved down, Negative = moved up.
     * Applied via CSS transform translate.
     */
    private moveY: number = 0;

    /**
     * Horizontal offset at the start of current gesture.
     * Used to calculate delta during pan/pinch.
     */
    private initialMoveX: number = 0;

    /**
     * Vertical offset at the start of current gesture.
     * Used to calculate delta during pan/pinch.
     */
    private initialMoveY: number = 0;

    // ========================================================================
    // GESTURE TRACKING STATE
    // ========================================================================

    /**
     * Current gesture type being performed.
     * Used to track state machine of user interactions.
     * Values: 'pan', 'pinch', 'tap', 'touchend', or undefined
     */
    private eventType!: EventType;

    /**
     * X coordinate where touch/mouse started (relative to element).
     * Used for pan delta calculation.
     */
    private startX: number = 0;

    /**
     * Y coordinate where touch/mouse started (relative to element).
     * Used for pan delta calculation.
     */
    private startY: number = 0;

    // ========================================================================
    // PINCH GESTURE STATE
    // ========================================================================

    /**
     * Current distance between two fingers during pinch.
     * Calculated using Pythagorean theorem.
     * Used to determine zoom scale ratio.
     */
    private distance: number = 0;

    /**
     * Distance between fingers when pinch started.
     * Used as denominator in scale ratio calculation:
     * scale = initialScale * (distance / initialDistance)
     */
    private initialDistance: number = 0;

    /**
     * Horizontal offset between fingers' center point and element center.
     * Used to calculate zoom center point for fixed-point zooming.
     * Formula: moveXC = (finger1X + finger2X)/2 - initialMoveX
     */
    private moveXC: number = 0;

    /**
     * Vertical offset between fingers' center point and element center.
     * Used to calculate zoom center point for fixed-point zooming.
     * Formula: moveYC = (finger1Y + finger2Y)/2 - initialMoveY
     */
    private moveYC: number = 0;

    /**
     * X coordinate of pinch center point when pinch started.
     * Used when draggableOnPinch is enabled to track center movement.
     */
    private initialPinchCenterX = 0;

    /**
     * Y coordinate of pinch center point when pinch started.
     * Used when draggableOnPinch is enabled to track center movement.
     */
    private initialPinchCenterY = 0;

    // ========================================================================
    // CALLBACKS
    // ========================================================================

    /**
     * Callback function to notify component of scale changes.
     * Called whenever this.scale is updated.
     * Component uses this to update signals and emit events.
     */
    private zoomChanged: (scale: number) => void;

    // ========================================================================
    // COMPUTED PROPERTIES
    // ========================================================================

    /**
     * Minimum scale at which panning is enabled.
     * Default: 1.0001 (slightly above 1 to prevent pan at normal size)
     * Prevents accidental panning when not zoomed.
     */
    get minPanScale(): number {
        return this.getPropertiesValue('minPanScale') || 1.0001;
    }

    /**
     * Full resolution image configuration (if available).
     * Used for progressive loading of high-res images.
     */
    get fullImage(): { path: string; minScale?: number } | undefined {
        return this.properties.fullImage;
    }

    // ========================================================================
    // CONSTRUCTOR & INITIALIZATION
    // ========================================================================

    /**
     * Initialize IvyPinch with configuration and callback.
     *
     * @param properties - Configuration object (merged with defaults)
     * @param zoomChanged - Callback to notify component of scale changes
     *
     * Initialization flow:
     * 1. Extract element reference
     * 2. Merge properties with defaults
     * 3. Detect max zoom limit
     * 4. Create Touches instance for event handling
     * 5. Set up basic CSS styles
     * 6. Register event handlers
     */
    constructor(properties: Properties, zoomChanged: (scale: number) => void) {
        // Store element reference
        this.element = properties.element!;
        this.zoomChanged = zoomChanged;

        // Guard: element is required
        if (!this.element) {
            return;
        }

        // Set max scale if numeric limit provided
        if (typeof properties.limitZoom === 'number') {
            this.maxScale = properties.limitZoom;
        }

        // Detect element type (usually IMG)
        const firstChild = this.element.querySelector('*');
        this.elementTarget = firstChild?.tagName || 'IMG';

        // Get parent for boundary calculations
        this.parentElement = this.element.parentElement || this.element;

        // Merge user properties with defaults
        this.properties = Object.assign({}, defaultProperties, properties);

        // Calculate max zoom based on image size (if limitZoom === 'original image size')
        this.detectLimitZoom();

        // Create touch/mouse event handler
        this.touches = new Touches({
            element: this.element,
            listeners: properties.listeners,
            resize: properties.autoHeight,
            mouseListeners: {
                mousedown: 'handleMousedown',
                mouseup: 'handleMouseup',
                wheel: 'handleWheel',
            },
        });

        // Initialize CSS styles (flexbox centering, transform origin)
        this.setBasicStyles();

        // ====================================================================
        // EVENT HANDLER REGISTRATION
        // ====================================================================

        // Touch events
        this.touches.on('touchstart', this.handleTouchstart as any);
        this.touches.on('touchend', this.handleTouchend as any);

        // Mouse events (desktop)
        this.touches.on('mousedown', this.handleTouchstart as any);
        this.touches.on('mouseup', this.handleTouchend as any);

        // Pan gesture (one finger drag)
        this.touches.on('pan', this.handlePan as any);
        this.touches.on('mousemove', this.handlePan as any);

        // Pinch gesture (two finger zoom)
        this.touches.on('pinch', this.handlePinch as any);

        // Optional: Mouse wheel zoom
        if (this.properties.wheel) {
            this.touches.on('wheel', this.handleWheel as any);
        }

        // Optional: Double-tap zoom
        if (this.properties.doubleTap) {
            this.touches.on('double-tap', this.handleDoubleTap as any);
        }

        // Optional: Auto height adjustment on resize
        if (this.properties.autoHeight) {
            this.touches.on('resize', this.handleResize);
        }
    }

    // ========================================================================
    // EVENT HANDLERS
    // ========================================================================

    /**
     * Handle touchstart/mousedown event.
     *
     * Purpose:
     * - Enable mousemove listeners (for desktop pan)
     * - Update cached element position (for coordinate calculations)
     * - Store initial touch position
     *
     * Called when: User touches screen or presses mouse button
     */
    private handleTouchstart = (event: TouchEvent | MouseEvent): void => {
        // Enable mousemove for desktop panning
        this.touches.addEventListeners('mousemove');

        // Update cached element bounds (may have changed since last touch)
        this.getElementPosition();

        // Store initial touch position if not already in a gesture
        if (this.eventType === undefined) {
            this.getTouchstartPosition(event);
        }
    };

    /**
     * Handle touchend/mouseup event.
     *
     * Purpose:
     * - Apply constraints (min scale, auto zoom out)
     * - Align image within bounds
     * - Update initial values for next gesture
     * - Reset gesture state
     *
     * Called when: User lifts finger or releases mouse button
     */
    private handleTouchend = (event: TouchEvent | MouseEvent): void => {
        // TOUCHEND HANDLING
        if (event.type === 'touchend') {
            const touches = (event as TouchEvent).touches;

            // Constraint: Prevent zoom out below scale 1
            if (this.scale < 1) {
                this.scale = 1;
                this.zoomChanged(this.scale);
            }

            // Feature: Auto zoom out after pinch (if enabled)
            if (this.properties.autoZoomOut && this.eventType === 'pinch') {
                this.scale = 1;
                this.zoomChanged(this.scale);
            }

            // Alignment: Center image within bounds after gesture
            if (this.eventType === 'pinch' || (this.eventType === 'pan' && this.scale > this.minPanScale)) {
                this.alignImage();
            }

            // State update: Save current values as initial for next gesture
            if (
                this.eventType === 'pinch' ||
                this.eventType === 'pan' ||
                this.eventType === 'horizontal-swipe' ||
                this.eventType === 'vertical-swipe'
            ) {
                this.updateInitialValues();
            }

            // State machine: Transition to touchend state
            this.eventType = 'touchend';

            // Reset state if all fingers lifted
            if (touches && touches.length === 0) {
                this.eventType = undefined;
            }
        }

        // MOUSEUP HANDLING
        if (event.type === 'mouseup') {
            // Update initial values for next interaction
            this.updateInitialValues();

            // Reset state machine
            this.eventType = undefined;
        }

        // Cleanup: Remove mousemove listeners (performance)
        this.touches.removeEventListeners('mousemove');
    };

    /**
     * Handle pan gesture (one-finger drag).
     *
     * Purpose:
     * - Calculate new position based on finger/mouse movement
     * - Apply pan constraints (limitPan)
     * - Update element transform
     *
     * Algorithm:
     * 1. Get current touch/mouse position
     * 2. Calculate delta from start position
     * 3. Add delta to initial position
     * 4. Apply constraints
     * 5. Transform element
     *
     * Called when: User drags with one finger (and scale > minPanScale)
     */
    private handlePan = (event: TouchEvent | MouseEvent): void => {
        // Guard: Don't pan if not zoomed enough or pan disabled
        if (this.scale < this.minPanScale || this.properties.disablePan) {
            return;
        }

        // Prevent default to avoid page scroll
        event.preventDefault();

        // Get current touch/mouse position
        const { clientX, clientY } = this.getClientPosition(event);

        // Initialize start position if first pan move
        if (!this.eventType) {
            this.startX = clientX - this.elementPosition.left;
            this.startY = clientY - this.elementPosition.top;
        }

        // Set event type
        this.eventType = 'pan';

        // Calculate new position
        // Formula: newPos = initialPos + (currentPos - startPos)
        this.moveX = this.initialMoveX + (this.moveLeft(event, 0) - this.startX);
        this.moveY = this.initialMoveY + (this.moveTop(event, 0) - this.startY);

        // Apply pan limits (prevent panning past edges)
        if (this.properties.limitPan) {
            this.limitPanY();
            this.limitPanX();
        }

        // Special case: Mouse pan should auto-center
        if (event.type === 'mousemove' && this.scale > this.minPanScale) {
            this.centeringImage();
        }

        // Apply transform (no transition for smooth dragging)
        this.transformElement(0);
    };

    /**
     * Handle double-tap gesture.
     *
     * Purpose:
     * - Toggle between zoomed in and zoomed out
     * - Zoom at tap location (not center)
     *
     * Called when: User taps twice quickly
     */
    private handleDoubleTap = (event: TouchEvent): void => {
        this.toggleZoom(event);
        return;
    };

    /**
     * Handle pinch gesture (two-finger zoom).
     *
     * Purpose:
     * - Calculate scale from finger distance
     * - Zoom at pinch center point (fixed-point zoom)
     * - Apply zoom constraints
     * - Update element transform
     *
     * Algorithm:
     * 1. Calculate distance between fingers
     * 2. Calculate scale ratio: currentDistance / initialDistance
     * 3. Apply ratio to initial scale
     * 4. Calculate zoom center point
     * 5. Adjust position to keep center point fixed
     * 6. Apply constraints
     * 7. Transform element
     *
     * Two modes:
     * - draggableOnPinch: false - Standard pinch zoom (default)
     * - draggableOnPinch: true - Can drag while pinching
     *
     * Called when: User pinches with two fingers
     */
    private handlePinch = (event: TouchEvent): void => {
        // Prevent default to avoid page zoom
        event.preventDefault();

        // MODE 1: Standard pinch zoom (most common)
        if (!this.properties.draggableOnPinch) {
            if (this.eventType === undefined || this.eventType === 'pinch') {
                const touches = event.touches;

                // Initialize pinch on first move
                if (!this.eventType) {
                    // Store initial distance between fingers
                    this.initialDistance = this.getDistance(touches);

                    // Calculate center point between fingers
                    const moveLeft0 = this.moveLeft(event, 0);
                    const moveLeft1 = this.moveLeft(event, 1);
                    const moveTop0 = this.moveTop(event, 0);
                    const moveTop1 = this.moveTop(event, 1);

                    // Store offset from element position to pinch center
                    // This is used for fixed-point zooming
                    this.moveXC = (moveLeft0 + moveLeft1) / 2 - this.initialMoveX;
                    this.moveYC = (moveTop0 + moveTop1) / 2 - this.initialMoveY;
                }

                // Set event type
                this.eventType = 'pinch';

                // Calculate current distance and scale
                this.distance = this.getDistance(touches);

                // Scale formula: newScale = initialScale * (currentDistance / initialDistance)
                // If fingers move apart (distance increases), scale increases
                // If fingers move together (distance decreases), scale decreases
                this.scale = this.initialScale * (this.distance / this.initialDistance);
                this.zoomChanged(this.scale);

                // Calculate position adjustment for fixed-point zoom
                // This keeps the pinch center point visually fixed
                // Mathematical derivation in docs/ARCHITECTURE.md
                const scaleRatio = this.distance / this.initialDistance;
                this.moveX = this.initialMoveX - (scaleRatio * this.moveXC - this.moveXC);
                this.moveY = this.initialMoveY - (scaleRatio * this.moveYC - this.moveYC);

                // Apply zoom constraints (min/max scale)
                this.handleLimitZoom();

                // Apply pan constraints (limit panning past edges)
                if (this.properties.limitPan) {
                    this.limitPanY();
                    this.limitPanX();
                }

                // Apply transform
                this.transformElement(0);
            }

            return;
        }

        // MODE 2: Draggable pinch (can pan while pinching)
        const touches = event.touches;

        // Initialize on first pinch move
        if (!this.eventType) {
            this.eventType = 'pinch';

            // Store initial distance
            this.initialDistance = this.getDistance(touches);

            // Calculate and store initial pinch center
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

        // Set event type
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

        // Calculate movement of pinch center (drag component)
        const deltaX = currentCenterX - this.initialPinchCenterX;
        const deltaY = currentCenterY - this.initialPinchCenterY;

        // Calculate position adjustment for scale change
        const scaleTransX = (scaleRatio - 1) * this.moveXC;
        const scaleTransY = (scaleRatio - 1) * this.moveYC;

        // Combine drag and scale adjustments
        // Formula: newPos = initialPos + dragDelta - scaleTranslation
        this.moveX = this.initialMoveX + deltaX - scaleTransX;
        this.moveY = this.initialMoveY + deltaY - scaleTransY;

        // Apply constraints
        this.handleLimitZoom();
        if (this.properties.limitPan) {
            this.limitPanY();
            this.limitPanX();
        }

        // Apply transform
        this.transformElement(0);
    };

    /**
     * Handle mouse wheel event.
     *
     * Purpose:
     * - Zoom in/out with mouse wheel
     * - Zoom at cursor position (fixed-point zoom)
     *
     * Algorithm:
     * 1. Calculate new scale based on wheel delta
     * 2. Apply constraints and rounding
     * 3. Get cursor position over image
     * 4. Zoom at cursor position
     *
     * Called when: User scrolls mouse wheel
     */
    private handleWheel = (event: WheelEvent): void => {
        // Prevent default page scroll
        event.preventDefault();

        // Get zoom factor from properties
        const wheelZoomFactor = this.properties.wheelZoomFactor || 0;

        // Calculate zoom direction
        // deltaY < 0 = scroll up = zoom in
        // deltaY > 0 = scroll down = zoom out
        const zoomFactor = event.deltaY < 0 ? wheelZoomFactor : -wheelZoomFactor;

        // Calculate new scale
        let newScale = this.initialScale + zoomFactor;

        // Rounding: Snap to 1 or maxScale if close
        if (newScale < 1 + wheelZoomFactor) {
            newScale = 1;
        } else if (newScale < this.maxScale && newScale > this.maxScale - wheelZoomFactor) {
            newScale = this.maxScale;
        }

        // Guard: Don't zoom beyond limits
        if (newScale < 1 || newScale > this.maxScale) {
            return;
        }

        // Guard: Don't apply if already at target scale
        if (newScale === this.scale) {
            return;
        }

        // Update element position (may have scrolled)
        this.getElementPosition();

        // Update scale
        this.scale = newScale;
        this.zoomChanged(this.scale);

        // Calculate cursor position relative to image
        // This becomes the zoom center point
        const xCenter = event.clientX - this.elementPosition.left - this.initialMoveX;
        const yCenter = event.clientY - this.elementPosition.top - this.initialMoveY;

        // Zoom at cursor position
        this.setZoom({
            scale: newScale,
            center: [xCenter, yCenter],
        });
    };

    /**
     * Handle window resize event.
     *
     * Purpose:
     * - Adjust element height based on image aspect ratio
     *
     * Called when: Window is resized (if autoHeight enabled)
     */
    private handleResize = (_event: Event): void => {
        this.setAutoHeight();
    };

    // ========================================================================
    // CONSTRAINT FUNCTIONS
    // ========================================================================

    /**
     * Apply zoom constraints (min/max scale).
     *
     * Purpose:
     * - Prevent zooming beyond maxScale
     * - Prevent zooming below minScale
     * - Adjust position proportionally when scale is clamped
     *
     * Algorithm:
     * 1. Check if scale exceeds limits
     * 2. Calculate position ratios before clamping
     * 3. Clamp scale to limits
     * 4. Recalculate position to maintain ratios
     *
     * Called during: pinch and wheel zoom
     */
    private handleLimitZoom(): void {
        const limitZoom = this.maxScale;
        const minScale = this.properties.minScale || 0;

        // Check if scale is outside limits
        if (this.scale > limitZoom || this.scale <= minScale) {
            // Get current dimensions
            const imageWidth = this.getImageWidth();
            const imageHeight = this.getImageHeight();
            const enlargedImageWidth = imageWidth * this.scale;
            const enlargedImageHeight = imageHeight * this.scale;

            // Calculate position ratios (to maintain relative position)
            const moveXRatio = this.moveX / (enlargedImageWidth - imageWidth);
            const moveYRatio = this.moveY / (enlargedImageHeight - imageHeight);

            // Clamp scale to max limit
            if (this.scale > limitZoom) {
                this.scale = limitZoom;
                this.zoomChanged(this.scale);
            }

            // Clamp scale to min limit
            if (this.scale <= minScale) {
                this.scale = minScale;
                this.zoomChanged(this.scale);
            }

            // Recalculate dimensions with clamped scale
            const newImageWidth = imageWidth * this.scale;
            const newImageHeight = imageHeight * this.scale;

            // Recalculate position to maintain ratios
            this.moveX = -Math.abs(moveXRatio * (newImageWidth - imageWidth));
            this.moveY = -Math.abs(-moveYRatio * (newImageHeight - imageHeight));
        }
    }

    /**
     * Limit vertical panning to prevent showing blank space.
     *
     * Purpose:
     * - Keep image within vertical bounds
     * - Center image if smaller than container
     *
     * Algorithm:
     * 1. Check if image height < container height
     *    → Center vertically
     * 2. Otherwise, prevent panning past top/bottom edges
     *
     * Called during: pan and pinch
     */
    private limitPanY(): void {
        const imgHeight = this.getImageHeight();
        const scaledImgHeight = imgHeight * this.scale;
        const parentHeight = this.parentElement.offsetHeight;
        const elementHeight = this.element.offsetHeight;

        // Case 1: Image smaller than container → center it
        if (scaledImgHeight < parentHeight) {
            this.moveY = (parentHeight - elementHeight * this.scale) / 2;
        }
        // Case 2: Image larger than container → limit panning
        else {
            // Calculate offset for element padding/margin
            const imgOffsetTop = ((imgHeight - elementHeight) * this.scale) / 2;

            // Prevent panning past top edge
            if (this.moveY > imgOffsetTop) {
                this.moveY = imgOffsetTop;
            }
            // Prevent panning past bottom edge
            else if (scaledImgHeight + Math.abs(imgOffsetTop) - parentHeight + this.moveY < 0) {
                this.moveY = -(scaledImgHeight + Math.abs(imgOffsetTop) - parentHeight);
            }
        }
    }

    /**
     * Limit horizontal panning to prevent showing blank space.
     *
     * Purpose:
     * - Keep image within horizontal bounds
     * - Center image if smaller than container
     *
     * Algorithm:
     * 1. Check if image width < container width
     *    → Center horizontally
     * 2. Otherwise, prevent panning past left/right edges
     *
     * Called during: pan and pinch
     */
    private limitPanX(): void {
        const imgWidth = this.getImageWidth();
        const scaledImgWidth = imgWidth * this.scale;
        const parentWidth = this.parentElement.offsetWidth;
        const elementWidth = this.element.offsetWidth;

        // Case 1: Image smaller than container → center it
        if (scaledImgWidth < parentWidth) {
            this.moveX = (parentWidth - elementWidth * this.scale) / 2;
        }
        // Case 2: Image larger than container → limit panning
        else {
            // Calculate offset for element padding/margin
            const imgOffsetLeft = ((imgWidth - elementWidth) * this.scale) / 2;

            // Prevent panning past left edge
            if (this.moveX > imgOffsetLeft) {
                this.moveX = imgOffsetLeft;
            }
            // Prevent panning past right edge
            else if (scaledImgWidth + Math.abs(imgOffsetLeft) - parentWidth + this.moveX < 0) {
                this.moveX = -(imgWidth * this.scale + Math.abs(imgOffsetLeft) - parentWidth);
            }
        }
    }

    /**
     * Center image within container bounds.
     *
     * Purpose:
     * - Prevent showing blank space around edges
     * - Center smaller images
     *
     * Returns: true if position was changed, false otherwise
     *
     * Called during: mouse pan and alignment
     */
    private centeringImage(): boolean {
        const img = this.getImageElement();
        const initialMoveX = this.moveX;
        const initialMoveY = this.moveY;

        // Prevent moving into positive territory (past origin)
        if (this.moveY > 0) {
            this.moveY = 0;
        }
        if (this.moveX > 0) {
            this.moveX = 0;
        }

        // Apply pan limits if image exists
        if (img) {
            this.limitPanY();
            this.limitPanX();
        }

        // Special case: Zoomed out (scale < 1)
        if (img && this.scale < 1) {
            if (this.moveX < this.element.offsetWidth * (1 - this.scale)) {
                this.moveX = this.element.offsetWidth * (1 - this.scale);
            }
        }

        // Return true if position changed
        return initialMoveX !== this.moveX || initialMoveY !== this.moveY;
    }

    // ========================================================================
    // COORDINATE CALCULATION HELPERS
    // ========================================================================

    /**
     * Get horizontal position of touch/mouse relative to element left edge.
     *
     * @param event - Touch or mouse event
     * @param index - Touch point index (for multi-touch)
     * @returns X coordinate relative to element
     */
    private moveLeft(event: TouchEvent | MouseEvent, index: number = 0): number {
        const clientX = this.getClientPosition(event, index).clientX;
        return clientX - this.elementPosition.left;
    }

    /**
     * Get vertical position of touch/mouse relative to element top edge.
     *
     * @param event - Touch or mouse event
     * @param index - Touch point index (for multi-touch)
     * @returns Y coordinate relative to element
     */
    private moveTop(event: TouchEvent | MouseEvent, index: number = 0): number {
        const clientY = this.getClientPosition(event, index).clientY;
        return clientY - this.elementPosition.top;
    }

    /**
     * Extract client coordinates from touch or mouse event.
     *
     * Purpose:
     * - Normalize touch and mouse events
     * - Support multi-touch with index parameter
     *
     * @param event - Touch or mouse event
     * @param index - Touch point index (default 0)
     * @returns Object with clientX and clientY
     */
    private getClientPosition(event: TouchEvent | MouseEvent, index: number = 0): { clientX: number; clientY: number } {
        let clientX = 0;
        let clientY = 0;

        // Extract coordinates based on event type
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
     * Update cached element position.
     *
     * Purpose:
     * - Cache getBoundingClientRect() result for performance
     * - Must be called before coordinate calculations
     *
     * Note: Position may change due to page scroll or layout changes
     */
    private getElementPosition(): void {
        this.elementPosition = (this.element.parentElement || this.element).getBoundingClientRect();
    }

    /**
     * Store initial touch position for pan calculation.
     *
     * @param event - Touch or mouse event
     */
    private getTouchstartPosition(event: TouchEvent | MouseEvent): void {
        const { clientX, clientY } = this.getClientPosition(event);

        this.startX = clientX - this.elementPosition.left;
        this.startY = clientY - this.elementPosition.top;
    }

    /**
     * Calculate Euclidean distance between two touch points.
     *
     * Purpose:
     * - Calculate pinch gesture distance
     * - Used to determine zoom scale
     *
     * Formula: distance = √((x₁ - x₂)² + (y₁ - y₂)²)
     *
     * @param touches - TouchList with at least 2 touches
     * @returns Distance in pixels
     */
    private getDistance(touches: TouchList): number {
        return Math.sqrt(Math.pow(touches[0].pageX - touches[1].pageX, 2) + Math.pow(touches[0].pageY - touches[1].pageY, 2));
    }

    // ========================================================================
    // TRANSFORM & RENDERING
    // ========================================================================

    /**
     * Apply CSS transform to element.
     *
     * Purpose:
     * - Update element visual state
     * - Hardware-accelerated transform
     *
     * Transform matrix format:
     * matrix(scaleX, 0, 0, scaleY, translateX, translateY)
     *
     * Equivalent to:
     * translate(moveX, moveY) scale(scale)
     *
     * @param duration - Transition duration in milliseconds (0 for instant)
     */
    private transformElement(duration: number): void {
        // Set transition for smooth animation
        this.element.style.transition = 'all ' + duration + 'ms';

        // Apply transform matrix
        // Format: matrix(a, b, c, d, tx, ty)
        // a,d = scale
        // tx,ty = translate
        this.element.style.transform =
            'matrix(' +
            Number(this.scale) + // scaleX
            ', 0, 0, ' +
            Number(this.scale) + // scaleY
            ', ' +
            Number(this.moveX) + // translateX
            ', ' +
            Number(this.moveY) + // translateY
            ')';
    }

    // ========================================================================
    // STATE MANAGEMENT
    // ========================================================================

    /**
     * Reset scale to 1 and center image.
     *
     * Purpose:
     * - Zoom out to original size
     * - Used by toggleZoom when zoomed in
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
     * Save current state as initial state for next gesture.
     *
     * Purpose:
     * - Store reference point for delta calculations
     * - Called at end of each gesture
     *
     * Must be called: After pinch, pan, or zoom completes
     */
    private updateInitialValues(): void {
        this.initialScale = this.scale;
        this.initialMoveX = this.moveX;
        this.initialMoveY = this.moveY;
    }

    /**
     * Align image within bounds after gesture ends.
     *
     * Purpose:
     * - Animate image back into bounds if overscrolled
     * - Called on touchend after pan/pinch
     */
    private alignImage(): void {
        const isMoveChanged = this.centeringImage();

        if (isMoveChanged) {
            this.updateInitialValues();
            this.transformElement(this.properties.transitionDuration || 200);
        }
    }

    // ========================================================================
    // PUBLIC API METHODS
    // ========================================================================

    /**
     * Toggle between zoomed in and zoomed out.
     *
     * Purpose:
     * - Double-tap zoom functionality
     * - Zoom button functionality
     *
     * Behavior:
     * - If scale === 1: Zoom in to doubleTapScale
     * - If scale > 1: Zoom out to 1
     *
     * @param event - Touch event (for tap position) or false (for center zoom)
     */
    public toggleZoom(event: TouchEvent | boolean = false): void {
        // ZOOM IN
        if (this.initialScale === 1) {
            // Case 1: Tap event (zoom at tap position)
            if (event && (event as TouchEvent).changedTouches) {
                if (this.properties.doubleTapScale === undefined) {
                    return;
                }

                const changedTouches = (event as TouchEvent).changedTouches;

                // Calculate new scale
                this.scale = this.initialScale * this.properties.doubleTapScale!;
                this.zoomChanged(this.scale);

                // Calculate position to zoom at tap location
                this.moveX =
                    this.initialMoveX - (changedTouches[0].clientX - this.elementPosition.left) * (this.properties.doubleTapScale - 1);
                this.moveY =
                    this.initialMoveY - (changedTouches[0].clientY - this.elementPosition.top) * (this.properties.doubleTapScale - 1);
            }
            // Case 2: Programmatic zoom (zoom at center)
            else {
                const zoomControlScale = this.properties.zoomControlScale || 0;

                // Calculate new scale
                this.scale = this.initialScale * (zoomControlScale + 1);
                this.zoomChanged(this.scale);

                // Calculate position to zoom at center
                this.moveX = this.initialMoveX - (this.element.offsetWidth * (this.scale - 1)) / 2;
                this.moveY = this.initialMoveY - (this.element.offsetHeight * (this.scale - 1)) / 2;
            }

            // Center image within bounds
            this.centeringImage();

            // Save state
            this.updateInitialValues();

            // Apply transform with animation
            this.transformElement(this.properties.transitionDuration || 200);
        }
        // ZOOM OUT
        else {
            this.resetScale();
        }
    }

    /**
     * Zoom in by a specific amount.
     *
     * @param value - Amount to increase scale by
     * @returns New scale value
     */
    public zoomIn(value: number): number {
        const scale = this.scale + value;

        // Clamp to max scale
        if (scale >= this.maxScale) {
            this.scale = this.maxScale;
            this.zoomChanged(this.scale);
            return this.scale;
        }

        // Apply zoom
        this.setZoom({ scale });

        return this.scale;
    }

    /**
     * Zoom out by a specific amount.
     *
     * @param value - Amount to decrease scale by
     * @returns New scale value
     */
    public zoomOut(value: number): number {
        const scale = this.scale - value;

        // Clamp to min scale
        if (scale <= (this.properties.minScale || 0)) {
            this.scale = this.properties.minScale || 0;
            this.zoomChanged(this.scale);
            return this.scale;
        }

        // Apply zoom
        this.setZoom({ scale });

        return this.scale;
    }

    /**
     * Set zoom to specific scale value.
     *
     * Purpose:
     * - Programmatic zoom control
     * - Called by zoomIn/zoomOut/handleWheel
     *
     * Features:
     * - Fixed-point zoom at specified center
     * - Defaults to zooming at element center
     *
     * @param properties - Object with scale and optional center point
     */
    private setZoom(properties: { scale: number; center?: number[] }): void {
        // Update scale
        this.scale = properties.scale;
        this.zoomChanged(this.scale);

        let xCenter;
        let yCenter;
        const visibleAreaWidth = this.element.offsetWidth;
        const visibleAreaHeight = this.element.offsetHeight;

        // Calculate scaling percentage
        const scalingPercent = (visibleAreaWidth * this.scale) / (visibleAreaWidth * this.initialScale);

        // Determine zoom center point
        if (properties.center) {
            xCenter = properties.center[0];
            yCenter = properties.center[1];
        } else {
            // Default to element center
            xCenter = visibleAreaWidth / 2 - this.initialMoveX;
            yCenter = visibleAreaHeight / 2 - this.initialMoveY;
        }

        // Calculate position adjustment for fixed-point zoom
        // Formula keeps the center point visually fixed
        this.moveX = this.initialMoveX - (scalingPercent * xCenter - xCenter);
        this.moveY = this.initialMoveY - (scalingPercent * yCenter - yCenter);

        // Center image within bounds
        this.centeringImage();

        // Save state
        this.updateInitialValues();

        // Apply transform with animation
        this.transformElement(this.properties.transitionDuration || 200);
    }

    /**
     * Check if element can be dragged (panned).
     *
     * Purpose:
     * - Used by component to show drag cursor
     *
     * Returns: true if image is larger than container and pan is enabled
     */
    public isDragging(): boolean {
        if (this.properties.disablePan) {
            return false;
        }

        const imgHeight = this.getImageHeight();
        const imgWidth = this.getImageWidth();

        // Check if scaled image exceeds container
        if (this.scale > 1) {
            return imgHeight * this.scale > this.parentElement.offsetHeight || imgWidth * this.scale > this.parentElement.offsetWidth;
        }

        // Check if normal image exceeds container
        if (this.scale === 1) {
            return imgHeight > this.parentElement.offsetHeight || imgWidth > this.parentElement.offsetWidth;
        }

        return false;
    }

    // ========================================================================
    // ELEMENT HELPERS
    // ========================================================================

    /**
     * Get image height in pixels.
     * @returns Image offsetHeight
     */
    private getImageHeight(): number {
        const img = this.getImageElement() as HTMLImageElement;
        return img.offsetHeight;
    }

    /**
     * Get image width in pixels.
     * @returns Image offsetWidth
     */
    private getImageWidth(): number {
        const img = this.getImageElement() as HTMLImageElement;
        return img.offsetWidth;
    }

    /**
     * Get first element matching elementTarget tag.
     * @returns HTMLElement or undefined if not found
     */
    private getImageElement(): HTMLElement | undefined {
        const imgElement = this.element.getElementsByTagName(this.elementTarget);

        if (imgElement.length) {
            return imgElement[0] as HTMLElement;
        }
        return undefined;
    }

    /**
     * Get all elements matching elementTarget tag.
     * @returns HTMLCollection of elements
     */
    private getImageElements(): HTMLCollectionOf<HTMLElement> {
        return this.element.getElementsByTagName(this.elementTarget) as HTMLCollectionOf<HTMLElement>;
    }

    // ========================================================================
    // STYLE MANAGEMENT
    // ========================================================================

    /**
     * Apply basic CSS styles to container.
     *
     * Purpose:
     * - Set up flexbox for centering
     * - Set transform origin
     * - Configure image sizing
     * - Set draggable attribute
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
     * Remove basic CSS styles from container.
     *
     * Purpose:
     * - Clean up on destroy
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
     * Set draggable attribute on image element.
     */
    private setDraggableImage(): void {
        const imgElement = this.getImageElement();

        if (imgElement) {
            imgElement.draggable = this.properties.draggableImage || false;
        }
    }

    /**
     * Remove draggable attribute from image element.
     */
    private removeDraggableImage(): void {
        const imgElement = this.getImageElement();

        if (imgElement) {
            imgElement.draggable = true;
        }
    }

    /**
     * Set max width/height CSS on image element.
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
     * Calculate and set image height based on aspect ratio.
     *
     * Purpose:
     * - Maintain aspect ratio when container width changes
     * - Called on init and resize
     */
    private setAutoHeight(): void {
        const imgElement = this.getImageElements();

        if (!this.properties.autoHeight || !imgElement.length) {
            return;
        }

        // Get natural dimensions
        const imgNaturalWidth = imgElement[0].getAttribute('width') || '1';
        const imgNaturalHeight = imgElement[0].getAttribute('height') || '1';

        // Calculate aspect ratio
        const sizeRatio = +imgNaturalWidth / +imgNaturalHeight;

        // Get parent width
        const parentWidth = this.parentElement.offsetWidth;

        // Set height to maintain ratio
        imgElement[0].style.maxHeight = parentWidth / sizeRatio + 'px';
    }

    /**
     * Remove max width/height CSS from image element.
     */
    private removeImageSize(): void {
        const imgElement = this.getImageElements();

        if (imgElement.length) {
            imgElement[0].style.maxWidth = '';
            imgElement[0].style.maxHeight = '';
        }
    }

    // ========================================================================
    // MAX ZOOM DETECTION
    // ========================================================================

    /**
     * Detect and set maximum zoom limit.
     *
     * Purpose:
     * - Calculate max scale based on limitZoom property
     * - If limitZoom === 'original image size', calculate from image
     *
     * Called during: Constructor initialization
     */
    public detectLimitZoom(): void {
        // Set default if not already set
        this.maxScale ??= this.defaultMaxScale;

        // Special case: Limit to original image size
        if (this.properties.limitZoom === 'original image size' && this.elementTarget === 'IMG') {
            this.pollLimitZoomForOriginalImage();
        }
    }

    /**
     * Poll for image load and calculate max scale from natural size.
     *
     * Purpose:
     * - Wait for image to load
     * - Calculate: maxScale = naturalWidth / displayWidth
     *
     * Uses polling because image load event may have already fired
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
     * Calculate max scale from image natural dimensions.
     *
     * Formula: maxScale = naturalWidth / displayWidth
     *
     * @returns Max scale number or undefined if image not loaded
     */
    private getMaxScaleForOriginalImage(): number {
        let maxScale!: number;
        const img = this.element.getElementsByTagName('img')[0];

        // Check if image is loaded (has natural dimensions)
        if (img.naturalWidth && img.offsetWidth) {
            maxScale = img.naturalWidth / img.offsetWidth;
        }

        return maxScale;
    }

    // ========================================================================
    // DEVICE DETECTION
    // ========================================================================

    /**
     * Check if device has touch screen.
     *
     * Purpose:
     * - Detect touch capability
     * - Used for conditional feature enabling
     *
     * @returns true if touch screen detected
     */
    private isTouchScreen(): boolean {
        const prefixes = ' -webkit- -moz- -o- -ms- '.split(' ');

        // Check for ontouchstart
        if ('ontouchstart' in window) {
            return true;
        }

        // Check via media query
        const query = ['(', prefixes.join('touch-enabled),('), 'heartz', ')'].join('');
        return this.getMatchMedia(query);
    }

    /**
     * Check if media query matches.
     *
     * @param query - Media query string
     * @returns true if query matches
     */
    private getMatchMedia(query: string): boolean {
        return window.matchMedia(query).matches;
    }

    // ========================================================================
    // UTILITIES
    // ========================================================================

    /**
     * Get property value with fallback to default.
     *
     * @param propertyName - Property name to retrieve
     * @returns Property value or default value
     */
    private getPropertiesValue<K extends keyof Properties>(propertyName: K): Properties[K] {
        if (this.properties && this.properties[propertyName] !== undefined) {
            return this.properties[propertyName];
        } else {
            return defaultProperties[propertyName];
        }
    }

    // ========================================================================
    // CLEANUP
    // ========================================================================

    /**
     * Clean up event listeners and styles.
     *
     * Purpose:
     * - Prevent memory leaks
     * - Remove event listeners
     * - Reset CSS styles
     *
     * Must be called: In component ngOnDestroy
     */
    public destroy(): void {
        this.removeBasicStyles();
        this.touches.destroy();
    }
}

/**
 * ============================================================================
 * END OF IVYPINCH
 * ============================================================================
 *
 * For architecture documentation, see: docs/ARCHITECTURE.md
 * For implementation examples, see: docs/IMPLEMENTATION_GUIDE.md
 * For quick reference, see: docs/QUICK_REFERENCE.md
 */
