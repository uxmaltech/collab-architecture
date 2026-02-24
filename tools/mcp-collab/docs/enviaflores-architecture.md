# Arquitectura de contextos `enviaflores`

Documento técnico para describir apps/contextos que consumen el stack Uxmal en la organización `enviaflores`.

Repositorios cubiertos:

- `enviaflores/ef-storefront-backend`
- `enviaflores/ef-cms-context`
- `enviaflores/ef-storefront-product`

Fecha de corte: **2026-02-19**.

---

## 1) Resumen ejecutivo

`enviaflores` utiliza dos patrones principales:

1. **Backend API de e-commerce orientado a dominios** con comandos/queries registrados dinámicamente (`ef-storefront-backend`).
2. **Contexto CMS reusable** (como librería Laravel) con dominios ricos en UI+CBQ (`ef-cms-context`) que se monta sobre una app host (`ef-storefront-product`).

Esto permite separar:

- operación storefront/API (alto volumen de comandos y queries de negocio),
- operación de backoffice CMS (módulos UI administrativos),
- app host minimal para ejecutar el CMS.

---

## 2) Mapa de dependencias entre contextos y paquetes

```text
ef-storefront-backend
  -> uxmaltech/backend-cbq
  -> uxmaltech/core

 ef-cms-context (library/package)
  -> uxmaltech/backoffice-ui
  -> uxmaltech/backend-cbq
  -> uxmaltech/core

 ef-storefront-product (host app)
  -> enviaflores/ef-cms-aggregate (desde ef-cms-context)
  -> uxmaltech/auth
  -> uxmaltech/backoffice-ui
  -> uxmaltech/backend-cbq
  -> uxmaltech/core
```

Relación funcional:

- `ef-cms-context` contiene el dominio CMS real.
- `ef-storefront-product` es el contenedor/app runtime para ese dominio.
- `ef-storefront-backend` es otro backend de negocio, independiente del CMS host, pero también basado en CBQ + core.

---

## 3) `enviaflores/ef-storefront-backend`

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

## 3.6 Qué “dominios” maneja

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

## 4) `enviaflores/ef-cms-context`

## 4.1 Propósito

Paquete/librería Laravel que concentra el **dominio CMS administrativo** de EnviaFlores.

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

Esto convierte el paquete en un “módulo de backoffice completo”, no solo en librería de entidades.

## 4.7 Seguridad y permisos

- Middleware `check.permission` revisa permisos Laratrust por `isAbleTo(...)`.
- Endpoints sensibles del paquete suelen usar `auth:sanctum` + `web`.

## 4.8 Dependencias relevantes

Directas de interés:

- `uxmaltech/backoffice-ui`
- `uxmaltech/backend-cbq`
- `uxmaltech/core`

---

## 5) `enviaflores/ef-storefront-product`

## 5.1 Propósito

Aplicación host de CMS/backoffice que monta:

- `enviaflores/ef-cms-aggregate` (desde `ef-cms-context`)
- stack Uxmal (`auth`, `backoffice-ui`, `backend-cbq`, `core`)

Funciona como “contenedor runtime” para módulos CMS, con poca lógica de dominio propia.

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

Conclusión: el dominio real se desplaza al paquete `ef-cms-context`.

## 5.5 Dependencias relevantes

- `enviaflores/ef-cms-aggregate` (`dev-main`, repo `ef-cms-context`)
- `uxmaltech/auth`
- `uxmaltech/backoffice-ui`
- `uxmaltech/backend-cbq`
- `uxmaltech/core`

---

## 6) Flujo de integración entre los tres contextos

## 6.1 Flujo CMS de backoffice

1. `ef-storefront-product` inicia app y middleware `uxmal`.
2. `ef-cms-context` (package) registra dominios y rutas/CBQ.
3. UI administrativa (backoffice-ui) consume Commands/Queries del paquete.
4. CBQ enruta ejecución local/remota según configuración.

## 6.2 Flujo storefront backend

1. `ef-storefront-backend` registra dominios V1/V2 desde filesystem.
2. Commands/Queries quedan expuestos por CBQ.
3. Se resuelven recursos API con transformadores en `app/Domains/Resources`.

## 6.3 Alineación tecnológica

Todos convergen en:

- `core` (infra/observabilidad/utilidades),
- `backend-cbq` (contrato de comandos/queries),
- Sanctum para autenticación API.

