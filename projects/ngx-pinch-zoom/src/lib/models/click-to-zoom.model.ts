/**
 * Configuration for click-to-zoom functionality
 */
export interface ClickToZoomConfig {
    enabled: boolean;
    scale: number;
}

/**
 * Click event data for zoom operations
 */
export interface ClickZoomEvent {
    clientX: number;
    clientY: number;
    targetScale: number;
}
