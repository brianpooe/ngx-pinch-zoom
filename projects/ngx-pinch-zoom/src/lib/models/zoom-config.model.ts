/**
 * Configuration interface for zoom behavior
 */
export interface ZoomConfig {
    transitionDuration?: number;
    doubleTap?: boolean;
    doubleTapScale?: number;
    autoZoomOut?: boolean;
    limitZoom?: number | 'original image size';
    minScale?: number;
    zoomControlScale?: number;
    disablePan?: boolean;
    limitPan?: boolean;
    minPanScale?: number;
    listeners?: 'auto' | 'mouse and touch';
    wheel?: boolean;
    wheelZoomFactor?: number;
    autoHeight?: boolean;
    draggableImage?: boolean;
    draggableOnPinch?: boolean;
}

/**
 * Component-specific properties extending zoom config
 */
export interface ComponentConfig extends ZoomConfig {
    disabled?: boolean;
    overflow?: 'hidden' | 'visible';
    disableZoomControl?: 'disable' | 'never' | 'auto';
    backgroundColor?: string;
}
