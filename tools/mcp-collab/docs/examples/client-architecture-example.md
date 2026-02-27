# Arquitectura de contextos de una organización cliente

> **Nota:** Este documento es un ejemplo concreto de implementación para una organización cliente
> que consume el stack Uxmal MCP. Los patrones y estructura aquí descritos son reutilizables
> para cualquier organización; los nombres de repos y rutas son ilustrativos.

Documento técnico para describir apps/contextos que consumen el stack Uxmal en una organización cliente (`<org>`).

Repositorios cubiertos (ejemplo de tres repos de una org):

- `<org>/<scope>-storefront-backend`
- `<org>/<scope>-cms-context`
- `<org>/<scope>-storefront-product`

Fecha de corte del ejemplo: **2026-02-19**.

---

## 1) Resumen ejecutivo

Una organización típica en el stack Uxmal utiliza dos patrones principales:

1. **Backend API de e-commerce orientado a dominios** con comandos/queries registrados dinámicamente (`<scope>-storefront-backend`).
2. **Contexto CMS reusable** (como librería Laravel) con dominios ricos en UI+CBQ (`<scope>-cms-context`) que se monta sobre una app host (`<scope>-storefront-product`).

Esto permite separar:

- operación storefront/API (alto volumen de comandos y queries de negocio),
- operación de backoffice CMS (módulos UI administrativos),
- app host minimal para ejecutar el CMS.

---

## 2) Mapa de dependencias entre contextos y paquetes

```text
<scope>-storefront-backend
  -> uxmaltech/backend-cbq
  -> uxmaltech/core

<scope>-cms-context (library/package)
  -> uxmaltech/backoffice-ui
  -> uxmaltech/backend-cbq
  -> uxmaltech/core

<scope>-storefront-product (host app)
  -> <org>/<scope>-cms-aggregate (desde <scope>-cms-context)
  -> uxmaltech/auth
  -> uxmaltech/backoffice-ui
  -> uxmaltech/backend-cbq
  -> uxmaltech/core
```

Relación funcional:

- `<scope>-cms-context` contiene el dominio CMS real.
- `<scope>-storefront-product` es el contenedor/app runtime para ese dominio.
- `<scope>-storefront-backend` es otro backend de negocio, independiente del CMS host, pero también basado en CBQ + core.

---

## 3) `<org>/<scope>-storefront-backend`

## 3.1 Propósito

Backend de e-commerce con alta granularidad de dominios API (`V1` y transición parcial a `V2`), orientado a operaciones de cliente, carrito, orden, disponibilidad, pagos, notificaciones, etc.

## 3.2 Tecnología

- PHP 8.2+
- Laravel 11
- Redis (`ext-redis`)
- AWS SDK + Flysystem S3
- Sentry
- CBQ: `uxmaltech/backend-cbq`
- Base compartida: `uxmaltech/core`
- Frontend build mínimo: Vite + Axios

## 3.3 Arquitectura y registro de dominios

La app **no depende de archivos de rutas API tradicionales por módulo** para V1/V2; en su lugar, registra dominios dinámicamente con `RegisterCmdQry` desde `AppServiceProvider`:

- `app/Domains/V1/Apps`
- `app/Domains/V1/Core`
- `app/Domains/V1/Web`
- `app/Domains/V1/Langflow`
- `app/Domains/V1/Gupshup`
- `app/Domains/V1/Chat`
- `app/Domains/V2/Apps`
- `app/Domains/V2/Core`

Esto implica arquitectura **Command/Query declarativa por carpetas** (convención de ubicación + atributos CBQ).

## 3.4 Métricas de dominio (por código)

- `V1`:
  - Command files: **114**
  - Query files: **108**
- `V2`:
  - Command files: **1**
  - Query files: **7**
- Transformadores/Resources API (`app/Domains/Resources/...`): **117**
- Controllers HTTP tradicionales (`app/Http/Controllers`): **1**

Top-level en `app/Domains/V1` por volumen:

