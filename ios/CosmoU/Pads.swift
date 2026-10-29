// Game controllers (Xbox, PlayStation, Switch Pro, MFi …): the app reads them with Apple's GameController framework
// and hands the buttons to the page as one "gamepad" with the standard button order (js/mobile-api.js, __cosmoPad).
import GameController

final class Pads {
    static let shared = Pads()
    private var send: ((String) -> Void)?
    private var stick: (Float, Float) = (0, 0)

    func start(_ send: @escaping (String) -> Void) {
        self.send = send
        NotificationCenter.default.addObserver(forName: .GCControllerDidConnect, object: nil, queue: .main) { [weak self] n in
            if let c = n.object as? GCController { self?.attach(c) }
        }
        GCController.controllers().forEach(attach)
    }

    private func attach(_ c: GCController) {
        guard let g = c.extendedGamepad else { return }
        // standard order: A B X Y, LB RB LT RT, Select Start, L3 R3, D-pad up down left right, Home
        var list: [(GCControllerButtonInput?, Int)] = [
            (g.buttonA, 0), (g.buttonB, 1), (g.buttonX, 2), (g.buttonY, 3),
            (g.leftShoulder, 4), (g.rightShoulder, 5), (g.leftTrigger, 6), (g.rightTrigger, 7),
            (g.buttonOptions, 8), (g.buttonMenu, 9), (g.leftThumbstickButton, 10), (g.rightThumbstickButton, 11),
            (g.dpad.up, 12), (g.dpad.down, 13), (g.dpad.left, 14), (g.dpad.right, 15),
        ]
        if #available(iOS 14.0, *) { list.append((g.buttonHome, 16)) }
        for (b, i) in list {
            b?.pressedChangedHandler = { [weak self] _, _, pressed in self?.press(i, pressed) }
        }
        g.leftThumbstick.valueChangedHandler = { [weak self] _, x, y in self?.move(x, y) }
        // from now on the page only listens to the app (no double presses)
        send?("window.__cosmoPad && __cosmoPad(-1, false)")
    }

    func press(_ button: Int, _ down: Bool) {
        send?("window.__cosmoPad && __cosmoPad(\(button), \(down))")
    }

    private func move(_ x: Float, _ y: Float) {
        let r = (round(x * 20) / 20, round(-y * 20) / 20)
        if r == stick { return }
        stick = r
        send?("window.__cosmoPad && __cosmoPad(-1, false, \(r.0), \(r.1))")
    }
}
