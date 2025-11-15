import { Injectable, signal, computed } from '@angular/core';
import { BrightnessConfig, BrightnessState } from '../models';

/**
 * Service for managing brightness state with Angular signals
 * Provides reactive brightness control with min/max bounds
 */
@Injectable()
export class BrightnessService {
    // Private signals for state management
    private brightnessSignal = signal<number>(1.0);
    private configSignal = signal<BrightnessConfig>({
        enabled: false,
        step: 0.1,
        min: 0.1,
        max: 2.0,
    });

    // Public readonly signals
    readonly brightness = this.brightnessSignal.asReadonly();
    readonly config = this.configSignal.asReadonly();

    // Computed state
    readonly state = computed<BrightnessState>(() => ({
        value: this.brightnessSignal(),
        atMin: this.brightnessSignal() <= this.configSignal().min,
        atMax: this.brightnessSignal() >= this.configSignal().max,
    }));

    readonly canIncrease = computed<boolean>(() => !this.state().atMax);
    readonly canDecrease = computed<boolean>(() => !this.state().atMin);

    /**
     * Update brightness configuration
     */
    updateConfig(config: Partial<BrightnessConfig>): void {
        this.configSignal.update((current) => ({ ...current, ...config }));
    }

    /**
     * Increase brightness by step amount
     * @returns new brightness value
     */
    increase(): number {
        const config = this.configSignal();
        const newValue = Math.min(this.brightnessSignal() + config.step, config.max);
        this.brightnessSignal.set(newValue);
        return newValue;
    }

    /**
     * Decrease brightness by step amount
     * @returns new brightness value
     */
    decrease(): number {
        const config = this.configSignal();
        const newValue = Math.max(this.brightnessSignal() - config.step, config.min);
        this.brightnessSignal.set(newValue);
        return newValue;
    }

    /**
     * Set brightness to specific value (clamped to min/max)
     */
    setValue(value: number): void {
        const config = this.configSignal();
        const clampedValue = Math.max(config.min, Math.min(config.max, value));
        this.brightnessSignal.set(clampedValue);
    }

    /**
     * Reset brightness to default (1.0)
     */
    reset(): void {
        this.brightnessSignal.set(1.0);
    }
}
