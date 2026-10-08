# Manual técnico: Costeo por áreas

## Esquema y migraciones

Al arrancar el backend, `ensureSedeAreas` añade idempotentemente `sedes.capacidad_sala_minutos`, `sede_areas.capacidad_minutos` y crea `area_examen(area_id, examen_id, minutos)`. La relación es muchos a muchos, con borrado en cascada por área o examen. `area_examen` inicia vacía: los registros antiguos no se reasignan automáticamente. El guardado de áreas conserva sus IDs, actualiza los existentes y reemplaza sus vínculos en una transacción.

## Fórmula

`practical_capacity` continúa siendo el default. Solo una versión activa con `fixedCost.allocationMethod = area_based` selecciona el método nuevo.

Sea `B` la bolsa fija configurada y `D` la suma de asignaciones directas. Si `R = B - D`, cada área por m² recibe `R × m²_area / suma_m²_áreas_por_m²`. Las áreas directas reciben el valor digitado. Un área es productiva si tiene vínculos en `area_examen`; de lo contrario es común.

`bolsa_general = suma(sub_bolsa de áreas comunes)`

`bolsa_productiva = suma(sub_bolsa de áreas productivas)`

La distribución debe cumplir `B = bolsa_general + bolsa_productiva`. Para cada área productiva, `tasa_area = sub_bolsa / capacidad_minutos`. La sede aporta una capacidad global explícita, no derivada de áreas: `tasa_general = bolsa_general / sedes.capacidad_sala_minutos`.

`costo_fijo_examen = suma(minutos_area × tasa_area) + duración_examen × tasa_general`

Un examen sin asignación de área paga solo la tasa general. El tiempo no utilizado queda sin absorber. Los minutos de asignación superiores a la duración generan aviso; no modifican la duración ni bloquean el guardado.

## Validación y contratos API

- `GET /sedes/:id/areas` devuelve `{ areas, fixedCost, examenes }`; cada área incluye capacidad y `asignaciones: [{ examen_id, minutos, duracion_examen_minutos, ... }]`.
- `POST /sedes/:id/areas` actualiza por ID, crea áreas nuevas, reemplaza asignaciones transaccionalmente y elimina únicamente las áreas omitidas.
- `PUT /sedes/:id` acepta `capacidad_sala_minutos`; omitirlo preserva el valor existente para clientes antiguos.
- Crear o reactivar una fórmula `area_based` valida todas las sedes. Rechaza capacidades de sede/productivas faltantes o una distribución sin remanente asignable. La capacidad no requerida para áreas comunes no bloquea.
- Evaluador y simulación responden HTTP 409 cuando faltan datos de cálculo; `faltantes` identifica examen y campos. El motor expone campos en `datosFaltantes`.
- La vista previa devuelve desglose de sub-bolsas, tasas, diferencia y advertencias de minutos excedidos.

## Tarifas y equipos

En Convenios, campo vacío elimina la fila en `tarifas_convenios`; cero explícito se conserva. Los lectores devuelven `NULL` cuando no existe fila. El motor aplica SOAT solo si `useSoatWhenContractMissing` está activo y conserva cero si `honorZeroContracted` está activo.

El costo de equipos registrados se deriva de `equipos` y `servicio_equipo`, agrupado por sede y examen: depreciación mensual y mantenimiento mensual se prorratean por minutos disponibles y minutos de uso. Si no existe equipo registrado, se mantienen las fuentes heredadas `equipos_costo_referencia` y `examenes.costo_depreciacion_equipos` como fallback.

## Pruebas

Desde `backend`, ejecutar:

```powershell
node --test tests/costEngine.test.js tests/formulaConfig.test.js
```

Desde `frontend`, ejecutar `npm run lint` y `npm run build`. La verificación de migración debe realizarse en una base de prueba con el esquema previo, comprobando que el arranque puede repetirse y que conserva áreas, fórmulas y tarifas.
