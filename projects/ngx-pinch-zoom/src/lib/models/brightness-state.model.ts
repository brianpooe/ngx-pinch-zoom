/**
 * Configuration for brightness control
 */
export interface BrightnessConfig {
    enabled: boolean;
    step: number;
    min: number;
    max: number;
}

/**
 * Current brightness state
 */
export interface BrightnessState {
    value: number;
    atMin: boolean;
    atMax: boolean;
}
