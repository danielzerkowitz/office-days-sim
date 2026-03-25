#!/usr/bin/env swift
import Foundation
import CoreGraphics

signal(SIGINT) { _ in print("\nStopped."); exit(0) }

let fmt = DateFormatter(); fmt.timeStyle = .medium; fmt.dateStyle = .none
let src = CGEventSource(stateID: .hidSystemState)

print("Jiggler running – pressing Cmd every 1–45s. Ctrl+C to stop.\n")

while true {
    let interval = Int.random(in: 1...45)
    for remaining in stride(from: interval, through: 1, by: -1) {
        print("  Next press in \(remaining)s…   ", terminator: "\r")
        fflush(stdout)
        Thread.sleep(forTimeInterval: 1.0)
    }
    CGEvent(keyboardEventSource: src, virtualKey: 55, keyDown: true )?.post(tap: .cghidEventTap)
    CGEvent(keyboardEventSource: src, virtualKey: 55, keyDown: false)?.post(tap: .cghidEventTap)
    print("  [\(fmt.string(from: Date()))] Cmd pressed          ")
}
