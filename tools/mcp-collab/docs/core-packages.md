# Arquitectura de repositorios `uxmaltech`

Documento técnico para que otro modelo (o equipo) pueda entender **cómo está estructurado el ecosistema** formado por:

- `uxmaltech/core`
- `uxmaltech/auth`
- `uxmaltech/backoffice-ui`
- `uxmaltech/backend-cbq`

Fecha de corte: **2026-02-19**.

---

## 1) Propósito de este documento

Este archivo describe:

1. Rol de cada repositorio.
2. Tecnología y arquitectura interna.
3. Flujo de integración entre repositorios.
4. Dependencias directas y transitivas.
5. Contratos de ejecución (HTTP, broker, autodiscovery, middleware, tracing).
6. Puntos de extensión para implementación futura.

Objetivo: servir como contexto estable para análisis de código, generación de cambios y troubleshooting por otro modelo.

---

## 2) Vista general (alto nivel)

### Dependencias entre paquetes

```text
auth -> backoffice-ui -> core
backend-cbq -> core
backoffice-ui <-> backend-cbq (integración funcional por CBQ)
```

### Responsabilidad por repositorio

- `core`: capa base transversal (observabilidad + automatización de entorno + utilidades comunes).
- `auth`: autenticación/autorización centralizada (Google OAuth, Sanctum, roles/permisos, panel).
- `backoffice-ui`: framework UI reactivo para backoffice (BOUI runtime + componentes + integración con Livewire).
- `backend-cbq`: broker declarativo de comandos/queries (drivers Kafka/Redis/SQS/EventBridge/Sync, autodiscovery, query layer, MCP).

---

## 3) Repositorio `uxmaltech/core`

## 3.1 Tecnología

- PHP 8.3
- Laravel 11/12
- OpenTelemetry:
  - `open-telemetry/sdk`
  - `open-telemetry/exporter-otlp`
  - `ext-opentelemetry`
- Sentry: `sentry/sentry`
- Infisical: `infisical/php-sdk`
- `laravel/sanctum`
- `veelasky/laravel-hashid`

## 3.2 Rol arquitectónico

`core` es la **base compartida** del ecosistema. No es un producto final de negocio, sino infraestructura reusable:

- Instrumentación y telemetría.
- Comandos de sincronización de entorno/proyecto.
- Resolución de secretos para servicios.
- Funciones/helpers transversales.

## 3.3 Componentes clave

- `src/CoreServiceProvider.php`
  - Registra comandos de entorno.
  - Publica config `uxmaltech.php`.
- `src/OpenTelemetryServiceProvider.php`
  - Inicializa tracer, exporter, sampler, span processor.
  - Instrumenta eventos de Laravel (routes, DB, cache, queue, HTTP client, exceptions, broadcast).
- `src/Environment/EnvironmentConfiguration.php`
  - Lee `uxmaltech.environment.packages` y `uxmaltech.environment.services`.
- `src/Environment/ComposerSynchronizer.php`
  - Reescribe `repositories` en `composer.json`.
  - Ejecuta `composer require` por paquete/branch.
- `src/Environment/DockerComposeGenerator.php`
  - Genera `docker-compose.yaml` a partir de la configuración.
  - Procesa `env_file`, secretos inline y archivos.
- `src/Console/SetComposerJsonCommand.php`
  - Comando: `uxmaltech:core:set-composer-json`.
- `src/Console/CreateDockerFileCommand.php`
  - Comando: `uxmaltech:create-docker-file`.

## 3.4 Flujo operacional típico

1. Definir paquetes y servicios en `config/uxmaltech.php`.
2. Ejecutar sincronización de composer (repos + alias de branch).
3. Generar `docker-compose.yaml` desde servicios definidos.
4. Levantar stack local con secretos resueltos.

## 3.5 Dependencias

- Dependencias internas `uxmaltech/*`: ninguna directa.
- Consumidores principales:
  - `backoffice-ui`
  - `backend-cbq`

## 3.6 Observaciones importantes

- Hay referencias documentales con comandos antiguos (`uxmaltech:set-composer-json`) vs implementación actual (`uxmaltech:core:set-composer-json`).
- `core` concentra la política de observabilidad; los demás repos deben alinearse a este tracer cuando se ejecuten juntos.

