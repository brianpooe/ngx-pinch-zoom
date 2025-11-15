import { Injectable, signal, computed } from '@angular/core';
import { TransformState, ExtendedTransformState } from '../models';

/**
 * Service for managing zoom/transform state with Angular signals
 * Provides reactive access to zoom state
 */
@Injectable()
export class ZoomStateService {
    // Private signals for state management
    private scaleSignal = signal<number>(1);
    private moveXSignal = signal<number>(0);
    private moveYSignal = signal<number>(0);
    private maxScaleSignal = signal<number>(3);
    private minScaleSignal = signal<number>(1);

    // Public readonly signals
    readonly scale = this.scaleSignal.asReadonly();
    readonly moveX = this.moveXSignal.asReadonly();
    readonly moveY = this.moveYSignal.asReadonly();

    // Computed transform state
    readonly transformState = computed<TransformState>(() => ({
        scale: this.scaleSignal(),
        moveX: this.moveXSignal(),
        moveY: this.moveYSignal(),
    }));

    // Computed extended state with metadata
    readonly extendedState = computed<ExtendedTransformState>(() => ({
        scale: this.scaleSignal(),
        moveX: this.moveXSignal(),
        moveY: this.moveYSignal(),
        isZoomedIn: this.scaleSignal() > 1,
        atMaxScale: this.scaleSignal() >= this.maxScaleSignal(),
        atMinScale: this.scaleSignal() <= this.minScaleSignal(),
    }));

    readonly isZoomedIn = computed<boolean>(() => this.scaleSignal() > 1);
    readonly canZoomIn = computed<boolean>(() => this.scaleSignal() < this.maxScaleSignal());
    readonly canZoomOut = computed<boolean>(() => this.scaleSignal() > this.minScaleSignal());

    /**
     * Update the transform state
     */
    updateTransform(state: Partial<TransformState>): void {
        if (state.scale !== undefined) {
            this.scaleSignal.set(state.scale);
        }
        if (state.moveX !== undefined) {
            this.moveXSignal.set(state.moveX);
        }
        if (state.moveY !== undefined) {
            this.moveYSignal.set(state.moveY);
        }
    }

    /**
     * Update scale limits
     */
    updateLimits(min: number, max: number): void {
        this.minScaleSignal.set(min);
        this.maxScaleSignal.set(max);
    }

    /**
     * Reset to initial state
     */
    reset(): void {
        this.scaleSignal.set(1);
        this.moveXSignal.set(0);
        this.moveYSignal.set(0);
    }
}
