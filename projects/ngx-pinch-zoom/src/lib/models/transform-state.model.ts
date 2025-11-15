/**
 * Represents the current transformation state of the zoom component
 */
export interface TransformState {
    scale: number;
    moveX: number;
    moveY: number;
}

/**
 * Extended transform state with additional metadata
 */
export interface ExtendedTransformState extends TransformState {
    isZoomedIn: boolean;
    atMaxScale: boolean;
    atMinScale: boolean;
}
