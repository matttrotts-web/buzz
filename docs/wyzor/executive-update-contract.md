# Wyzor executive update contract

Mission Control projects leadership updates from ordinary signed Buzz channel
messages while the contract stabilizes. It does not scrape prose or accept an
agent name written in message content.

## Trust rules

An update is displayed only when all of these are true:

1. the Nostr event signature was accepted by the relay;
2. the event signer pubkey is the currently registered Argus, KITT, or Riggs
   identity;
3. the payload is valid version 1 JSON;
4. the signed lane matches the identity: KITT → `gtm`, Argus → `ops`, and
   Riggs → `riggs`; and
5. the message mentions the owner identity so it enters the current desktop
   home-feed projection.

Malformed, unsigned, unknown, mismatched, or ordinary chat content is ignored.
Missing data is shown as missing rather than inferred.

## Message encoding

The human-readable briefing may come first. The final portion of the message
must be the exact sentinel on its own line followed by one JSON object:

```text
Morning brief: two qualified accounts need decisions today.

WYZOR_EXEC_UPDATE_V1
{"schema_version":1,"lane":"gtm","type":"standup","period":"morning","health":"at-risk","title":"Revenue opening","summary":"Two qualified accounts need Matt decisions.","highlights":["One account moved to discovery"],"risks":["Pricing answer is waiting"],"asks":["Approve the discovery call"]}
```

No content may follow the JSON object.

## Schema

| Field | Required | Values or limit |
| --- | --- | --- |
| `schema_version` | yes | integer `1` |
| `lane` | yes | `gtm`, `ops`, `riggs` |
| `type` | yes | `standup`, `news`, `decision` |
| `period` | for standup | `morning`, `afternoon`, `evening` |
| `health` | no | `on-track`, `at-risk`, `blocked`; defaults to `on-track` |
| `title` | yes | non-empty string, 120 characters projected |
| `summary` | yes | non-empty string, 1,200 characters projected |
| `highlights` | no | up to 8 strings, 240 characters each |
| `risks` | no | up to 8 strings, 240 characters each |
| `asks` | no | up to 8 strings, 240 characters each |

## Cadence

- KITT publishes GTM/CoS morning, afternoon, and evening standups plus public
  market/news signals.
- Argus publishes Ops/readiness standups and verified operating news.
- Riggs publishes verification/release-risk standups and decision events.

Each agent publishes from its own durable native Hermes identity. KITT may
synthesize the human briefing, but it may not impersonate or manufacture an
Argus or Riggs envelope.

## Authority

These events are read-model projections. They do not mutate CRM, Jira, email,
calendar, deployment, or Production. An `asks` entry is a request for a human
decision, not an executable approval.
