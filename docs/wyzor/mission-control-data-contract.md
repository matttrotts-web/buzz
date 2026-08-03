# Wyzor Mission Control data contract

Mission Control is a projection over Wyzor's business systems and signed agent
events. It is not an ERP or CRM database.

## Ownership

| Domain | Authoritative source | Agent projection |
| --- | --- | --- |
| ERP, CRM, sales records, orders, invoices | Odoo | KITT may summarize GTM and sales activity |
| Specs, runbooks, briefs, decisions | Notion or the owning repository | Relevant agents may link and summarize |
| Operational jobs, evidence, incidents | Owning Wyzor service | Argus publishes signed observations and handoffs |
| METRC ERP and operational database health | Wyzor PostgreSQL | Argus publishes bounded aggregate health snapshots |
| Review, promotion, deployment gates | Wyzor gate ledger | Riggs publishes signed verdicts |
| Human approval | Matt under the applicable gate policy | No agent may impersonate or bypass it |

## Normalized envelope

Adapters and agents should publish this logical envelope. Version 1 may be
encoded in a channel message; a dedicated event kind can be introduced after
the contract stabilizes.

```json
{
  "schema_version": 1,
  "source": "odoo | notion | kitt | argus | riggs",
  "domain": "erp | crm | gtm | sales | ops | gate",
  "authority": "system_of_record | projection | decision",
  "record_id": "stable source identifier",
  "occurred_at": "RFC 3339 timestamp",
  "status": "source-specific normalized status",
  "summary": "human-readable event summary",
  "source_url": "optional deep link",
  "payload_sha256": "optional hash of the canonical source payload"
}
```

Agents publish only within their lane:

- Argus: `ops` projections and evidence references.
- Riggs: `gate` decisions.
- KITT: `gtm` and `sales` projections.

Executive summaries, standups, news, and decisions use the stricter signed
envelope in [executive-update-contract.md](executive-update-contract.md).

Odoo and Notion adapters run server-side. Their credentials must not be stored
in the desktop app, a channel message, an agent definition, or a deployment
manifest.

## CRM snapshot projection

KITT publishes the compact `WYZOR_CRM_SNAPSHOT_V1` envelope to the private
`crm-ops` channel. Mission Control accepts it only when the Nostr event is
signed by the currently registered KITT identity. The envelope must declare
`source: "odoo"` and `authority: "projection"`; KITT cannot claim to be the
system of record.

The snapshot contains aggregate lead, opportunity, pipeline, and overdue
activity counts; a bounded stage summary; and at most eight top opportunities.
It contains no contact email, phone number, credential, access token, or raw
Odoo payload. HTTPS Odoo deployments may include record deep links. A loopback
Odoo deployment emits `null` links because a desktop cannot safely resolve the
server's loopback address.

Snapshots older than 24 hours remain visible but are labeled stale. Missing,
malformed, untrusted, wrong-lane, unsafe-link, and false-authority envelopes
fail closed and do not affect the dashboard.

## Database operations projection

Argus publishes `WYZOR_DB_SNAPSHOT_V1` to the private `data-ops` channel from a
server-side adapter authenticated with a dedicated read-only PostgreSQL role.
Mission Control accepts this envelope only from the currently registered Argus
identity and labels it stale after one hour.

The envelope contains only allowlisted aggregate counts for agent jobs, crawl
runs, gates, integration health, inventory, METRC mismatches, plants, transfers,
and sales orders. It contains no customer row, contact field, record identifier,
credential, database URL, arbitrary query result, or raw JSON column. The
adapter enforces a read-only transaction and a statement timeout. Missing,
malformed, untrusted, false-authority, and negative-count envelopes fail closed.

## Remote Hermes deployment

The bundled `buzz-backend-wyzor-hermes` provider prepares a private deployment
bundle containing:

- the agent's Nostr identity and relay configuration;
- a `buzz-acp` systemd unit;
- the configured Hermes ACP command;
- a public manifest without the Nostr private key.

The bot build must expose an ACP command (default:
`/usr/local/bin/hermes-acp`). After it exists on the bot host, securely transfer
the matching bundle and run `sudo ./install.sh`.
