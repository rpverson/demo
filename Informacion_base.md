Actualmente se tienen tres elementos base:

1. Formatos de formularios: son plantillas que se usan para recopilar datos de forma manual, se considera la forma basica para documentar
2. Actividades: Son los recorridos que se realizan para documentar un area o region geografica.
3. Tarea de impacto: Son un conjunto de tareas reconocidas por expertos para atender o solucionar situaciones conocidas de problamas ecologicos y medioambientales.

Nota: Los elementos bases se deben ir actualizando a medida que el sistema escale.

Caso de uso 1:
Paso 1: Se identifica una convocatoria emitida por una entidad privada o gubernamental para apoyo o solucion de problema medioambienta. La convocatiria se obtiene mediante alguna de estas fuentes: url, pdf, docx.
Paso 2: El sistema entra en la FASE_1 de Analisis, donde de obtienen los requerimientos, estructura de la convocatoria y necesidades. Se identifica si en la base de datos hay registros de actividades relacionadas con ese problema que pide la convocatoria. Si no hay datos, se genera la lista minima necesaria de actividades que se deben tener como base y se pide que se documente con todos los formatos correspondiente. Cuando se tenga la cantidad de informacion base entonces se pasa a las FASE_2
Paso 3: El sistema entra en la FASE_2 donde se elabora la propuesta de anteproyecto con la informacion y se envia a la FASE_3. En la propuesta se incluyen las tareas de impacto que se pueden realizar para atender al problema que pide la convocatoria.
Paso 3: El sistema muestra una UI tipo canvas con opciones de edicion para que el usuario pueda editar el anteproyecto antes de exportar la version definitiva.
Paso 4: Se genera el boton de guardar como pdf para descargar el documento del anteproyecto que se envia a la convocatoria

En todo momento el usuario tendra una burbuja con una IA que maneja todo el contexto del flujo, pudiendo intevenir para aclarar dudas, revisar la informacion de la base de conocimiento, asistir en la edicion del anteproyecto en el canvas.