---

## 7) Implicaciones para mantenimiento y evolución

1. **`ef-cms-context` es el centro funcional del CMS**: cambios de negocio de CMS deben vivir ahí primero.
2. **`ef-storefront-product` debe mantenerse liviano**: evitar duplicar dominios que ya están en el paquete.
3. **`ef-storefront-backend` tiene alto acoplamiento por convención de carpetas**: al mover archivos en `app/Domains/V1|V2`, validar registro dinámico CBQ.
4. **Versionado de paquetes internos**: al usar varios `dev-main`/`*`, es clave congelar referencias para releases estables.

---

## 8) Referencias de estructura verificadas

- `enviaflores/ef-storefront-backend`
  - `app/Providers/AppServiceProvider.php`
  - `bootstrap/app.php`
  - `app/Domains/V1/*`, `app/Domains/V2/*`, `app/Domains/Resources/*`
- `enviaflores/ef-cms-context`
  - `src/CMSAggregateServiceProvider.php`
  - `src/Http/Middleware/CheckPermission.php`
  - `routes/web.php`
  - `src/Domains/*`
- `enviaflores/ef-storefront-product`
  - `bootstrap/app.php`
  - `app/Providers/AppServiceProvider.php`
  - `routes/web.php`, `routes/api.php`

---

## 9) Catálogo de comandos y rutas

Inventario embebido en este documento con `command_name`, método HTTP, `uri` declarada y `api_route` efectiva.


Fecha de corte: 2026-02-19.

Este catálogo se extrajo de clases con `#[RegisterCommand(...)]`.

### Criterio de ruta efectiva
- `ef-storefront-backend`: sin prefijo adicional (ruta = `uri`).
- `ef-cms-context`: prefijo aplicado por service provider: `/api/cms-aggregate`.
- `ef-storefront-product`: sin comandos `RegisterCommand` detectados.

### enviaflores/ef-storefront-backend

