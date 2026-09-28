// Shared mutable joystick state written by MobileControls (touch UI) and
// read every frame by Astronaut's useFrame. A plain object (not Zustand)
// on purpose: analog input changes ~60x/sec and must not trigger re-renders.
export const joystickInput = { x: 0, y: 0 };

export function resetJoystick() {
  joystickInput.x = 0;
  joystickInput.y = 0;
}