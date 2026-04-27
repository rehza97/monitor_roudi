# Firestore Schema

This project should use a small set of canonical root collections. Do not
create one collection per page or per widget.

## Root collections

- `organizations`
  - Tenant / client account.
  - Example fields: `displayName`, `status`, `createdAt`
- `users`
  - Staff and client users.
  - Example fields: `name`, `email`, `role`, `organizationId`, `active`, `createdAt`
- `catalog_products`
  - Product catalog definitions keyed by stable slug.
  - Example fields: `slug`, `name`, `category`, `version`, `active`
- `deployments`
  - A product deployed for one organization.
  - Example fields: `organizationId`, `productSlug`, `environment`, `health`, `cpu`, `ram`, `requests`, `updatedAt`
- `invoices`
  - Billing rows scoped to one organization.
  - Example fields: `organizationId`, `status`, `amount`, `issuedAt`, `dueAt`
- `orders`
  - Scoped by `organizationId` (use `platform` for internal admin-only rows).
  - `kind`: `client_request` (demandes — `/admin/requests`) or `material_supply` (commandes matériel).
  - Demande: `clientLabel`, `clientEmail`, `requestType`, `budgetLabel`, `description`, `timelineLabel`, `priority`, `status`, `adminComment`, …
  - Matériel: `materialName`, `quantity`, `supplier`, `notes`, `status`, …
- `support_tickets`
  - Support issues scoped to one organization.
  - Example fields: `organizationId`, `createdByUserId`, `assigneeUserId`, `priority`, `status`, `createdAt`, `updatedAt`
- `notifications`
  - Per-user notifications.
  - Example fields: `userId`, `organizationId`, `kind`, `read`, `createdAt`
- `activity_events`
  - Audit / history feed.
  - Example fields: `organizationId`, `actorUserId`, `category`, `createdAt`
- `tasks`
  - Internal engineer / technician work items.
  - Example fields: `assigneeUserId`, `organizationId`, `priority`, `status`, `dueAt`
- `inventory_items`
  - Stock matériel (Gestion des Matériels).
  - Example fields: `sku`, `name`, `category`, `stock`, `threshold`, `location`, `priceDisplay`, `createdAt`, `updatedAt`
- `conversations`
  - Messaging threads.
  - Example fields: `participantIds`, `organizationId`, `lastMessageAt`, `lastMessageText`
- `stack_services`
  - Global internal stack monitoring rows.
  - Use this only for internal infra monitoring, not customer deployments.
- `engineers`
  - Admin “Gestion des ingénieurs” roster (directory), separate from Auth `users` until linked.
  - Example fields: `name`, `email`, `specialty`, `status`, `projects`, `linkedUserId`, `createdAt`, `updatedAt`

## Subcollections

- `conversations/{conversationId}/messages`
  - Thread messages.
  - Example fields: `senderUserId`, `body`, `createdAt`
- `deployments/{deploymentId}/components`
  - Optional detailed technical components for one deployment.
  - Example fields: `name`, `health`, `latencyMs`, `cpu`, `mem`, `updatedAt`

## Optional later collections

These are not part of the MVP Firestore contract and should only be added if
the app needs server-side editing:

- `field_service_clients`

## Modeling rules

- Use document IDs and references, not repeated display strings.
- Keep `productSlug` stable and map UI labels in the app.
- Keep deployment health canonical: `ok`, `degraded`, `down`, `stopped`.
- Keep engineer stack health separate from customer deployment health.
- Store timestamps as Firestore `Timestamp`, not formatted strings.
- Store numeric metrics as numbers, not strings, except preformatted display-only
  values that are not queried.