| command_name | method | uri (declarada) | api_route (efectiva) | file |
|---|---|---|---|---|
| `cmd.apps.layout.client.profile.put.v1` | `PUT` | `/v1/apps/layout/client/profile` | `/v1/apps/layout/client/profile` | `app/Domains/V1/Apps/Layout/Client/Profile/Commands/Update.php` |
| `cmd.core.cache.delete.v1` | `DELETE` | `/v1/core/cache/delete` | `/v1/core/cache/delete` | `app/Domains/V1/Core/Commands/DeleteCache.php` |
| `cmd.core.client.account.delete.v1` | `DELETE` | `/v1/core/client/account/delete` | `/v1/core/client/account/delete` | `app/Domains/V1/Core/Client/Account/Commands/Delete.php` |
| `cmd.core.client.account.password.post.v1` | `POST` | `/v1/core/client/account/password` | `/v1/core/client/account/password` | `app/Domains/V1/Core/Client/Account/Commands/AccountPassword.php` |
| `cmd.core.client.account.post.v1` | `POST` | `/v1/core/client/account` | `/v1/core/client/account` | `app/Domains/V1/Core/Client/Account/Commands/Create.php` |
| `cmd.core.client.account.recover_password.post.v1` | `POST` | `/v1/core/client/password-recovery` | `/v1/core/client/password-recovery` | `app/Domains/V1/Core/Client/Account/Commands/RecoverPassword.php` |
| `cmd.core.client.account.recover_password.validate.post.v1` | `POST` | `/v1/core/client/account/recover_password/validate` | `/v1/core/client/account/recover_password/validate` | `app/Domains/V1/Core/Client/Account/Commands/RecoverPasswordValidate.php` |
| `cmd.core.client.account.reset_password.post.v1` | `POST` | `/v1/core/client/account/reset_password` | `/v1/core/client/account/reset_password` | `app/Domains/V1/Core/Client/Account/Commands/ResetPassword.php` |
| `cmd.core.client.account.unlink-social-account.v1` | `DELETE` | `/v1/core/client/account/unlink-social-account` | `/v1/core/client/account/unlink-social-account` | `app/Domains/V1/Core/Client/Account/Commands/UnlinkSocialAccount.php` |
| `cmd.core.client.addressbook.delete.v1` | `DELETE` | `/v1/core/client/addressbook` | `/v1/core/client/addressbook` | `app/Domains/V1/Core/Client/Addressbook/Commands/Delete.php` |
| `cmd.core.client.addressbook.post.v1` | `POST` | `/v1/core/client/addressbook` | `/v1/core/client/addressbook` | `app/Domains/V1/Core/Client/Addressbook/Commands/Store.php` |
| `cmd.core.client.addressbook.update.v1` | `PUT` | `/v1/core/client/addressbook` | `/v1/core/client/addressbook` | `app/Domains/V1/Core/Client/Addressbook/Commands/Update.php` |
| `cmd.core.client.apple.link.put.v1` | `PUT` | `/v1/core/client/apple/link` | `/v1/core/client/apple/link` | `app/Domains/V1/Core/Client/Commands/AppleLink.php` |
| `cmd.core.client.facebook.link.put.v1` | `PUT` | `/v1/core/client/facebook/link` | `/v1/core/client/facebook/link` | `app/Domains/V1/Core/Client/Commands/FacebookLink.php` |
| `cmd.core.client.google.link.put.v1` | `PUT` | `/v1/core/client/google/link` | `/v1/core/client/google/link` | `app/Domains/V1/Core/Client/Commands/GoogleLink.php` |
| `cmd.core.client.help.report.store.v1` | `POST` | `/v1/core/client/help/report` | `/v1/core/client/help/report` | `app/Domains/V1/Core/Client/Help/Report/Commands/Store.php` |
| `cmd.core.client.login.post.v1` | `POST` | `/v1/core/client/login` | `/v1/core/client/login` | `app/Domains/V1/Core/Client/Commands/Login.php` |
| `cmd.core.client.logout.delete.v1` | `DELETE` | `/v1/core/client/logout` | `/v1/core/client/logout` | `app/Domains/V1/Core/Client/Commands/Logout.php` |
| `cmd.core.client.notification.delete.all.v1` | `DELETE` | `/v1/core/client/notification/delete/all` | `/v1/core/client/notification/delete/all` | `app/Domains/V1/Core/Client/Notification/Commands/DeleteAll.php` |
| `cmd.core.client.notification.delete.v1` | `DELETE` | `/v1/core/client/notification` | `/v1/core/client/notification` | `app/Domains/V1/Core/Client/Notification/Commands/Delete.php` |
| `cmd.core.client.notification.update.opened.all.v1` | `PUT` | `/v1/core/client/notification/update/opened/all` | `/v1/core/client/notification/update/opened/all` | `app/Domains/V1/Core/Client/Notification/Commands/UpdateOpenedByClient.php` |
| `cmd.core.client.notification.update.opened.ids.v1` | `PUT` | `/v1/core/client/notification/update/opened` | `/v1/core/client/notification/update/opened` | `app/Domains/V1/Core/Client/Notification/Commands/UpdateOpenedByIds.php` |
| `cmd.core.client.refresh-token.post.v1` | `POST` | `/v1/core/client/refresh-token` | `/v1/core/client/refresh-token` | `app/Domains/V1/Core/Client/Commands/RefreshToken.php` |
| `cmd.core.client.reminders.delete.v1` | `DELETE` | `/v1/core/client/reminders` | `/v1/core/client/reminders` | `app/Domains/V1/Core/Client/Reminder/Commands/Delete.php` |
| `cmd.core.client.reminders.post.v1` | `POST` | `/v1/core/client/reminders` | `/v1/core/client/reminders` | `app/Domains/V1/Core/Client/Reminder/Commands/Store.php` |
| `cmd.core.client.reminders.update.v1` | `PUT` | `/v1/core/client/reminders` | `/v1/core/client/reminders` | `app/Domains/V1/Core/Client/Reminder/Commands/Update.php` |
| `cmd.core.client.set-password.put.v1` | `PUT` | `/v1/core/client/set-password` | `/v1/core/client/set-password` | `app/Domains/V1/Core/Client/Account/Commands/ClientPaswordUpdate.php` |
| `cmd.core.client.ticket.store.v1` | `POST` | `/v1/core/client/ticket/store` | `/v1/core/client/ticket/store` | `app/Domains/V1/Core/Client/Ticket/Commands/Store.php` |
| `cmd.core.conversion.custom-facebook-capi.post.v1` | `POST` | `/v1/core/conversion/custom-facebook-capi` | `/v1/core/conversion/custom-facebook-capi` | `app/Domains/V1/Core/Conversion/FacebookCapi/Commands/CustomStore.php` |
| `cmd.core.conversion.facebook-capi.post.v1` | `POST` | `/v1/core/conversion/facebook-capi` | `/v1/core/conversion/facebook-capi` | `app/Domains/V1/Core/Conversion/FacebookCapi/Commands/Store.php` |
| `cmd.core.image.create.v1` | `POST` | `/v1/core/image/create` | `/v1/core/image/create` | `app/Domains/V1/Core/Image/Commands/Create.php` |
| `cmd.core.images.presigned-url.upload.post.v1` | `POST` | `/v1/core/images/presigned-url/upload` | `/v1/core/images/presigned-url/upload` | `app/Domains/V1/Core/Image/Commands/CreateUploadPresignedUrl.php` |
| `cmd.core.notification.email.v1` | `POST` | `/v1/core/notification/email` | `/v1/core/notification/email` | `app/Domains/V1/Core/Notification/Commands/SendEmail.php` |
| `cmd.core.notification.request-quote.v1` | `POST` | `/v1/core/notification/request-quote` | `/v1/core/notification/request-quote` | `app/Domains/V1/Core/Notification/Commands/RequestQuoteEmailNotification.php` |
| `cmd.core.notification.sms.v1` | `POST` | `/v1/core/notification/sms` | `/v1/core/notification/sms` | `app/Domains/V1/Core/Notification/Commands/SendSms.php` |
| `cmd.core.order.change_city_shipping.v1` | `PUT` | `/v1/core/order/change-city-shipping` | `/v1/core/order/change-city-shipping` | `app/Domains/V1/Core/Order/Commands/ChangeCityShipping.php` |
| `cmd.core.order.create.v1` | `POST` | `/v1/core/order/create` | `/v1/core/order/create` | `app/Domains/V1/Core/Order/Commands/Create.php` |
| `cmd.core.order.delete-route.v1` | `DELETE` | `/v1/core/order/delete-route` | `/v1/core/order/delete-route` | `app/Domains/V1/Core/Order/Commands/RemoveOrderRoute.php` |
| `cmd.core.order.delete.v1` | `DELETE` | `/v1/core/order/delete` | `/v1/core/order/delete` | `app/Domains/V1/Core/Order/Commands/Delete.php` |
| `cmd.core.order.generate-coupon-code.v1` | `POST` | `/v1/core/order/coupon/generate` | `/v1/core/order/coupon/generate` | `app/Domains/V1/Core/Order/Commands/GenerateClientCouponCode.php` |
| `cmd.core.order.invoice.v1` | `POST` | `/v1/core/order/invoice` | `/v1/core/order/invoice` | `app/Domains/V1/Core/Order/Commands/Invoice.php` |
| `cmd.core.order.invoice.v2` | `POST` | `/v2/core/order/invoice` | `/v2/core/order/invoice` | `app/Domains/V2/Core/Order/Commands/Invoice.php` |
| `cmd.core.order.payment.cybersource.dm.process.v1` | `POST` | `/v1/core/order/payment/cybersource/dm/process` | `/v1/core/order/payment/cybersource/dm/process` | `app/Domains/V1/Core/Order/Payment/Cybersource/DecisionManager/Commands/Process.php` |
| `cmd.core.order.payment.cybersource.payer_authentication.check_enrollment.v1` | `POST` | `/v1/core/order/payment/cybersource/payer_authentication/check_enrollment` | `/v1/core/order/payment/cybersource/payer_authentication/check_enrollment` | `app/Domains/V1/Core/Order/Payment/Cybersource/PayerAuthentication/Commands/CheckEnrollment.php` |
| `cmd.core.order.payment.cybersource.payer_authentication.check_enrollment_response.v1` | `POST` | `/v1/core/order/payment/cybersource/payer_authentication/check_enrollment_response` | `/v1/core/order/payment/cybersource/payer_authentication/check_enrollment_response` | `app/Domains/V1/Core/Order/Payment/Cybersource/PayerAuthentication/Commands/CheckEnrollmentResponse.php` |
| `cmd.core.order.payment.cybersource.payer_authentication.setup.v1` | `POST` | `/v1/core/order/payment/cybersource/payer_authentication/setup` | `/v1/core/order/payment/cybersource/payer_authentication/setup` | `app/Domains/V1/Core/Order/Payment/Cybersource/PayerAuthentication/Commands/Setup.php` |
| `cmd.core.order.payment.link.v1` | `POST` | `/v1/core/order/payment/link` | `/v1/core/order/payment/link` | `app/Domains/V1/Core/Order/Commands/PaymentLink.php` |
| `cmd.core.order.payment.paypal.cancel_order.v1` | `POST` | `/v1/core/order/payment/paypal/cancel_order` | `/v1/core/order/payment/paypal/cancel_order` | `app/Domains/V1/Core/Order/Payment/Paypal/Commands/CancelOrder.php` |
| `cmd.core.order.payment.paypal.capture_order.v1` | `POST` | `/v1/core/order/payment/paypal/capture_order` | `/v1/core/order/payment/paypal/capture_order` | `app/Domains/V1/Core/Order/Payment/Paypal/Commands/CaptureOrder.php` |
| `cmd.core.order.payment.v1` | `POST` | `/v1/core/order/payment` | `/v1/core/order/payment` | `app/Domains/V1/Core/Order/Commands/Payment.php` |
| `cmd.core.order.reschedule.v1` | `PUT` | `/v1/core/order/reschedule` | `/v1/core/order/reschedule` | `app/Domains/V1/Core/Order/Commands/Reschedule.php` |
| `cmd.core.order.shipping.v1` | `PUT` | `/v1/core/order/shipping` | `/v1/core/order/shipping` | `app/Domains/V1/Core/Order/Commands/SetShippingPrice.php` |
| `cmd.core.order.update.v1` | `PUT` | `/v1/core/order` | `/v1/core/order` | `app/Domains/V1/Core/Order/Commands/Update.php` |
| `cmd.core.order.validate-address-distance.post.v1` | `POST` | `/v1/core/order/validate-address-distance` | `/v1/core/order/validate-address-distance` | `app/Domains/V1/Core/Order/Commands/ValidateAddressDistance.php` |
| `cmd.core.shopping_cart.add.post.v1` | `POST` | `/v1/core/shopping-cart` | `/v1/core/shopping-cart` | `app/Domains/V1/Core/ShoppingCart/Commands/AddProduct.php` |
| `cmd.core.shopping_cart.coupon.delete.v1` | `DELETE` | `/v1/core/shopping-cart/coupon/delete` | `/v1/core/shopping-cart/coupon/delete` | `app/Domains/V1/Core/ShoppingCart/Commands/DeleteCoupon.php` |
| `cmd.core.shopping_cart.coupon.post.v1` | `POST` | `/v1/core/shopping-cart/coupon` | `/v1/core/shopping-cart/coupon` | `app/Domains/V1/Core/ShoppingCart/Commands/SetCoupon.php` |
| `cmd.core.shopping_cart.delete.v1` | `DELETE` | `/v1/core/shopping-cart/{item_id}` | `/v1/core/shopping-cart/{item_id}` | `app/Domains/V1/Core/ShoppingCart/Commands/DeleteProduct.php` |
| `cmd.core.shopping_cart.delivery_date_time.v1` | `PUT` | `/v1/core/shopping-cart/delivery-date-time` | `/v1/core/shopping-cart/delivery-date-time` | `app/Domains/V1/Core/ShoppingCart/Commands/SetDeliveryDateTime.php` |
| `cmd.core.shopping_cart.set.put.v1` | `PUT` | `/v1/core/shopping-cart` | `/v1/core/shopping-cart` | `app/Domains/V1/Core/ShoppingCart/Commands/SetProduct.php` |
| `cmd.core.shopping_cart.shipping.put.v1` | `PUT` | `/v1/core/shopping-cart/shipping` | `/v1/core/shopping-cart/shipping` | `app/Domains/V1/Core/ShoppingCart/Commands/ChangeShipping.php` |