- `Core`: 429 entradas
- `Web`: 45
- `Apps`: 38
- `Filter`: 6
- `Chat`: 5
- `Langflow`: 4
- `Gupshup`: 4

## 3.5 Subdominios más activos

### Comandos (prefijos con mayor volumen)

- `Core/Order` (24)
- `Core/Client/Account` (15)
- `Core/Client` (12)
- `Core/Client/Reminder` (10)
- `Core/Client/Addressbook` (10)
- `Core/Conversion/FacebookCapi` (8)
- `Core/Client/Help/Report` (8)
- `Core/ShoppingCart` (7)
- `Core/Notification` (7)

### Queries (prefijos con mayor volumen)

- `Core/Availability` (14)
- `Core/Order` (9)
- `Core/Client/Help` (8)
- `Core/Products` (7)
- `Core/Client/Help/Report` (7)
- `Web/Cms/LandingPage` (6)
- `Core/Client/Reminder` (6)
- `Core/ShoppingCart/Additional` (5)
- `Apps/Layout/ShoppingCart` (5)
- `Apps/Cms/Category` (4)

## 3.6 Qué "dominios" maneja

Prácticamente se organiza como:

- `Core/*`: lógica principal de negocio (cliente, order, payments, shopping cart, availability, invoice, etc.).
- `Apps/*`: endpoints orientados a experiencia app/mobile/layout.
- `Web/*`: endpoints orientados a contenido web/cms para storefront.
- `Chat`, `Langflow`, `Gupshup`: integraciones de comunicación/IA.

## 3.7 Dependencias relevantes

Directas de interés arquitectónico:

- `uxmaltech/backend-cbq`
- `uxmaltech/core`
- `laravel/sanctum`
- `sentry/sentry-laravel`
- `ext-redis`

---

## 4) `<org>/<scope>-cms-context`

## 4.1 Propósito

Paquete/librería Laravel que concentra el **dominio CMS administrativo** de la organización.

No es solo modelos: encapsula **dominios completos** con Commands, Queries, UI y assets por módulo.

## 4.2 Tecnología

- PHP 8.2+
- Laravel package (`type: library`)
- `uxmaltech/backoffice-ui`
- `uxmaltech/backend-cbq`
- `uxmaltech/core`
- `spatie/laravel-activitylog`
- `neuron-core/neuron-ai`
- `ext-imagick`
- Frontend: Vite + Alpine + Bootstrap + TomSelect + SortableJS

## 4.3 Arquitectura de integración

`CMSAggregateServiceProvider` realiza:

1. Alias middleware de permisos (`check.permission`).
2. Registro de rutas self del paquete (`RegisterSelfRoutes`).
3. Registro CBQ de `src/Domains/` con:
   - `middleware: ['auth:sanctum']`
   - `prefix: 'api/cms-aggregate/'`
4. Carga de rutas web adicionales (`routes/web.php`) para acciones UI específicas (uploads, búsquedas auxiliares, etc.).

Resultado: patrón híbrido:

- endpoints declarativos Command/Query vía CBQ,
- endpoints web auxiliares para interacciones de UI y media management.

## 4.4 Dominios del paquete

Dominios detectados en `src/Domains`:

- `BlackListClients`
- `Categories`
- `Core`
- `CoverageArea`
- `DeliveryReschedule`
- `DeliverySchedule`
- `Footer`
- `LandingPage`
- `Megamenu`
- `ProductLayoutBanner`
- `ProductPhotos`
- `RestrictedDate`
- `SearchService`
- `Seo`
- `Utils`

Total dominios: **15**.

## 4.5 Métricas por dominio (Commands/Queries/UI/Controllers)

