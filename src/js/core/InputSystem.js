export class InputSystem {
    constructor(state) {
        window.addEventListener('mousemove', (e) => {
            state.mouse.x = (e.clientX / window.innerWidth) - 0.5;
            state.mouse.y = (e.clientY / window.innerHeight) - 0.5;
        });

        window.addEventListener('mousedown', () => {
            state.targetSpeed = 25;
            state.isMouseDown = true;
        });

        window.addEventListener('mouseup', () => {
            state.targetSpeed = 5;
            state.isMouseDown = false;
        });
    }
}