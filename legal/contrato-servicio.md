# Contrato de Servicio (marco + orden de servicio)

> **Borrador para revisión de abogado.** Este documento combina un contrato marco
> (MSA) con una orden de servicio (Anexo A). Para clientes pequeños puede usarse
> la orden de servicio sola, aceptada electrónicamente.

**Entre:** ⟨PENDIENTE: razón social de Roshi⟩, NIT ⟨PENDIENTE⟩ ("Proveedor") y
⟨PENDIENTE: razón social del Cliente⟩, NIT ⟨PENDIENTE⟩ ("Cliente").

## 1. Objeto

El Proveedor presta el servicio **SolversHub**: agentes de IA que atienden,
venden, cobran, agendan y dan seguimiento por canales de mensajería, con panel de
control, métricas y escalamiento a humano.

## 2. Plan, precio y facturación

- Plan contratado: **⟨free / basic / premium / empresarial⟩** (`../../agent-core/docs/BILLING.md`).
- Precio: **⟨monto⟩ COP/mes** + fee de implementación **⟨monto⟩** (si aplica).
- Trial: 30 días desde el alta.
- Cobro por **Wompi** (link de pago). Sin permanencia.
- Los excedentes de cuota, si se acuerdan, se facturan al cierre del período.

## 3. Nivel de servicio (SLA)

| Métrica | Compromiso |
|---|---|
| Disponibilidad | 99,5 % mensual |
| p95 primera respuesta | < 6 s |
| RPO | ⟨ver nota: 24 h con el runbook actual; 15 min con PITR⟩ |
| RTO | < 4 h |

Si no se cumple la disponibilidad mensual, el Cliente recibe crédito proporcional
(⟨definir: p. ej. hasta 1 mes⟩), previa solicitud.

## 4. Obligaciones del Proveedor

- Prestar el servicio con la diligencia y seguridad de `../security.md`.
- Mantener respaldos y un plan de continuidad (`../runbooks/backup-restore.md`).
- Notificar incidentes relevantes y brechas de seguridad.
- Tratar los datos según el **DPA** (Anexo B).

## 5. Obligaciones del Cliente

- Entregar la información del negocio, catálogo y credenciales de sus canales (BYOK).
- Contar con autorización de sus clientes finales para el tratamiento de sus datos.
- Usar el servicio conforme a las políticas de Meta/WhatsApp y a la ley.
- No usar el servicio para contenido ilícito o engañoso.

## 6. Propiedad intelectual

- El software, la marca SolversHub y el know-how son del Proveedor.
- El catálogo, los datos y la marca del Cliente son del Cliente.
- Se otorga al Cliente una licencia de uso no exclusiva, no transferible, durante la vigencia.

## 7. Confidencialidad

Ambas partes protegen la información confidencial de la otra y no la divulgan sin
autorización, salvo obligación legal.

## 8. Datos personales

Se rigen por el **DPA** (Anexo B), que forma parte integral de este Contrato.

## 9. Terminación

- Cualquiera puede terminar con **30 días** de aviso.
- Por incumplimiento grave, de inmediato y con aviso.
- Al terminar: se devuelven o suprimen los datos (a elección del Cliente) y se
  entrega un export de su información.

## 10. Garantías y responsabilidad

- El servicio se presta "como está", con las garantías de diligencia de la ley.
- La responsabilidad del Proveedor se limita a **⟨definir: p. ej. los montos pagados en los últimos 3 meses⟩**.
- Ninguna parte responde por lucro cesante, salvo dolo o culpa grave.

## 11. Ley aplicable y solución de controversias

Ley de **⟨Colombia⟩**. Las partes intentan arreglo directo; de no lograrse, acuden
a ⟨definir: jurisdicción o arbitraje⟩.

---

## Anexo A — Orden de servicio

| Campo | Valor |
|---|---|
| Plan | ⟨…⟩ |
| Precio mensual | ⟨…⟩ COP |
| Fee de implementación | ⟨…⟩ COP |
| Verticales / habilidades | ⟨ventas · cobranza · agendamiento · marketing⟩ |
| Número de WhatsApp | ⟨BYOK del Cliente⟩ |
| Fecha de inicio | ⟨…⟩ |

## Anexo B — DPA

Ver `dpa.md`.

## Anexo C — Subprocesadores

Ver `dpa.md` §5.