| Dominio | Commands | Queries | UI | Controllers |
|---|---:|---:|---:|---:|
| BlackListClients | 2 | 2 | 10 | 2 |
| Categories | 3 | 5 | 10 | 0 |
| Core | 1 | 0 | 1 | 0 |
| CoverageArea | 7 | 3 | 5 | 4 |
| DeliveryReschedule | 4 | 1 | 3 | 3 |
| DeliverySchedule | 6 | 3 | 27 | 0 |
| Footer | 1 | 0 | 7 | 0 |
| LandingPage | 4 | 1 | 15 | 2 |
| Megamenu | 2 | 0 | 9 | 1 |
| ProductLayoutBanner | 7 | 5 | 26 | 1 |
| ProductPhotos | 3 | 1 | 6 | 2 |
| RestrictedDate | 2 | 1 | 9 | 0 |
| SearchService | 0 | 1 | 2 | 0 |
| Seo | 6 | 10 | 39 | 0 |
| Utils | 0 | 1 | 0 | 0 |

Global:

- Commands: **48**
- Queries: **34**
- UI files: **169**
- Controllers por dominio: **15**
- JS por dominio en `resources/js`: **42**
- SCSS en `resources/scss`: **12**

## 4.6 Patrones de implementación de dominio

Estructura típica por dominio:

- `Commands/` para mutaciones.
- `Queries/` para lectura/listado (mucho GridJS).
- `UI/` para construcción de pantallas/components/modals/livewire.
- `Controllers/` cuando hay endpoints web auxiliares.

Esto convierte el paquete en un "módulo de backoffice completo", no solo en librería de entidades.

## 4.7 Seguridad y permisos

- Middleware `check.permission` revisa permisos Laratrust por `isAbleTo(...)`.
- Endpoints sensibles del paquete suelen usar `auth:sanctum` + `web`.

## 4.8 Dependencias relevantes

Directas de interés:

- `uxmaltech/backoffice-ui`
- `uxmaltech/backend-cbq`
- `uxmaltech/core`

---

## 5) `<org>/<scope>-storefront-product`

## 5.1 Propósito

Aplicación host de CMS/backoffice que monta:

- `<org>/<scope>-cms-aggregate` (desde `<scope>-cms-context`)
- stack Uxmal (`auth`, `backoffice-ui`, `backend-cbq`, `core`)

Funciona como "contenedor runtime" para módulos CMS, con poca lógica de dominio propia.

## 5.2 Tecnología

- Laravel (10/11/12 compatible)
- PHP 8.2+
- Sanctum
- Integración con Spatie Activitylog, Neuron AI, Laravel PDF, Excel
- Frontend: Vite + Bootstrap + Alpine + SCSS

## 5.3 Arquitectura actual

- `bootstrap/app.php` define middleware group `uxmal`:
  - `Authenticate`
  - `Uxmal\Backoffice\Middleware\MasterLayoutMiddleware`
  - `Uxmal\Backoffice\Middleware\CheckEnabledServicesMiddleware`
- `routes/web.php` expone home con middleware `['web', 'uxmal']`.
- `routes/api.php` mínimo (endpoint `/user` con Sanctum).

## 5.4 Densidad de dominio interno

Muy baja dentro del repo:

- Controllers: **3** (`AuthController`, `HomeController`, base `Controller`)
- Command files: **0**
- Query files: **0**
- JS: **2**
- SCSS: **1**

Conclusión: el dominio real se desplaza al paquete `<scope>-cms-context`.

## 5.5 Dependencias relevantes

- `<org>/<scope>-cms-aggregate` (`dev-main`, repo `<scope>-cms-context`)
- `uxmaltech/auth`
- `uxmaltech/backoffice-ui`
- `uxmaltech/backend-cbq`
- `uxmaltech/core`

---

## 6) Flujo de integración entre los tres contextos

## 6.1 Flujo CMS de backoffice

1. `<scope>-storefront-product` inicia app y middleware `uxmal`.
2. `<scope>-cms-context` (package) registra dominios y rutas/CBQ.
3. UI administrativa (backoffice-ui) consume Commands/Queries del paquete.
4. CBQ enruta ejecución local/remota según configuración.

## 6.2 Flujo storefront backend

1. `<scope>-storefront-backend` registra dominios V1/V2 desde filesystem.
2. Commands/Queries quedan expuestos por CBQ.
3. Se resuelven recursos API con transformadores en `app/Domains/Resources`.

