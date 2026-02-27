# Arquitectura de contextos `uxmaltech`

Documento técnico para describir apps/contextos de organización `uxmaltech` en este alcance.

Repositorio cubierto:

- `uxmaltech/uxmal-site`

Fecha de corte: **2026-02-19**.

---

## 1) Resumen ejecutivo

`uxmal-site` es una aplicación Laravel que funciona como:

1. **sitio de documentación oficial** del framework UXMAL,
2. **showcase interactivo** de `backoffice-ui` y `backend-cbq`,
3. **ambiente de referencia** para patrones de implementación (BOUI actions/events, comandos/queries demo, páginas de componentes).

A diferencia de una app de negocio transaccional, aquí el “dominio” principal es documental + demostrativo, con endpoints CBQ de ejemplo.

---

## 2) Dependencias y papel en el ecosistema

`uxmal-site` consume directamente los paquetes base del stack:

- `uxmaltech/auth`
- `uxmaltech/backoffice-ui`
- `uxmaltech/backend-cbq`
- `uxmaltech/core`

Esto lo convierte en una app “integration-first” para:

- validar compatibilidad entre paquetes,
- documentar capacidades,
- mostrar patrones end-to-end (UI -> CBQ -> Query/Command).

---

## 3) Tecnología

- PHP 8.2+
- Laravel 12
- Sanctum (vía dependencias del stack)
- Frontend:
  - Vite
  - Tailwind 4
  - Axios
  - Ably (dependencia)
- Tooling de desarrollo:
  - `concurrently`, `pint`, `pest`

---

## 4) Arquitectura de arranque y registro

## 4.1 `bootstrap/app.php`

- Define rutas `web`, `api`, `console`.
- Declara middleware group `uxmal` con:
  - `Authenticate`
  - `Uxmal\Backoffice\Middleware\MasterLayoutMiddleware`
  - `Uxmal\Backoffice\Middleware\CheckEnabledServicesMiddleware`
- Registra comando de consola `MenuAuditCommand`.

## 4.2 `AppServiceProvider`

Durante `boot`:

1. Registra rutas propias con `RegisterSelfRoutes::Make(base_path('app'), 'App\\')->register()`.
2. Registra Command/Query CBQ en `app/Http` vía `RegisterCmdQry`:
   - `prefix: 'api/'`
   - middleware en local: `[]`
   - middleware fuera de local: `['auth:sanctum']`
3. Carga endpoints demo (`app/Http/DemoApi/demo-products.php`).

Conclusión: arquitectura mixta entre rutas web explícitas y registro declarativo de comandos/queries en carpetas de código.

---

## 5) Organización funcional (dominios del sitio)

## 5.1 Dominio “Documentación por área” (Controllers)

Controladores agrupados por categorías funcionales del catálogo:

- `BasicUI` (20)
- `Forms` (12)
- `Boui` (8)
- `BackendCbq` (7)
- `AdvancedUI` (5)
- `Tables` (4)
- `Layouts` (4)
- `GettingStarted` (4)
- `Charts` (2)
- `API` (2)

Total controladores: **61**.

## 5.2 Dominio “CBQ demo” (Commands/Queries)

### Commands (4)

- `app/Http/CbqDemo/Command/CreateDemoProductCommand.php`
- `app/Http/Commands/BouiActionsSubmitFormCommand.php`
- `app/Http/Commands/ChatDemoCommand.php`
- `app/Http/Commands/ChatStreamDemoCommand.php`

### Queries (9)

- `app/Http/CbqDemo/Queries/ListDemoProductsQuery.php`
- `app/Http/Queries/AddressCitiesQuery.php`
- `app/Http/Queries/AddressStatesQuery.php`
- `app/Http/Queries/BouiActionsMockDataQuery.php`
- `app/Http/Queries/GetEmployees.php`
- `app/Http/Queries/GridJSFiltersCheckbox.php`
- `app/Http/Queries/GridJSFiltersDate.php`
- `app/Http/Queries/GridJSFiltersRadio.php`
- `app/Http/Queries/GridJSFiltersSwitch.php`

Métrica: **4 commands + 9 queries**.

## 5.3 Dominio “UI interactiva” (assets)

- JS bajo `resources/js`:
  - base de app (`app.js`, `bootstrap.js`)
  - demos de BOUI (`resources/js/boui/*`)
  - demos CBQ (`resources/js/backend-cbq/showcase.js`)