---

## 4) Repositorio `uxmaltech/auth`

## 4.1 Tecnología

- PHP 8.2+
- Laravel 11/12
- Livewire v3
- Sanctum
- Socialite (Google OAuth)
- Laratrust
- Predis
- `uxmaltech/backoffice-ui`

## 4.2 Rol arquitectónico

`auth` es el módulo de **identidad y autorización centralizada** para aplicaciones Laravel del ecosistema.

Cubre:

- Login federado (Google OAuth).
- Gestión de tokens personales (Sanctum).
- Roles y permisos (Laratrust).
- Panel administrativo de autorización.
- Tokens para nodos/aplicaciones internas.

## 4.3 Componentes clave

- `src/UxmalAuthServiceProvider.php`
  - Registra comandos Artisan del paquete.
  - Alias middleware `uxmal-api-token`.
  - Carga rutas web/api.
  - Publica config, vistas, assets, SCSS, Livewire, migraciones.
- Rutas y API
  - Base de API configurable (`config/uxmaltech-auth.php`).
  - Middleware típico de endpoints de autorización:
    - `api`
    - `auth:sanctum`
    - `uxmal-api-token`
    - rol administrativo (`authorization-api-admin`).
- Comandos relevantes
  - Instalación del paquete/migraciones.
  - Creación de super-admin.
  - Emisión/rotación de token de aplicación.
  - Prueba de bearer token para rutas.

## 4.4 Flujo funcional resumido

1. Instalación/publicación de recursos.
2. Migraciones para usuarios/roles/permisos/tokens.
3. Alta de super-admin.
4. Login Google -> sesión -> token Sanctum.
5. Uso de API de autorización para asignar/revocar roles/permisos.

## 4.5 Dependencias

- Directa:
  - `uxmaltech/backoffice-ui`
- Transitiva:
  - `uxmaltech/core` (vía `backoffice-ui`)

## 4.6 Integración con el resto

- Entrega autenticación/autorización que consumen apps construidas con `backoffice-ui`.
- Puede convivir con `backend-cbq` en aplicaciones donde comandos/queries requieren contexto autenticado.

---

## 5) Repositorio `uxmaltech/backoffice-ui`

## 5.1 Tecnología

- Paquete Laravel (PHP)
- Runtime frontend en JavaScript/SCSS
- Vite
- Livewire
- Librerías JS de UI/estado (MobX, Bootstrap, FullCalendar, etc.)

## 5.2 Rol arquitectónico

`backoffice-ui` define un **framework de interfaz administrativa reactiva** para Laravel.

Su núcleo es BOUI:

- Objeto global `window.boui`.
- Registro e inicialización de componentes por atributos `data-uxmal-*`.
- Estado central en cliente.
- Integración con Livewire.
- API `boui.cbq(...)` para invocar rutas de backend/CBQ.

## 5.3 Componentes clave

- `src/UxmalBackofficeUIServiceProvider.php`
  - Registra colecciones/singletons de formularios, modales, endpoints, layouts.
  - Publica config/assets.
  - Carga rutas, migraciones, vistas.
  - Inyecta middleware de destinos en grupo `web`.
- `resources/js/boui/index.js`
  - Secuencia de boot de BOUI.
  - Inicializa componentes, layouts, acciones, lazy CSS, hooks Livewire.
- `resources/js/boui/backoffice-ui.js`
  - API pública (`get`, `getAll`, `waitFor`, `dispatch`, `alert`, `toast`, `cbq`, `initializeComponent*`, websocket).
- `src/Functions.php`
  - Helpers como `api_route(...)` para resolver destinos registrados.

## 5.4 Flujo runtime simplificado

1. Carga de bundles BOUI (`dist/*`).
2. `DOMContentLoaded` inicia estado, componentes, layouts y acciones.
3. Exposición de `window.boui` (según modo de build).
4. UI invoca `boui.cbq(route, params, payload, config)`.
5. Se consume endpoint backend y se rehidratan componentes según eventos.

## 5.5 Dependencias

- Directa:
  - `uxmaltech/core`
- Integración funcional:
  - `backend-cbq` para comandos/queries remotos o locales.

## 5.6 Rol en el ecosistema

