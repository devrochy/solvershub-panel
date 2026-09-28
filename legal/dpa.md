# Acuerdo de Tratamiento de Datos (DPA)

> **Borrador para revisión de abogado.** Anexo del Contrato de Servicio. Aplica
> cuando el Cliente trata datos personales de terceros (sus clientes) usando
> SolversHub.

**Entre:** ⟨PENDIENTE: razón social de Roshi⟩ ("Encargado") y
⟨PENDIENTE: razón social del Cliente⟩ ("Responsable").
**Vigente desde:** ⟨PENDIENTE⟩

## 1. Roles

El **Responsable** determina los fines y medios del tratamiento de los datos de
sus clientes finales. El **Encargado** (SolversHub) los trata **únicamente** por
cuenta del Responsable y siguiendo sus instrucciones documentadas (la
configuración del servicio).

## 2. Objeto y duración

El tratamiento tiene por objeto prestar el servicio de agentes de IA (atención,
ventas, cobros, agendamiento y seguimiento). Dura lo que dure el Contrato de
Servicio y el periodo de retención acordado.

## 3. Categorías de datos y titulares

- Titulares: clientes finales y personal del Responsable.
- Datos: identificadores de canal, contenido de mensajes, datos de contacto y de
  pedido, y datos de pago (sin datos de tarjeta).

## 4. Instrucciones y límites

El Encargado:

- Trata los datos solo para prestar el servicio.
- **No** los usa para fines propios ni para entrenar modelos.
- **No** los vende ni los cede, salvo a los subprocesadores listados.
- Aplica medidas de seguridad del §6.

## 5. Subprocesadores

| Función | Proveedor |
|---|---|
| Modelo de IA (cerebro) | el elegido por el Responsable (BYOK) |
| Canal de mensajería | Meta / WhatsApp |
| Pagos | Wompi |
| Hosting | infraestructura del despliegue |
| Observabilidad | OpenTelemetry |

El Encargado informará cambios con antelación y el Responsable podrá oponerse.

## 6. Medidas de seguridad

Aislamiento multi-tenant con **Row Level Security forzado**, cifrado en tránsito
(TLS) y en reposo (AES-GCM), control de acceso por roles, registro de auditoría,
y **auto-disable por tenant** ante fallas. Detalle en `../security.md`.

## 7. Transferencias internacionales

Algunos subprocesadores pueden estar fuera de Colombia. El Responsable autoriza
esas transferencias para la prestación del servicio.

## 8. Derechos de los titulares

El Encargado asiste al Responsable para atender solicitudes de acceso,
actualización, rectificación y supresión, y para el borrado del tenant
(supresión a solicitud).

## 9. Brechas de seguridad

El Encargado notificará al Responsable **sin dilación indebida** tras conocer una
brecha que afecte datos personales, con la información disponible para evaluar el
deber de notificación (Ley 1581).

## 10. Devolución o supresión

Al terminar el Contrato, el Encargado devuelve o suprime los datos a elección del
Responsable, salvo obligación legal de conservarlos.

## 11. Auditoría

El Encargado pone a disposición la documentación de seguridad (`../security.md`)
y atiende solicitudes razonables de verificación.

## 12. Responsabilidad

Cada parte responde según el Contrato de Servicio y la ley aplicable.