- Métrica JS: **9 archivos**
- CSS/SCSS: **3 archivos**

## 5.4 Dominio documental (`docs/*.md`)

Archivos detectados:

- `docs/ARCHITECTURE.md`
- `docs/ActionsAndEventsImplementation.md`
- `docs/ComponentDocumentation.md`
- `docs/InteractiveBouiPages.md`
- `docs/MenuAudit.md`

Métrica: **5 documentos**.

---

## 6) Rutas web por dominios de documentación

`routes/web.php` organiza navegación por áreas:

- Getting Started
- BOUI (framework, events, actions, html-properties, alert, toast, js events)
- Backend CBQ (overview, showcase, commands, queries, built-in-endpoints, configuration)
- Layouts
- Basic UI
- Advanced UI
- Forms
- Tables
- Charts

Esto refleja que el “modelo de dominio” de esta app es una taxonomía de componentes/capacidades, no un bounded context de negocio clásico.

---

## 7) Ejemplo de contrato CBQ dentro del sitio

### Command demo

`CreateDemoProductCommand` usa `#[RegisterCommand]` con:

- `uri: /v1/demo/products`
- `method: POST`
- `name: cmd.demo.products.create`
- validación de payload (`name`, `price`)

### Query demo

`ListDemoProductsQuery` usa `#[RegisterQuery]` con:

- `uri: /v1/demo/products`
- `method: GET`
- `name: qry.demo.products.list`

Esto muestra el flujo recomendado para documentación interactiva de CBQ:

UI demo -> endpoint registrado por atributo -> ejecución command/query -> respuesta para showcase.

---

## 8) Patrones arquitectónicos observados

1. **App de referencia técnica**: usa los paquetes como consumidor real.
2. **Registro declarativo**: commands/queries sin routing manual por endpoint.
3. **Showcase-driven docs**: cada sección documental tiene demos y assets asociados.
4. **Aislamiento de entornos**: middleware de auth relajado en local para demos.

---

## 9) Implicaciones para mantenimiento

1. Cambios en `backoffice-ui` y `backend-cbq` deben validarse aquí para detectar regresiones de integración.
2. Los ejemplos CBQ de `app/Http/Commands` y `app/Http/Queries` son referencia viva para onboarding.
3. `docs/*.md` debe evolucionar en paralelo con cambios de APIs o patrones de interacción.
4. Si se endurece seguridad, revisar `RegisterCmdQry` con middleware vacío en entorno local.

---

## 10) Referencias verificadas

- `uxmaltech/uxmal-site/composer.json`
- `uxmaltech/uxmal-site/app/Providers/AppServiceProvider.php`
- `uxmaltech/uxmal-site/bootstrap/app.php`
- `uxmaltech/uxmal-site/routes/web.php`
- `uxmaltech/uxmal-site/app/Http/CbqDemo/Command/CreateDemoProductCommand.php`
- `uxmaltech/uxmal-site/app/Http/CbqDemo/Queries/ListDemoProductsQuery.php`
- `uxmaltech/uxmal-site/docs/ARCHITECTURE.md`
- `uxmaltech/uxmal-site/docs/InteractiveBouiPages.md`

---

## 11) Catálogo de comandos y rutas

Inventario embebido en este documento con `command_name`, método HTTP, `uri` declarada y `api_route` efectiva.


Fecha de corte: 2026-02-19.

Este catálogo se extrajo de clases con `#[RegisterCommand(...)]`.

### Criterio de ruta efectiva
- `uxmal-site`: prefijo aplicado por service provider: `/api`.

### uxmaltech/uxmal-site

| command_name | method | uri (declarada) | api_route (efectiva) | file |
|---|---|---|---|---|
| `cmd.boui.actions.submitform.v1` | `POST` | `/boui-actions/submit-form` | `/api/boui-actions/submit-form` | `app/Http/Commands/BouiActionsSubmitFormCommand.php` |
| `cmd.chat.demo.v1` | `POST` | `/chat/demo` | `/api/chat/demo` | `app/Http/Commands/ChatDemoCommand.php` |
| `cmd.chat.stream-demo.v1` | `POST` | `/chat/stream-demo` | `/api/chat/stream-demo` | `app/Http/Commands/ChatStreamDemoCommand.php` |
| `cmd.demo.products.create` | `POST` | `/v1/demo/products` | `/api/v1/demo/products` | `app/Http/CbqDemo/Command/CreateDemoProductCommand.php` |
