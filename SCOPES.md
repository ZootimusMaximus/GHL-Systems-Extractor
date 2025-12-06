# OAuth Scope Checklist

The exporter depends on configuration-level permissions only. Grant your OAuth app or Private Integration the following read-only scopes so it can pull everything that does *not* include PII.

| Scope | Endpoint Coverage |
| --- | --- |
| `workflows.readonly` | `/workflows/?locationId=...&include=triggers` |
| `funnels.funnel.readonly` | `/funnels/funnel/list`, `/funnels/funnel/{id}` |
| `funnels.page.readonly` | `/funnels/page/list`, `/funnels/page/{pageId}` |
| `funnels.pagecount.readonly` | `/funnels/pagecount` |
| `funnels.redirect.readonly` | `/funnels/redirect/list` |
| `forms.readonly` | `/forms/?locationId=...` |
| `surveys.readonly` | `/surveys/?locationId=...` |
| `calendars.readonly` | `/calendars/?locationId=...` |
| `calendars/events.readonly` | `/calendars/events?locationId=...` |
| `calendars/groups.readonly` | `/calendars/groups?locationId=...` |
| `calendars/resources.readonly` | `/calendars/resources?locationId=...` |
| `locations.readonly` | `/locations/{locationId}` |
| `locations/customValues.readonly` | `/locations/{locationId}/customValues` |
| `locations/customFields.readonly` | `/locations/{locationId}/customFields` |
| `locations/tags.readonly` | `/locations/{locationId}/tags` |
| `locations/templates.readonly` | `/locations/{locationId}/templates` |
| `medias.readonly` | `/medias/?locationId=...` |
| `emails.builder.readonly` | `/emails/builder/templates?locationId=...` |
| `emails.schedule.readonly` | `/emails/schedule?locationId=...` |
| `knowledge-bases.readonly` | `/knowledge-bases/?locationId=...` |
| `conversation-ai.readonly` | `/conversation-ai/models?locationId=...` |
| `agent-studio.readonly` | `/agent-studio/agents?locationId=...` |
| `products.readonly` | `/products/?locationId=...` |
| `products.prices.readonly` | `/products/prices?locationId=...` |
| `products.collection.readonly` | `/products/collections?locationId=...` |
| `payments.orders.readonly` | `/payments/orders?locationId=...` |
| `payments.transactions.readonly` | `/payments/transactions?locationId=...` |
| `payments.subscriptions.readonly` | `/payments/subscriptions?locationId=...` |
| `payments.coupons.readonly` | `/payments/coupons?locationId=...` |
| `links.readonly` | `/links/?locationId=...` |
| `opportunities.pipelines.readonly` | `/opportunities/pipelines?locationId=...` |

> **Note:** Avoid scopes such as `contacts.*`, `conversations.*`, `tasks.*`, `payments.*` tied to individuals, or any scope that reads message history or personal data. Keeping to the scopes above guarantees the exporter only touches configuration-level assets.
