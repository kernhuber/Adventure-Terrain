import React from 'react'
import { isKnownCallback } from '../lib/callbacks'

/**
 * Shows a callback "module.function" reference plus whether a matching function
 * already exists in the game (callbackRegistry). Green ✓ = it will fire at runtime;
 * amber ⚠ = no such function yet (resolves to None) — scaffold one via "Export Runtime".
 */
export default function CallbackStatus({ refName }: { refName: string }) {
  const known = isKnownCallback(refName)
  const moduleFile = refName.split('.')[0] + '.py'
  return (
    <span style={{ marginLeft: 8, display: 'inline-flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      <code>{refName}</code>
      {known
        ? <span style={{ color: '#34d399' }} title={`Funktion existiert in ${moduleFile}`}>✓ existiert im Spiel</span>
        : <span style={{ color: '#f59e0b' }} title={`Keine passende Funktion in ${moduleFile} — sie liefert zur Laufzeit None. Mit 'Export Runtime' einen Stub erzeugen.`}>⚠ noch nicht implementiert</span>}
    </span>
  )
}
