import {
    Component,
    ElementRef,
    HostBinding,
    OnInit,
    OnDestroy,
    computed,
    input,
    output,
    signal,
    effect,
    inject,
} from '@angular/core';

import { Properties } from './interfaces';
import { defaultProperties } from './properties';
import { IvyPinch } from './ivypinch';
import { CommonModule } from '@angular/common';

interface ComponentProperties extends Properties {
    disabled?: boolean;
    overflow?: 'hidden' | 'visible';
    disableZoomControl?: 'disable' | 'never' | 'auto';
    backgroundColor?: string;
}

export const _defaultComponentProperties: ComponentProperties = {
    overflow: 'hidden',
    disableZoomControl: 'auto',
    backgroundColor: 'rgba(0,0,0,0.85)',
};

@Component({
    selector: 'pinch-zoom, [pinch-zoom]',
    exportAs: 'pinchZoom',
    templateUrl: './pinch-zoom.component.html',
    styleUrls: ['./pinch-zoom.component.sass'],
    standalone: true,
    imports: [CommonModule],
})
export class PinchZoomComponent implements OnInit, OnDestroy {
    private readonly elementRef = inject(ElementRef<HTMLElement>);
    private pinchZoom!: IvyPinch;
    private readonly defaultComponentProperties: ComponentProperties;

    // Input signals - modern Angular v20 pattern
    properties = input<ComponentProperties>({});
    transitionDuration = input<number>(defaultProperties.transitionDuration!);
    doubleTap = input<boolean>(defaultProperties.doubleTap!);
    doubleTapScale = input<number>(defaultProperties.doubleTapScale!);
    autoZoomOut = input<boolean>(defaultProperties.autoZoomOut!);
    limitZoom = input<number | 'original image size'>('original image size');
    disabled = input<boolean>(false);
    disablePan = input<boolean>(false);
    overflow = input<'hidden' | 'visible'>('hidden');
    zoomControlScale = input<number>(defaultProperties.zoomControlScale!);
    disableZoomControl = input<'disable' | 'never' | 'auto'>('auto');
    backgroundColor = input<string>('rgba(0,0,0,0.85)');
    limitPan = input<boolean>(false);
    minPanScale = input<number>(defaultProperties.minPanScale!);
    minScale = input<number>(defaultProperties.minScale!);
    listeners = input<'auto' | 'mouse and touch'>(defaultProperties.listeners!);
    wheel = input<boolean>(defaultProperties.wheel!);
    autoHeight = input<boolean>(false);
    wheelZoomFactor = input<number>(defaultProperties.wheelZoomFactor!);
    draggableImage = input<boolean>(defaultProperties.draggableImage!);
    draggableOnPinch = input<boolean>(defaultProperties.draggableOnPinch!);

    // Brightness control inputs
    enableBrightnessControl = input<boolean>(false);
    brightnessStep = input<number>(0.1);
    minBrightness = input<number>(0.1);
    maxBrightness = input<number>(2.0);

    // Output signals
    zoomChanged = output<number>();
    brightnessChanged = output<number>();

    // Internal signals
    private currentScale = signal<number>(1);
    private currentBrightness = signal<number>(1.0);

    // Computed signals for reactive properties
    mergedProperties = computed<ComponentProperties>(() => {
        return {
            ...this.defaultComponentProperties,
            ...this.properties(),
            transitionDuration: this.transitionDuration(),
            doubleTap: this.doubleTap(),
            doubleTapScale: this.doubleTapScale(),
            autoZoomOut: this.autoZoomOut(),
            limitZoom: this.limitZoom(),
            disabled: this.disabled(),
            disablePan: this.disablePan(),
            overflow: this.overflow(),
            zoomControlScale: this.zoomControlScale(),
            disableZoomControl: this.disableZoomControl(),
            backgroundColor: this.backgroundColor(),
            limitPan: this.limitPan(),
            minPanScale: this.minPanScale(),
            minScale: this.minScale(),
            listeners: this.listeners(),
            wheel: this.wheel(),
            autoHeight: this.autoHeight(),
            wheelZoomFactor: this.wheelZoomFactor(),
            draggableImage: this.draggableImage(),
            draggableOnPinch: this.draggableOnPinch(),
        };
    });

    @HostBinding('style.overflow')
    get hostOverflow(): 'hidden' | 'visible' {
        return this.mergedProperties().overflow || 'hidden';
    }

    @HostBinding('style.background-color')
    get hostBackgroundColor(): string {
        return this.mergedProperties().backgroundColor || 'rgba(0,0,0,0.85)';
    }

    isTouchScreen = computed<boolean>(() => {
        const prefixes = ' -webkit- -moz- -o- -ms- '.split(' ');
        const mq = (query: string): boolean => {
            return window.matchMedia(query).matches;
        };

        if ('ontouchstart' in window) {
            return true;
        }

        const query = ['(', prefixes.join('touch-enabled),('), 'heartz', ')'].join('');
        return mq(query);
    });