### enviaflores/ef-cms-context

| command_name | method | uri (declarada) | api_route (efectiva) | file |
|---|---|---|---|---|
| `cmd.aws.s3.object-created.put.ef-products-images-original` | `POST` | `/products/photos/process-image` | `/api/cms-aggregate/products/photos/process-image` | `src/Domains/ProductPhotos/Commands/ProcessImage.php` |
| `cmd.categories.create.v1` | `POST` | `/v1/cmd/cms/categories` | `/api/cms-aggregate/v1/cmd/cms/categories` | `src/Domains/Categories/Commands/Index/Create.php` |
| `cmd.categories.edit.update.v1` | `PUT` | `/v1/cmd/cms/edit/categories` | `/api/cms-aggregate/v1/cmd/cms/edit/categories` | `src/Domains/Categories/Commands/UpdateCategory/Update.php` |
| `cmd.categories.update.v1` | `PUT` | `/v1/cmd/cms/categories` | `/api/cms-aggregate/v1/cmd/cms/categories` | `src/Domains/Categories/Commands/Index/Update.php` |
| `cmd.cms.coverage-area.create.v1` | `POST` | `/v1/cmd/cms/coverage-area` | `/api/cms-aggregate/v1/cmd/cms/coverage-area` | `src/Domains/CoverageArea/Commands/Sections/CoverageArea/Create.php` |
| `cmd.cms.coverage-area.section.affiliate-workshop-detail-cities.delete.v1` | `POST` | `/v1/cmd/cms/coverage-area/section/affiliate-workshop-detail-cities` | `/api/cms-aggregate/v1/cmd/cms/coverage-area/section/affiliate-workshop-detail-cities` | `src/Domains/CoverageArea/Commands/Sections/AffiliateWorkshopDetailCities/Delete.php` |
| `cmd.cms.coverage-area.section.affiliate-workshop-detail-zones.create.v1` | `POST` | `/v1/cmd/cms/coverage-area/section/affiliate-workshop-detail-zones` | `/api/cms-aggregate/v1/cmd/cms/coverage-area/section/affiliate-workshop-detail-zones` | `src/Domains/CoverageArea/Commands/Sections/AffiliateWorkshopDetailZones/Create.php` |
| `cmd.cms.coverage-area.section.affiliate-workshop-detail-zones.delete.v1` | `POST` | `/v1/cmd/cms/coverage-area/section/affiliate-workshop-detail-zones` | `/api/cms-aggregate/v1/cmd/cms/coverage-area/section/affiliate-workshop-detail-zones` | `src/Domains/CoverageArea/Commands/Sections/AffiliateWorkshopDetailZones/Delete.php` |
| `cmd.cms.coverage-area.section.affiliate-workshop-detail-zones.update.v1` | `POST` | `/v1/cmd/cms/coverage-area/section/affiliate-workshop-detail-zones` | `/api/cms-aggregate/v1/cmd/cms/coverage-area/section/affiliate-workshop-detail-zones` | `src/Domains/CoverageArea/Commands/Sections/AffiliateWorkshopDetailZones/Update.php` |
| `cmd.cms.coverage-area.section.affiliate-workshop.create.v1` | `POST` | `/v1/cmd/cms/coverage-area/section/affiliate-workshop` | `/api/cms-aggregate/v1/cmd/cms/coverage-area/section/affiliate-workshop` | `src/Domains/CoverageArea/Commands/Sections/AffiliateWorkshop/Create.php` |
| `cmd.cms.coverage-area.update.v1` | `POST` | `/v1/cmd/cms/coverage-area` | `/api/cms-aggregate/v1/cmd/cms/coverage-area` | `src/Domains/CoverageArea/Commands/Sections/CoverageArea/Update.php` |
| `cmd.cms.delivery-reschedule.create.v1` | `POST` | `/v1/cmd/cms/delivery-reschedule` | `/api/cms-aggregate/v1/cmd/cms/delivery-reschedule` | `src/Domains/DeliveryReschedule/Commands/Sections/DeliveryReschedule/Create.php` |
| `cmd.cms.delivery-reschedule.delete.v1` | `POST` | `/v1/cmd/cms/delivery-reschedule` | `/api/cms-aggregate/v1/cmd/cms/delivery-reschedule` | `src/Domains/DeliveryReschedule/Commands/Sections/DeliveryReschedule/Delete.php` |
| `cmd.cms.delivery-reschedule.section.index.update.v1` | `POST` | `/v1/cmd/cms/delivery-reschedule/section/index` | `/api/cms-aggregate/v1/cmd/cms/delivery-reschedule/section/index` | `src/Domains/DeliveryReschedule/Commands/Sections/Index/Update.php` |
| `cmd.cms.delivery-reschedule.update.v1` | `POST` | `/v1/cmd/cms/delivery-reschedule` | `/api/cms-aggregate/v1/cmd/cms/delivery-reschedule` | `src/Domains/DeliveryReschedule/Commands/Sections/DeliveryReschedule/Update.php` |
| `cmd.cms.delivery-schedule..affiliate-cities.update.v1` | `POST` | `/v1/cms/delivery-schedule-detail/affiliate-cities/update` | `/api/cms-aggregate/v1/cms/delivery-schedule-detail/affiliate-cities/update` | `src/Domains/DeliverySchedule/Commands/ScheduleDetailByAffiliateCity/Update.php` |
| `cmd.products.photos.presigned-url.post.v1` | `POST` | `/products/photos/presigned-urls` | `/api/cms-aggregate/products/photos/presigned-urls` | `src/Domains/ProductPhotos/Commands/GetPresignedUrl.php` |
| `cmd.products.photos.store_ordering.v1` | `POST` | `/products/photos/order` | `/api/cms-aggregate/products/photos/order` | `src/Domains/ProductPhotos/Commands/StoreOrdering.php` |
| `cmd.restricted_date.create.v1` | `PUT` | `/v1/cmd/cms/restricted_date` | `/api/cms-aggregate/v1/cmd/cms/restricted_date` | `src/Domains/RestrictedDate/Commands/CreateRestrictedDate/Create.php` |
| `cmd.restricted_date.delete.v1` | `PUT` | `/v1/cmd/cms/restricted_date` | `/api/cms-aggregate/v1/cmd/cms/restricted_date` | `src/Domains/RestrictedDate/Commands/Index/Delete.php` |
| `cmd.restricted_date_blocks.create.v1` | `POST` | `/v1/cmd/cms/delivery-schedule/add-restricted-date-by-time-block` | `/api/cms-aggregate/v1/cmd/cms/delivery-schedule/add-restricted-date-by-time-block` | `src/Domains/DeliverySchedule/Commands/AddRestrictedDateByTimeBlock/Create.php` |
| `cmd.restricted_date_blocks.delete.v1` | `POST` | `/v1/cmd/cms/delivery-schedule/index` | `/api/cms-aggregate/v1/cmd/cms/delivery-schedule/index` | `src/Domains/DeliverySchedule/Commands/Index/Delete.php` |
| `cmd.seo.ai_prompts.version.create` | `POST` | `/cms/seo/ai-prompts/versions` | `/api/cms-aggregate/cms/seo/ai-prompts/versions` | `src/Domains/Seo/Commands/CreateAiPromptVersion/Create.php` |
| `cmd.seo.create.v1` | `POST` | `/v1/cmd/cms/seo` | `/api/cms-aggregate/v1/cmd/cms/seo` | `src/Domains/Seo/Commands/CreateSeoCommand.php` |
| `cmd.seo.slug.update.v1` | `PUT` | `/v1/cmd/cms/seo/slug` | `/api/cms-aggregate/v1/cmd/cms/seo/slug` | `src/Domains/Seo/Commands/UpdateSlug/Update.php` |
| `cmd.seo.toggle-active.v1` | `PUT` | `/v1/cmd/cms/seo/toggle-active` | `/api/cms-aggregate/v1/cmd/cms/seo/toggle-active` | `src/Domains/Seo/Commands/ToggleSeoActiveCommand.php` |
| `cmd.seo.update.v1` | `PUT` | `/v1/cmd/cms/seo` | `/api/cms-aggregate/v1/cmd/cms/seo` | `src/Domains/Seo/Commands/UpdateSeoCommand.php` |
| `v1.cmd.cms.blacklist_clients.disable` | `POST` | `/blacklist-clients-disable` | `/api/cms-aggregate/blacklist-clients-disable` | `src/Domains/BlackListClients/Commands/Disable.php` |
| `v1.cmd.cms.blacklist_clients.store` | `POST` | `/blacklist-clients` | `/api/cms-aggregate/blacklist-clients` | `src/Domains/BlackListClients/Commands/Store.php` |
| `v1.cmd.cms.footer.store` | `POST` | `/footer` | `/api/cms-aggregate/footer` | `src/Domains/Footer/Commands/Store.php` |
| `v1.cmd.cms.landing-page.section.category-banners.store` | `POST` | `/landing-page/section/category-banners` | `/api/cms-aggregate/landing-page/section/category-banners` | `src/Domains/LandingPage/Commands/Sections/CategoryBanners/Store.php` |
| `v1.cmd.cms.landing-page.section.category-carousel.store` | `POST` | `/landing-page/section/category-carousels` | `/api/cms-aggregate/landing-page/section/category-carousels` | `src/Domains/LandingPage/Commands/Sections/CategoryCarousels/Store.php` |
| `v1.cmd.cms.landing-page.section.category-product.store` | `POST` | `/landing-page/section/category-products` | `/api/cms-aggregate/landing-page/section/category-products` | `src/Domains/LandingPage/Commands/Sections/CategoryProducts/Store.php` |
| `v1.cmd.cms.landing-page.section.incentive-cards.store` | `POST` | `/landing-page/section/incentive-cards` | `/api/cms-aggregate/landing-page/section/incentive-cards` | `src/Domains/LandingPage/Commands/Sections/IncentiveCards/Store.php` |
| `v1.cmd.cms.product-layout-banner-image.delete` | `DELETE` | `/v1/cmd/cms/product-layout-banner-image/delete` | `/api/cms-aggregate/v1/cmd/cms/product-layout-banner-image/delete` | `src/Domains/ProductLayoutBanner/Commands/DeleteBannerImage.php` |
| `v1.cmd.cms.product-layout-banner-image.update-sort-order` | `POST` | `/v1/cmd/cms/product-layout-banner-image/update-sort-order` | `/api/cms-aggregate/v1/cmd/cms/product-layout-banner-image/update-sort-order` | `src/Domains/ProductLayoutBanner/Commands/UpdateSortOrderImages.php` |
| `v1.cmd.cms.product-layout-banner.change-status` | `POST` | `/v1/cmd/cms/product-layout-banner/change-status` | `/api/cms-aggregate/v1/cmd/cms/product-layout-banner/change-status` | `src/Domains/ProductLayoutBanner/Commands/ChangeStatus.php` |
| `v1.cmd.cms.product-layout-banner.create` | `POST` | `/v1/cmd/cms/product-layout-banner/create` | `/api/cms-aggregate/v1/cmd/cms/product-layout-banner/create` | `src/Domains/ProductLayoutBanner/Commands/Create.php` |
| `v1.cmd.cms.product-layout-banner.delete` | `POST` | `/v1/cmd/cms/product-layout-banner/delete` | `/api/cms-aggregate/v1/cmd/cms/product-layout-banner/delete` | `src/Domains/ProductLayoutBanner/Commands/Delete.php` |
| `v1.cmd.cms.product-layout-banner.duplicate` | `POST` | `/v1/cmd/cms/product-layout-banner/duplicate` | `/api/cms-aggregate/v1/cmd/cms/product-layout-banner/duplicate` | `src/Domains/ProductLayoutBanner/Commands/Duplicate.php` |
| `v1.cmd.cms.product-layout-banner.update` | `PUT` | `/v1/cmd/cms/product-layout-banner/update` | `/api/cms-aggregate/v1/cmd/cms/product-layout-banner/update` | `src/Domains/ProductLayoutBanner/Commands/Update.php` |
| `v1.cmd.delivery-schedule.delete` | `POST` | `/v1/cms/delivery-schedule/delete` | `/api/cms-aggregate/v1/cms/delivery-schedule/delete` | `src/Domains/DeliverySchedule/Commands/Delete.php` |
| `v1.cmd.delivery-schedule.store` | `POST` | `/v1/cms/delivery-schedule/store` | `/api/cms-aggregate/v1/cms/delivery-schedule/store` | `src/Domains/DeliverySchedule/Commands/Store.php` |
| `v1.cmd.delivery-schedule.update` | `POST` | `/v1/cms/delivery-schedule/update` | `/api/cms-aggregate/v1/cms/delivery-schedule/update` | `src/Domains/DeliverySchedule/Commands/Update.php` |
| `v1.cmd.megamenu.listing.store` | `PUT` | `/v1/cms/megamenu/listing` | `/api/cms-aggregate/v1/cms/megamenu/listing` | `src/Domains/Megamenu/Commands/MegamenuListingStore.php` |
| `v1.cmd.megamenu.store` | `PUT` | `/v1/cms/megamenu` | `/api/cms-aggregate/v1/cms/megamenu` | `src/Domains/Megamenu/Commands/Store.php` |

### enviaflores/ef-storefront-product

No se detectaron clases con `#[RegisterCommand(...)]` en este repositorio.
