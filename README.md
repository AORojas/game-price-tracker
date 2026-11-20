# React + TypeScript + Vite

## Historial de precios

La ficha registra el precio más bajo observado en CheapShark, como máximo una vez por
juego y día. Los datos se empiezan a recopilar después de aplicar las migraciones; no
hay historial anterior disponible. Para crear la tabla nueva, ejecutá
`npm --prefix backend run db:migrate` con la configuración de PostgreSQL del backend.

## Inicio de sesión con Google

1. En Google Cloud Console, crea un cliente OAuth de tipo **Aplicación web**. Agrega
   `http://localhost:5173` como origen autorizado y copia el ID de cliente a
   `GOOGLE_CLIENT_ID` en `backend/.env` y `VITE_GOOGLE_CLIENT_ID` en `frontend/.env`.
   Este flujo verifica un ID token, por lo que no necesita el secreto del cliente.
2. Aplica las migraciones de identidades externas con
   `npm --prefix backend run db:migrate`.

Usa `backend/.env.example` y `frontend/.env.example` como referencia. Las claves
reales deben permanecer en los archivos `.env` locales, que no se versionan.

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.