Es la capa de presentación estándar para backoffice, diseñada para que los equipos de backend puedan construir interfaces reactivas sin desarrollar un frontend totalmente separado.

---

## 6) Repositorio `uxmaltech/backend-cbq`

## 6.1 Tecnología

- PHP 8.2/8.3
- Laravel 11/12
- Drivers:
  - Kafka (`ext-rdkafka`)
  - Redis (`predis/predis`)
  - SQS/EventBridge (AWS SDK)
  - Sync (in-process)
- OpenTelemetry + Sentry
- MCP (`laravel/mcp`)
- Dependencia directa de `uxmaltech/core`

## 6.2 Rol arquitectónico

`backend-cbq` implementa una capa **Command/Query Broker** para desacoplar invocación HTTP de ejecución de handlers y mensajería.

Características centrales:

- Registro declarativo por atributos:
  - `#[RegisterCommand]`
  - `#[RegisterQuery]`
- Resolución de broker por patrones (`handles`).
- Ejecución sync/async.
- Soporte local/remoto con autodiscovery.
- Trazabilidad con OpenTelemetry.

## 6.3 Componentes clave

- `src/UxmalBackendServiceProvider.php`
  - Registra servicios de comandos/queries/fifo/mcp tools.
  - Registra capa Query modular (`QueryDispatcher`, builders, executors).
  - Expone endpoints fijos:
    - `/uxmal/routes`
    - `/cbq/commands`
    - `/cbq/queries`
    - `/cbq/tools`
- `src/Helpers/RegisterCmdQry.php`
  - Escanea directorios y registra rutas/metadata según atributos.
- `src/Controllers/CBQToBrokerController.php`
  - Entrada principal para comandos.
  - Construye `CBQMessage`.
  - Selecciona driver/broker.
  - Gestiona payload, auth, trazas y dispatch.
- `src/CBQ.php`
  - Facade helper para uso programático:
    - `CBQ::command(...)`
    - `CBQ::query(...)`
- `src/Query/*`
  - Arquitectura moderna por capas:
    - `Execution` (local vs remoto)
    - `Builders` (where/order/search/with/etc.)
    - `Responses`
    - `Model`.
- `src/Helpers/CBQAutodiscovery.php`
  - Descubre handlers en endpoints remotos configurados.
- `config/uxmaltech.php`
  - Configuración de brokers, autodiscovery, timeouts, multithreading, app key, MCP.

## 6.4 Drivers soportados (implementación)

- `KafkaDriver`
  - Producción/consumo con `ProducerBuilder` y `ConsumerBuilder`.
  - Soporte de seguridad (`PLAINTEXT`, `SASL_SSL`, `MSK_IAM_SASL` según config).
- `RedisDriver`
  - Cola Redis con consumo bloqueante y manejo de reconexión.
- `SQSDriver`
  - Envío/recepción en colas AWS SQS (STD/FIFO).
- `EventBridgeDriver`
  - Publicación de eventos hacia EventBridge.
- `SyncDriver`
  - Ejecución en proceso para escenarios de desarrollo/test.

## 6.5 Autodiscovery y ejecución remota

- Endpoints de discovery expuestos por cada servicio CBQ:
  - `GET /cbq/commands`
  - `GET /cbq/queries`
- Cliente remoto construye request con `X-APP-KEY`.
- Si un query/comando no existe localmente, puede resolverse remotamente.
- `QueryDispatcher` decide entre `LocalQueryExecutor` y `RemoteQueryExecutor`.

## 6.6 Integración MCP

- `src/MCP/Server.php` extiende `Laravel\Mcp\Server`.
- Publica herramientas registradas en runtime (`RegisteredMCPTools`).
- Configuración en `uxmaltech.cbq.mcp-server.*`.

## 6.7 Dependencias

- Directa:
  - `uxmaltech/core`
- Integración funcional:
  - `backoffice-ui` consume rutas/contratos CBQ desde frontend.
  - `auth` puede aportar middleware/contexto de autenticación de app consumidora.

---

## 7) Flujos inter-repositorio (end-to-end)

## 7.1 Flujo UI -> CBQ -> handler

