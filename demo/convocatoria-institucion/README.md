# Demo URL Convocatoria (estatico)

Esta carpeta contiene una mini web estatica para simular una institucion publicando convocatorias.

## Archivos

- `index.html`: pagina principal institucional.
- `convocatoria-rio-nilo.html`: convocatoria completa para pruebas.
- `styles.css`: estilos base.

## Levantar en local

Desde la raiz del repo:

```bash
cd /Users/admon/Desktop/vibe/demo/convocatoria-institucion
python3 -m http.server 8088
```

## URL para usar en tu sistema

- Landing: `http://localhost:8088/`
- Convocatoria directa: `http://localhost:8088/convocatoria-rio-nilo.html`

Usa la URL directa de convocatoria en la opcion **Fuente = URL** dentro de la app.
