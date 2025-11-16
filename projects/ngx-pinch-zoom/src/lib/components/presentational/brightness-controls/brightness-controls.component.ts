import { Component, input, output } from '@angular/core';

/**
 * Presentational component for brightness controls
 * Pure component with no internal state or business logic
 */
@Component({
    selector: 'pz-brightness-controls',
    standalone: true,
    template: `
        <div class="pz-brightness-controls">
            <div
                class="pz-brightness-button pz-brightness-decrease"
                [class.pz-brightness-button-disabled]="atMin()"
                (click)="decrease.emit()"
                (keydown.enter)="decrease.emit()"
                (keydown.space)="decrease.emit(); $event.preventDefault()"
                role="button"
                aria-label="Decrease brightness"
                tabindex="0"
            ></div>
            <div
                class="pz-brightness-button pz-brightness-increase"
                [class.pz-brightness-button-disabled]="atMax()"
                (click)="increase.emit()"
                (keydown.enter)="increase.emit()"
                (keydown.space)="increase.emit(); $event.preventDefault()"
                role="button"
                aria-label="Increase brightness"
                tabindex="0"
            ></div>
        </div>
    `,
    styles: [`
        .pz-brightness-controls {
            display: flex;
            gap: 8px;
            align-items: center;
        }

        .pz-brightness-button {
            position: relative;
            width: 48px;
            height: 48px;
            background-color: rgba(0, 0, 0, .8);
            background-position: center;
            background-repeat: no-repeat;
            background-size: 24px;
            border-radius: 4px;
            opacity: 0.5;
            cursor: pointer;
            transition: opacity .1s;
            user-select: none;
        }

        .pz-brightness-button:hover {
            opacity: 0.7;
        }

        .pz-brightness-button-disabled {
            opacity: 0.3;
            cursor: not-allowed;
        }

        .pz-brightness-button-disabled:hover {
            opacity: 0.3;
        }

        .pz-brightness-increase {
            background-image: url(data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCI+PHBhdGggZD0iTTAgMGgyNHYyNEgweiIgZmlsbD0ibm9uZSIvPjxwYXRoIGQ9Ik0yMCA4LjY5VjRoLTQuNjlMMTIgLjY5IDguNjkgNEg0djQuNjlMLjY5IDEyIDQgMTUuMzFWMjBoNC42OUwxMiAyMy4zMSAxNS4zMSAyMEgyMHYtNC42OUwyMy4zMSAxMiAyMCA4LjY5ek0xMiAxOGMtMy4zMSAwLTYtMi42OS02LTZzMi42OS02IDYtNiA2IDIuNjkgNiA2LTIuNjkgNi02IDZ6bTAtMTBjLTIuMjEgMC00IDEuNzktNCA0czEuNzkgNCA0IDQgNC0xLjc5IDQtNC0xLjc5LTQtNC00eiIgZmlsbD0iI2ZmZiIvPjwvc3ZnPg==);
        }

        .pz-brightness-decrease {
            background-image: url(data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCI+PHBhdGggZD0iTTAgMGgyNHYyNEgweiIgZmlsbD0ibm9uZSIvPjxwYXRoIGQ9Ik0yMCA4LjY5VjRoLTQuNjlMMTIgLjY5IDguNjkgNEg0djQuNjlMLjY5IDEyIDQgMTUuMzFWMjBoNC42OUwxMiAyMy4zMSAxNS4zMSAyMEgyMHYtNC42OUwyMy4zMSAxMiAyMCA4LjY5ek0xMiAxOGMtMy4zMSAwLTYtMi42OS02LTZzMi42OS02IDYtNiA2IDIuNjkgNiA2LTIuNjkgNi02IDZ6IiBmaWxsPSIjZmZmIi8+PC9zdmc+);
        }
    `],
})
export class BrightnessControlsComponent {
    // Inputs
    atMin = input<boolean>(false);
    atMax = input<boolean>(false);

    // Outputs
    increase = output<void>();
    decrease = output<void>();
}
