#!/usr/bin/env bash
set -euo pipefail

required_files=(
  desktop/src/features/mission-control/crmModel.ts
  desktop/src/features/mission-control/dbModel.ts
  desktop/src/features/mission-control/ui/MissionControlScreen.tsx
  docs/wyzor/mission-control-data-contract.md
)

for file in "${required_files[@]}"; do
  test -f "$file" || {
    echo "missing Wyzor integration seam: $file" >&2
    exit 1
  }
done

grep -Fq 'WYZOR_CRM_SNAPSHOT_V1' desktop/src/features/mission-control/crmModel.ts
grep -Fq 'WYZOR_DB_SNAPSHOT_V1' desktop/src/features/mission-control/dbModel.ts
grep -Fq 'channelNamesMatch(channel.name, "crm-ops")' desktop/src/features/mission-control/ui/MissionControlScreen.tsx
grep -Fq 'channelNamesMatch(channel.name, "data-ops")' desktop/src/features/mission-control/ui/MissionControlScreen.tsx

if grep -RIEq '(ODOO_PASSWORD|DATABASE_URL|POSTGRES_PASSWORD|PRIVATE_KEY)=' \
  desktop/src desktop/src-tauri/tauri.conf.json; then
  echo "desktop source contains a server credential assignment" >&2
  exit 1
fi

echo "Wyzor CRM and database integration seams are preserved"
