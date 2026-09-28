# Evidencia operativa

Registro de ejecuciones reales de los runbooks (pruebas de restauración,
incidentes, go-lives). Un archivo por evento:

- `restauracion-AAAA-MM-DD.md`
- `incidente-AAAA-MM-DD.md`
- `golive-AAAA-MM-DD.md`

Cada archivo incluye: fecha, quién ejecutó, qué se hizo, resultado y tiempo.
**La primera restauración de prueba es bloqueante de go-live** (ver
`../backup-restore.md`).