    isDragging = computed<boolean>(() => {
        return this.pinchZoom?.isDragging() || false;
    });

    isDisabled = computed<boolean>(() => {
        return this.mergedProperties().disabled || false;
    });

    scale = computed<number>(() => {
        return this.currentScale();
    });

    isZoomedIn = computed<boolean>(() => {
        return this.scale() > 1;
    });

    scaleLevel = computed<number>(() => {
        return Math.round(this.scale() / this._zoomControlScale());
    });

    maxScale = computed<number>(() => {
        return this.pinchZoom?.maxScale || 3;
    });

    isZoomLimitReached = computed<boolean>(() => {
        return this.scale() >= this.maxScale();
    });

    _zoomControlScale = computed<number>(() => {
        return this.getPropertiesValue('zoomControlScale') || 1;
    });

    isControl = computed<boolean>(() => {
        if (this.isDisabled()) {
            return false;
        }

        const props = this.mergedProperties();
        if (props.disableZoomControl === 'disable') {
            return false;
        }

        if (this.isTouchScreen() && props.disableZoomControl === 'auto') {
            return false;
        }

        return true;
    });

    // Brightness computed signals
    brightness = computed<number>(() => {
        return this.currentBrightness();
    });

    isBrightnessControl = computed<boolean>(() => {
        if (this.isDisabled()) {
            return false;
        }
        return this.enableBrightnessControl();
    });

    isBrightnessAtMin = computed<boolean>(() => {
        return this.brightness() <= this.minBrightness();
    });

    isBrightnessAtMax = computed<boolean>(() => {
        return this.brightness() >= this.maxBrightness();
    });

    constructor() {
        this.defaultComponentProperties = this.getDefaultComponentProperties();

        // Effect to reinitialize when properties change
        effect(() => {
            const props = this.mergedProperties();
            if (this.pinchZoom && !props.disabled) {
                // Properties have changed, reinitialize if needed
                this.detectLimitZoom();
            }
        });

        // Effect to apply brightness filter
        effect(() => {
            const brightness = this.brightness();
            const element = this.elementRef.nativeElement.querySelector('.pinch-zoom-content') as HTMLElement;
            if (element) {
                element.style.filter = `brightness(${brightness})`;
            }
        });
    }

    ngOnInit(): void {
        this.initPinchZoom();
        this.detectLimitZoom();
    }

    ngOnDestroy(): void {
        this.destroy();
    }

    private initPinchZoom(): void {
        const props = this.mergedProperties();
        if (props.disabled) {
            return;
        }

        const element = this.elementRef.nativeElement.querySelector('.pinch-zoom-content') as HTMLElement;
        if (!element) {
            console.warn('PinchZoom: .pinch-zoom-content element not found');
            return;
        }

        const ivyPinchProps: Properties = {
            ...props,
            limitZoom: this.limitZoom(),
            element: element,
        };

        this.pinchZoom = new IvyPinch(ivyPinchProps, (scale: number) => {
            this.currentScale.set(scale);
            this.zoomChanged.emit(scale);
        });
    }

    toggleZoom(): void {
        this.pinchZoom?.toggleZoom();
    }

    zoomIn(value: number): number {
        return this.pinchZoom?.zoomIn(value) || this.scale();
    }

    zoomOut(value: number): number {
        return this.pinchZoom?.zoomOut(value) || this.scale();
    }

    brightnessIn(): number {
        const newBrightness = Math.min(
            this.brightness() + this.brightnessStep(),
            this.maxBrightness()
        );
        this.currentBrightness.set(newBrightness);
        this.brightnessChanged.emit(newBrightness);
        return newBrightness;
    }

    brightnessOut(): number {
        const newBrightness = Math.max(
            this.brightness() - this.brightnessStep(),
            this.minBrightness()
        );
        this.currentBrightness.set(newBrightness);
        this.brightnessChanged.emit(newBrightness);
        return newBrightness;
    }

    resetBrightness(): void {
        this.currentBrightness.set(1.0);
        this.brightnessChanged.emit(1.0);
    }

    detectLimitZoom(): void {
        this.pinchZoom?.detectLimitZoom();
    }

    destroy(): void {
        this.pinchZoom?.destroy();
    }

    private getPropertiesValue<K extends keyof ComponentProperties>(propertyName: K): ComponentProperties[K] {
        const props = this.mergedProperties();
        if (props && props[propertyName] !== undefined) {
            return props[propertyName];
        } else {
            return this.defaultComponentProperties[propertyName];
        }
    }

    private getDefaultComponentProperties(): ComponentProperties {
        return { ...defaultProperties, ..._defaultComponentProperties };
    }
}