1. Usuario interactúa con componente BOUI en `backoffice-ui`.
2. Cliente llama `boui.cbq(...)`.
3. Request llega a endpoint registrado por `backend-cbq` (`RegisterCmdQry`).
4. `CBQToBrokerController` valida payload/auth, crea `CBQMessage` y selecciona broker.
5. Driver envía y/o procesa comando/query.
6. Respuesta vuelve a UI; BOUI actualiza estado/componentes.

## 7.2 Flujo de autenticación/autorización

1. App integra `auth`.
2. Usuario inicia sesión (Google OAuth o flujo habilitado).
3. Sanctum emite token de sesión/API.
4. Middleware y roles Laratrust controlan acceso a endpoints/panel.
5. `backoffice-ui` renderiza paneles/acciones según permisos.

## 7.3 Flujo de observabilidad

1. `core` inicializa OpenTelemetry provider.
2. HTTP span raíz se crea al entrar request.
3. `backend-cbq` crea spans de productor/mensajería y propaga contexto.
4. Consumidores/handlers continúan trazabilidad.
5. Exportador OTLP envía datos al collector.

## 7.4 Flujo de bootstrap de entorno

1. Definir paquetes/servicios en `config/uxmaltech.php` (core).
2. Ejecutar sync de `composer.json`.
3. Generar `docker-compose.yaml`.
4. Levantar servicios de infraestructura y app.

---

## 8) Contratos y puntos de acoplamiento

## 8.1 Contratos clave

- Nombres de comando/query (`cmd.*`, `qry.*`) y rutas registradas.
- Middleware de seguridad (`auth:sanctum`, `AppKeyAuth`, etc.).
- Estructura de payload de `CBQMessage`.
- Endpoints de discovery (`/cbq/commands`, `/cbq/queries`).
- Convenciones de headers (`X-APP-KEY`, bearer token, trace context).

## 8.2 Acoplamientos críticos

- `auth` depende de `backoffice-ui` para panel/UI.
- `backoffice-ui` depende de `core` y consume APIs CBQ.
- `backend-cbq` depende de `core` para base común/observabilidad.
- Configuración compartida `uxmaltech.php` en varios paquetes requiere control de colisiones y estandarización por aplicación host.

---

## 9) Riesgos y consideraciones para otro modelo

1. Hay diferencias entre documentación y código en algunos comandos/nombres de clase; validar siempre contra implementación actual.
2. `backend-cbq` ha evolucionado: la arquitectura de Query modular (`Execution/Builders/Responses/Model`) es la referencia actual.
3. Entorno `local` puede remover middlewares de auth en registro dinámico de rutas para facilitar desarrollo.
4. La calidad de trazas depende de que `core` y `backend-cbq` compartan configuración OTEL consistente.
5. El comportamiento real de broker depende de `config/uxmaltech.php` del proyecto consumidor, no solo del paquete.

---

## 10) Guía rápida para onboarding de otro modelo

Para entender y modificar este ecosistema, el orden recomendado es:

1. Leer `core` (`CoreServiceProvider`, `OpenTelemetryServiceProvider`, `Environment/*`).
2. Leer `backend-cbq` (`UxmalBackendServiceProvider`, `CBQToBrokerController`, `RegisterCmdQry`, `config/uxmaltech.php`, `Query/*`).
3. Leer `backoffice-ui` (`UxmalBackofficeUIServiceProvider`, `resources/js/boui/index.js`, `backoffice-ui.js`).
4. Leer `auth` (`UxmalAuthServiceProvider`, rutas/api docs, comandos de instalación/token).
5. Revisar app consumidora para confirmar:
   - composición de providers,
   - configuración final de `uxmaltech.php`,
   - middleware efectivo en rutas,
   - broker activo y endpoints remotos.

---

## 11) Resumen ejecutivo

- `core` = base técnica compartida (observabilidad + entorno).
- `auth` = identidad/autorización centralizada.
- `backoffice-ui` = capa UI reactiva para backoffice.
- `backend-cbq` = orquestación de comandos/queries sobre brokers y servicios remotos.

La arquitectura está orientada a:

- desacoplar UI, autorización y procesamiento backend,
- habilitar escalamiento por brokers/autodiscovery,
- mantener trazabilidad end-to-end con OpenTelemetry,
- estandarizar setup de proyectos vía `core`.
