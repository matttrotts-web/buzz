/// Service name for the desktop OS keyring. Debug builds default to a distinct
/// service, while standalone worktree launches may request a scoped dev service.
const PRODUCTION_KEYRING_SERVICE: &str = "wyzor-ops-mesh";
const DEV_KEYRING_SERVICE: &str = "wyzor-ops-mesh-dev";

fn dev_keyring_service(configured: Option<String>) -> String {
    configured
        .filter(|service| service.starts_with("wyzor-ops-mesh-dev."))
        .unwrap_or_else(|| DEV_KEYRING_SERVICE.to_string())
}

pub(crate) fn keyring_service() -> &'static str {
    if cfg!(debug_assertions) {
        static DEV_SERVICE: std::sync::OnceLock<String> = std::sync::OnceLock::new();
        DEV_SERVICE
            .get_or_init(|| {
                dev_keyring_service(std::env::var("WYZOR_OPS_MESH_DEV_KEYRING_SERVICE").ok())
            })
            .as_str()
    } else {
        PRODUCTION_KEYRING_SERVICE
    }
}

pub(super) fn migration_marker_name(service: &str, default_name: &str) -> String {
    if service == PRODUCTION_KEYRING_SERVICE || service == DEV_KEYRING_SERVICE {
        default_name.to_string()
    } else {
        format!("identity.{service}.migrated")
    }
}

#[cfg(test)]
mod tests {
    use super::{
        dev_keyring_service, migration_marker_name, DEV_KEYRING_SERVICE, PRODUCTION_KEYRING_SERVICE,
    };

    #[test]
    fn wyzor_keyring_service_does_not_collide_with_buzz() {
        assert_eq!(PRODUCTION_KEYRING_SERVICE, "wyzor-ops-mesh");
        assert_ne!(PRODUCTION_KEYRING_SERVICE, "buzz-desktop");
        assert_eq!(dev_keyring_service(None), DEV_KEYRING_SERVICE);
        assert_ne!(dev_keyring_service(None), "buzz-desktop-dev");
    }

    #[test]
    fn standalone_scope_must_remain_under_dev_service() {
        assert_eq!(
            dev_keyring_service(Some("wyzor-ops-mesh-dev.example".to_string())),
            "wyzor-ops-mesh-dev.example"
        );
        assert_eq!(
            dev_keyring_service(Some("buzz-desktop".to_string())),
            DEV_KEYRING_SERVICE
        );
    }

    #[test]
    fn standalone_scope_uses_its_own_migration_marker() {
        assert_eq!(
            migration_marker_name(PRODUCTION_KEYRING_SERVICE, "identity.migrated"),
            "identity.migrated"
        );
        assert_eq!(
            migration_marker_name(DEV_KEYRING_SERVICE, "identity.migrated"),
            "identity.migrated"
        );
        assert_eq!(
            migration_marker_name("wyzor-ops-mesh-dev.example", "identity.migrated"),
            "identity.wyzor-ops-mesh-dev.example.migrated"
        );
    }
}
