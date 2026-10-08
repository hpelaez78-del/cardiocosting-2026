# Manual de usuario: Costeo por áreas

## Activar el método

El método nuevo es optativo. Un Administrador lo activa desde **Configuración de Costeo**, creando una versión con **Por áreas y bolsa general**. La activación se bloquea mientras alguna sede no tenga capacidad explícita, un área productiva carezca de capacidad o la distribución de sub-bolsas no pueda conciliarse. El método predeterminado sigue siendo TDABC por capacidad práctica.

## Configurar una sede

1. En **Sedes**, capture la capacidad mensual explícita de la sede en minutos. No se calcula a partir de las áreas.
2. Registre todas las áreas. Para cada una, ingrese nombre, superficie y criterio de sub-bolsa.
3. Una sub-bolsa directa usa el monto digitado. Las demás áreas reciben el remanente de la bolsa fija en proporción a sus m²; las áreas comunes también participan.
4. Asigne a cada área productiva sus exámenes y los minutos que cada examen utiliza allí. Las áreas sin exámenes son comunes, por ejemplo pasillos, sala de espera o administración.
5. Capture la capacidad mensual de cada área productiva. Las áreas comunes no requieren capacidad productiva.
6. Revise la conciliación: bolsa fija = sub-bolsas productivas + bolsa general. Si las asignaciones directas superan la bolsa fija, no se podrá guardar.

La bolsa general es la suma de las sub-bolsas de las áreas comunes. Los exámenes sin área asignada absorben únicamente el componente general. Un examen asignado a varias áreas suma el costo de sus minutos en cada tasa de área y agrega la tasa general por toda su duración.

La capacidad que no se utiliza queda sin absorber. Se mostrará un aviso si los minutos asignados por área superan la duración del examen. Una bolsa general en cero se advierte porque deja la infraestructura común sin costo asignado.

## Tarifas de convenio

Una tarifa vacía significa que no hay tarifa contractual guardada; al guardar vacío se elimina el registro y se usa el SOAT según la configuración activa. Ingresar `0` guarda una tarifa contractual explícita de cero. La opción **Respetar tarifa convenio en cero** determina si ese cero se mantiene o si se permite el fallback SOAT.

## Equipos e insumos

Los equipos registrados y vinculados a exámenes alimentan el cálculo de depreciación y mantenimiento. Si hay varios equipos para el mismo examen en una sede, sus costos se suman. Las referencias heredadas se usan solo cuando no hay equipos registrados para ese examen y sede.

Al eliminar un insumo se solicita confirmación; cancelar conserva el registro.

## Datos incompletos

La evaluación y simulación devuelven un error 409 con los exámenes y campos pendientes cuando faltan capacidades u otros datos necesarios. Complete los datos y vuelva a calcular. La vista previa de fórmulas muestra la conciliación, alertas y campos faltantes antes de activar una versión.