## 6.3 Alineación tecnológica

Todos convergen en:

- `core` (infra/observabilidad/utilidades),
- `backend-cbq` (contrato de comandos/queries),
- Sanctum para autenticación API.

---

## 7) Implicaciones para mantenimiento y evolución

1. **`<scope>-cms-context` es el centro funcional del CMS**: cambios de negocio de CMS deben vivir ahí primero.
2. **`<scope>-storefront-product` debe mantenerse liviano**: evitar duplicar dominios que ya están en el paquete.
3. **`<scope>-storefront-backend` tiene alto acoplamiento por convención de carpetas**: al mover archivos en `app/Domains/V1|V2`, validar registro dinámico CBQ.
4. **Versionado de paquetes internos**: al usar varios `dev-main`/`*`, es clave congelar referencias para releases estables.

---

## 8) Referencias de estructura verificadas

- `<org>/<scope>-storefront-backend`
  - `app/Providers/AppServiceProvider.php`
  - `bootstrap/app.php`
  - `app/Domains/V1/*`, `app/Domains/V2/*`, `app/Domains/Resources/*`
- `<org>/<scope>-cms-context`
  - `src/CMSAggregateServiceProvider.php`
  - `src/Http/Middleware/CheckPermission.php`
  - `routes/web.php`
  - `src/Domains/*`
- `<org>/<scope>-storefront-product`
  - `bootstrap/app.php`
  - `app/Providers/AppServiceProvider.php`
  - `routes/web.php`, `routes/api.php`

---

## 9) Catálogo de comandos y rutas

Inventario de comandos con `command_name`, método HTTP, `uri` declarada y `api_route` efectiva.

Fecha de corte del ejemplo: 2026-02-19.

Este catálogo se extrajo de clases con `#[RegisterCommand(...)]`.

### Criterio de ruta efectiva
- `<scope>-storefront-backend`: sin prefijo adicional (ruta = `uri`).
- `<scope>-cms-context`: prefijo aplicado por service provider: `/api/cms-aggregate`.
- `<scope>-storefront-product`: sin comandos `RegisterCommand` detectados.

### `<org>/<scope>-storefront-backend` (ejemplo)

| command_name | method | uri (declarada) | api_route (efectiva) | file |
|---|---|---|---|---|
| `cmd.apps.layout.client.profile.put.v1` | `PUT` | `/v1/apps/layout/client/profile` | `/v1/apps/layout/client/profile` | `app/Domains/V1/Apps/Layout/Client/Profile/Commands/Update.php` |
| `cmd.core.client.account.post.v1` | `POST` | `/v1/core/client/account` | `/v1/core/client/account` | `app/Domains/V1/Core/Client/Account/Commands/Create.php` |
| `cmd.core.order.create.v1` | `POST` | `/v1/core/order/create` | `/v1/core/order/create` | `app/Domains/V1/Core/Order/Commands/Create.php` |
| `cmd.core.shopping_cart.add.post.v1` | `POST` | `/v1/core/shopping-cart` | `/v1/core/shopping-cart` | `app/Domains/V1/Core/ShoppingCart/Commands/AddProduct.php` |
| `... (N comandos más siguiendo el mismo patrón)` | | | | |

### `<org>/<scope>-cms-context` (ejemplo)

| command_name | method | uri (declarada) | api_route (efectiva) | file |
|---|---|---|---|---|
| `cmd.categories.create.v1` | `POST` | `/v1/cmd/cms/categories` | `/api/cms-aggregate/v1/cmd/cms/categories` | `src/Domains/Categories/Commands/Index/Create.php` |
| `cmd.seo.create.v1` | `POST` | `/v1/cmd/cms/seo` | `/api/cms-aggregate/v1/cmd/cms/seo` | `src/Domains/Seo/Commands/CreateSeoCommand.php` |
| `... (N comandos más siguiendo el mismo patrón)` | | | | |

### `<org>/<scope>-storefront-product`

No se detectaron clases con `#[RegisterCommand(...)]` en este repositorio (es una app host).
