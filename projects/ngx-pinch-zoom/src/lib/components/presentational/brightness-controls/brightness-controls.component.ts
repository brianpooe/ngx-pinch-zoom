import { Component, input, output } from '@angular/core';

/**
 * Presentational component for brightness controls
 * Pure component with no internal state or business logic
 */
@Component({
    selector: 'pz-brightness-controls',
    standalone: true,
    template: `
        <div
            class="pz-brightness-button"
            [class.pz-brightness-button-active]="isBrightened()"
            (click)="toggle.emit()"
            (keydown.enter)="toggle.emit()"
            (keydown.space)="toggle.emit(); $event.preventDefault()"
            role="button"
            [attr.aria-label]="isBrightened() ? 'Reset brightness' : 'Increase brightness'"
            tabindex="0"
        ></div>
    `,
    styles: [`
        .pz-brightness-button {
            position: relative;
            width: 56px;
            height: 56px;
            background-color: rgba(0, 0, 0, .8);
            background-position: center, -1000px;
            background-repeat: no-repeat, no-repeat;
            background-size: 40px;
            border-radius: 4px;
            opacity: 0.5;
            cursor: pointer;
            transition: opacity .1s;
            user-select: none;

            /* Normal state - sun icon (increase brightness) */
            background-image: url(data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCI+PHBhdGggZD0iTTAgMGgyNHYyNEgweiIgZmlsbD0ibm9uZSIvPjxwYXRoIGQ9Ik0yMCA4LjY5VjRoLTQuNjlMMTIgLjY5IDguNjkgNEg0djQuNjlMLjY5IDEyIDQgMTUuMzFWMjBoNC42OUwxMiAyMy4zMSAxNS4zMSAyMEgyMHYtNC42OUwyMy4zMSAxMiAyMCA4LjY5ek0xMiAxOGMtMy4zMSAwLTYtMi42OS02LTZzMi42OS02IDYtNiA2IDIuNjkgNiA2LTIuNjkgNi02IDZ6bTAtMTBjLTIuMjEgMC00IDEuNzktNCA0czEuNzkgNCA0IDQgNC0xLjc5IDQtNC0xLjc5LTQtNC00eiIgZmlsbD0iI2ZmZiIvPjwvc3ZnPg==),
                url(data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCI+PHBhdGggZD0iTTAgMGgyNHYyNEgweiIgZmlsbD0ibm9uZSIvPjxwYXRoIGQ9Ik0yMCA4LjY5VjRoLTQuNjlMMTIgLjY5IDguNjkgNEg0djQuNjlMLjY5IDEyIDQgMTUuMzFWMjBoNC42OUwxMiAyMy4zMSAxNS4zMSAyMEgyMHYtNC42OUwyMy4zMSAxMiAyMCA4LjY5ek0xMiAxOGMtMy4zMSAwLTYtMi42OS02LTZzMi42OS02IDYtNiA2IDIuNjkgNiA2LTIuNjkgNi02IDZ6IiBmaWxsPSIjZmZmIi8+PC9zdmc+);
        }

        /* Active state - filled sun icon (brightness is increased) */
        .pz-brightness-button-active {
            background-position: -1000px, center;
        }

        .pz-brightness-button:hover {
            opacity: 0.7;
        }
    `],
})
export class BrightnessControlsComponent {
    // Inputs
    isBrightened = input<boolean>(false);

    // Outputs
    toggle = output<void>();
}
