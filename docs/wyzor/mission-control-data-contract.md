# Wyzor Mission Control data contract

Mission Control is a projection over Wyzor's business systems and signed agent
events. It is not an ERP or CRM database.

## Ownership

| Domain | Authoritative source | Agent projection |
| --- | --- | --- |
| ERP, CRM, sales records, orders, invoices | Odoo | KITT may summarize GTM and sales activity |
| Specs, runbooks, briefs, decisions | Notion or the owning repository | Relevant agents may link and summarize |
| Operational jobs, evidence, incidents | Owning Wyzor service | Argus publishes signed observations and handoffs |
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
