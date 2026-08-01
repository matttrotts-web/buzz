use serde::Deserialize;
use serde_json::{json, Value};
use std::{
    env,
    fs::{self, OpenOptions},
    io::{self, Read, Write},
    path::{Path, PathBuf},
};

const MAX_REQUEST_BYTES: u64 = 1_048_576;

#[derive(Debug, Deserialize)]
struct ProviderRequest {
    op: String,
    #[serde(default)]
    request_id: String,
    #[serde(default)]
    agent: Value,
    #[serde(default)]
    provider_config: ProviderConfig,
}

#[derive(Debug, Default, Deserialize)]
struct ProviderConfig {
    #[allow(dead_code)]
    role: Option<String>,
    hermes_command: Option<String>,
    hermes_args: Option<String>,
    hermes_home: Option<String>,
    harness_path: Option<String>,
    deployment_root: Option<String>,
}

#[derive(Debug)]
struct AgentPayload {
    name: String,
    pubkey: String,
    owner_pubkey: String,
    relay_url: String,
    private_key_nsec: String,
    auth_tag: Option<String>,
    model: Option<String>,
    system_prompt: Option<String>,
    parallelism: u64,
    respond_to: String,
    respond_to_allowlist: Vec<String>,
    idle_timeout_seconds: Option<u64>,
    max_turn_duration_seconds: Option<u64>,
}

fn main() {
    let response = run().unwrap_or_else(|error| json!({ "ok": false, "error": error }));
    println!("{response}");
}

fn run() -> Result<Value, String> {
    let mut bytes = Vec::new();
    io::stdin()
        .take(MAX_REQUEST_BYTES + 1)
        .read_to_end(&mut bytes)
        .map_err(|error| format!("failed to read provider request: {error}"))?;
    if bytes.len() as u64 > MAX_REQUEST_BYTES {
        return Err("provider request exceeds 1 MiB".to_string());
    }
    let request: ProviderRequest = serde_json::from_slice(&bytes)
        .map_err(|error| format!("invalid provider request: {error}"))?;

    match request.op.as_str() {
        "info" => Ok(info_response()),
        "deploy" => deploy(request),
        other => Err(format!("unsupported provider operation '{other}'")),
    }
}

fn info_response() -> Value {
    json!({
        "ok": true,
        "name": "Wyzor Hermes",
        "version": env!("CARGO_PKG_VERSION"),
        "description": "Builds a secure buzz-acp deployment bundle for Argus, Riggs, or KITT.",
        "config_schema": {
            "type": "object",
            "properties": {
                "hermes_command": {
                    "type": "string",
                    "title": "Hermes ACP command",
                    "description": "Command installed by the bot build. The host installer verifies it before starting.",
                    "default": "/opt/wyzor-ops-mesh/hermes"
                },
                "hermes_args": {
                    "type": "string",
                    "title": "Hermes ACP arguments",
                    "description": "Comma-separated ACP arguments, if the runtime requires them.",
                    "default": ""
                },
                "hermes_home": {
                    "type": "string",
                    "title": "Hermes home",
                    "description": "Remote working directory. Blank derives /home/<role>/.hermes.",
                    "default": ""
                },
                "harness_path": {
                    "type": "string",
                    "title": "buzz-acp path",
                    "description": "Where buzz-acp will be installed on the remote host.",
                    "default": "/opt/wyzor-ops-mesh/buzz-acp"
                },
                "deployment_root": {
                    "type": "string",
                    "title": "Bundle output directory",
                    "description": "Local directory for transfer-ready bundles. Blank uses the Ops Mesh application-data directory.",
                    "default": ""
                }
            }
        }
    })
}

fn deploy(request: ProviderRequest) -> Result<Value, String> {
    let payload = parse_agent(&request.agent)?;
    let role = deployment_role(&payload.name, request.provider_config.role.as_deref())?;
    let deployment_root = deployment_root(request.provider_config.deployment_root.as_deref())?;
    let bundle_name = format!("{role}-{}", prefix(&payload.pubkey, 12));
    let bundle_dir = deployment_root.join(bundle_name);
    ensure_safe_directory(&deployment_root, &bundle_dir)?;

    let runtime = runtime_layout(role);
    let hermes_home = optional_nonempty(request.provider_config.hermes_home.as_deref())
        .unwrap_or_else(|| runtime.hermes_home.to_string());
    let hermes_command = optional_nonempty(request.provider_config.hermes_command.as_deref())
        .unwrap_or_else(|| "/opt/wyzor-ops-mesh/hermes".to_string());
    let hermes_args = optional_nonempty(request.provider_config.hermes_args.as_deref())
        .unwrap_or_else(|| runtime.hermes_args.to_string());
    let harness_path = optional_nonempty(request.provider_config.harness_path.as_deref())
        .unwrap_or_else(|| "/opt/wyzor-ops-mesh/buzz-acp".to_string());

    reject_control_chars("Hermes arguments", &hermes_args)?;
    validate_remote_path("Hermes home", &hermes_home)?;
    validate_remote_path("Hermes command", &hermes_command)?;
    validate_remote_path("harness path", &harness_path)?;

    let env_file = render_env(role, &payload, &hermes_command, &hermes_args);
    let service_file = render_service(role, runtime.user, &hermes_home, &harness_path);
    let installer = render_installer(role, &hermes_command, &harness_path);
    let manifest = render_manifest(
        &request.request_id,
        role,
        &payload,
        &hermes_home,
        &hermes_command,
        &harness_path,
    );

    write_private(&bundle_dir.join("agent.env"), env_file.as_bytes(), 0o600)?;
    if let Some(prompt) = &payload.system_prompt {
        write_private(
            &bundle_dir.join("system-prompt.txt"),
            prompt.as_bytes(),
            0o600,
        )?;
    }
    write_private(
        &bundle_dir.join("wyzor-ops-mesh-agent.service"),
        service_file.as_bytes(),
        0o644,
    )?;
    write_private(&bundle_dir.join("install.sh"), installer.as_bytes(), 0o700)?;
    write_private(
        &bundle_dir.join("manifest.json"),
        serde_json::to_string_pretty(&manifest)
            .map_err(|error| format!("failed to serialize manifest: {error}"))?
            .as_bytes(),
        0o600,
    )?;
    write_private(
        &bundle_dir.join("README.md"),
        render_readme(role, &payload.name).as_bytes(),
        0o600,
    )?;

    Ok(json!({
        "ok": true,
        "agent_id": format!("wyzor-hermes:{role}:{}", payload.pubkey),
        "bundle_path": bundle_dir,
        "role": role,
        "message": "Transfer this directory to the bot host and run sudo ./install.sh after its Hermes ACP command is installed."
    }))
}

fn parse_agent(value: &Value) -> Result<AgentPayload, String> {
    let required = |key: &str| {
        value
            .get(key)
            .and_then(Value::as_str)
            .filter(|item| !item.trim().is_empty())
            .map(ToOwned::to_owned)
            .ok_or_else(|| format!("agent payload is missing '{key}'"))
    };
    let payload = AgentPayload {
        name: required("name")?,
        pubkey: required("pubkey")?,
        owner_pubkey: required("owner_pubkey")?,
        relay_url: required("relay_url")?,
        private_key_nsec: required("private_key_nsec")?,
        auth_tag: value
            .get("auth_tag")
            .and_then(Value::as_str)
            .map(ToOwned::to_owned),
        model: value
            .get("model")
            .and_then(Value::as_str)
            .map(ToOwned::to_owned),
        system_prompt: value
            .get("system_prompt")
            .and_then(Value::as_str)
            .map(ToOwned::to_owned),
        parallelism: value
            .get("parallelism")
            .and_then(Value::as_u64)
            .unwrap_or(1),
        respond_to: value
            .get("respond_to")
            .and_then(Value::as_str)
            .unwrap_or("owner-only")
            .to_string(),
        respond_to_allowlist: value
            .get("respond_to_allowlist")
            .and_then(Value::as_array)
            .into_iter()
            .flatten()
            .filter_map(Value::as_str)
            .map(ToOwned::to_owned)
            .collect(),
        idle_timeout_seconds: value.get("idle_timeout_seconds").and_then(Value::as_u64),
        max_turn_duration_seconds: value
            .get("max_turn_duration_seconds")
            .and_then(Value::as_u64),
    };
    for (label, item) in [
        ("agent name", payload.name.as_str()),
        ("agent pubkey", payload.pubkey.as_str()),
        ("owner pubkey", payload.owner_pubkey.as_str()),
        ("relay URL", payload.relay_url.as_str()),
        ("private key", payload.private_key_nsec.as_str()),
        ("respond-to mode", payload.respond_to.as_str()),
    ] {
        reject_control_chars(label, item)?;
    }
    for (label, item) in [
        ("auth tag", payload.auth_tag.as_deref()),
        ("model", payload.model.as_deref()),
    ] {
        if let Some(item) = item {
            reject_control_chars(label, item)?;
        }
    }
    for pubkey in &payload.respond_to_allowlist {
        reject_control_chars("respond-to allowlist entry", pubkey)?;
    }
    Ok(payload)
}

fn normalize_role(role: Option<&str>) -> Result<&'static str, String> {
    match role.map(str::trim).map(str::to_ascii_lowercase).as_deref() {
        Some("argus") => Ok("argus"),
        Some("riggs") => Ok("riggs"),
        Some("kitt") => Ok("kitt"),
        _ => Err("role must be one of: argus, riggs, kitt".to_string()),
    }
}

fn deployment_role(
    agent_name: &str,
    _configured_role: Option<&str>,
) -> Result<&'static str, String> {
    // The record name is the durable Wyzor identity. The separate provider
    // field was a second source of truth and could silently retain "argus"
    // while the user created Riggs or KITT.
    normalize_role(Some(agent_name))
}

struct RuntimeLayout {
    user: &'static str,
    hermes_home: &'static str,
    hermes_args: &'static str,
}

fn runtime_layout(role: &str) -> RuntimeLayout {
    match role {
        "kitt" => RuntimeLayout {
            user: "hermes",
            hermes_home: "/home/hermes/.hermes",
            hermes_args: "--profile,kitt,acp",
        },
        "riggs" => RuntimeLayout {
            user: "riggs",
            hermes_home: "/home/riggs/.hermes",
            hermes_args: "",
        },
        _ => RuntimeLayout {
            user: "argus",
            hermes_home: "/home/argus/.hermes",
            hermes_args: "",
        },
    }
}

fn deployment_root(configured: Option<&str>) -> Result<PathBuf, String> {
    if let Some(path) = optional_nonempty(configured) {
        return absolute_path(&path);
    }
    if let Some(path) = env::var_os("WYZOR_OPS_MESH_DEPLOYMENTS") {
        return absolute_path(&path.to_string_lossy());
    }
    let home = env::var_os("HOME").ok_or("HOME is unavailable; set deployment_root")?;
    Ok(PathBuf::from(home).join(".local/share/wyzor-ops-mesh/deployments"))
}

fn absolute_path(path: &str) -> Result<PathBuf, String> {
    let value = PathBuf::from(path);
    if !value.is_absolute() {
        return Err("deployment_root must be an absolute path".to_string());
    }
    Ok(value)
}

fn validate_remote_path(label: &str, value: &str) -> Result<(), String> {
    reject_control_chars(label, value)?;
    if !value.starts_with('/') {
        return Err(format!("{label} must be an absolute path"));
    }
    if !value
        .chars()
        .all(|character| character.is_ascii_alphanumeric() || "/._-".contains(character))
    {
        return Err(format!(
            "{label} may contain only letters, numbers, '/', '.', '_', and '-'"
        ));
    }
    if Path::new(value)
        .components()
        .any(|component| matches!(component, std::path::Component::ParentDir))
    {
        return Err(format!("{label} may not contain '..'"));
    }
    Ok(())
}

fn ensure_safe_directory(root: &Path, bundle: &Path) -> Result<(), String> {
    fs::create_dir_all(root)
        .map_err(|error| format!("failed to create deployment root: {error}"))?;
    if fs::symlink_metadata(root)
        .map(|metadata| metadata.file_type().is_symlink())
        .unwrap_or(false)
    {
        return Err("deployment_root may not be a symlink".to_string());
    }
    if bundle.exists()
        && fs::symlink_metadata(bundle)
            .map(|metadata| metadata.file_type().is_symlink())
            .unwrap_or(false)
    {
        return Err("deployment bundle may not be a symlink".to_string());
    }
    fs::create_dir_all(bundle)
        .map_err(|error| format!("failed to create deployment bundle: {error}"))?;
    set_mode(bundle, 0o700)?;
    Ok(())
}

fn render_env(
    role: &str,
    payload: &AgentPayload,
    hermes_command: &str,
    hermes_args: &str,
) -> String {
    let mut lines = vec![
        env_line("BUZZ_RELAY_URL", &payload.relay_url),
        env_line("BUZZ_PRIVATE_KEY", &payload.private_key_nsec),
        env_line("BUZZ_ACP_AGENT_OWNER", &payload.owner_pubkey),
        env_line("BUZZ_ACP_AGENT_COMMAND", hermes_command),
        env_line("BUZZ_ACP_AGENT_ARGS", hermes_args),
        env_line("BUZZ_ACP_RESPOND_TO", &payload.respond_to),
        env_line("BUZZ_ACP_AGENTS", &payload.parallelism.to_string()),
    ];
    if let Some(value) = &payload.auth_tag {
        lines.push(env_line("BUZZ_AUTH_TAG", value));
    }
    if let Some(value) = &payload.model {
        lines.push(env_line("BUZZ_ACP_MODEL", value));
    }
    if payload.system_prompt.is_some() {
        lines.push(env_line(
            "BUZZ_ACP_SYSTEM_PROMPT_FILE",
            &format!("/etc/wyzor-ops-mesh/{role}-system-prompt.txt"),
        ));
    }
    if !payload.respond_to_allowlist.is_empty() {
        lines.push(env_line(
            "BUZZ_ACP_RESPOND_TO_ALLOWLIST",
            &payload.respond_to_allowlist.join(","),
        ));
    }
    if let Some(value) = payload.idle_timeout_seconds {
        lines.push(env_line("BUZZ_ACP_IDLE_TIMEOUT", &value.to_string()));
    }
    if let Some(value) = payload.max_turn_duration_seconds {
        lines.push(env_line("BUZZ_ACP_MAX_TURN_DURATION", &value.to_string()));
    }
    lines.push(String::new());
    lines.join("\n")
}

fn render_service(role: &str, user: &str, hermes_home: &str, harness_path: &str) -> String {
    format!(
        "[Unit]\nDescription=Wyzor Ops Mesh bridge for {role}\nAfter=network-online.target\nWants=network-online.target\n\n[Service]\nType=simple\nUser={user}\nWorkingDirectory={hermes_home}\nEnvironment=HERMES_HOME={hermes_home}\nEnvironmentFile=/etc/wyzor-ops-mesh/{role}.env\nExecStart={harness_path}\nRestart=on-failure\nRestartSec=5\nNoNewPrivileges=true\nPrivateTmp=true\nProtectSystem=strict\nProtectHome=read-only\nReadWritePaths={hermes_home}\n\n[Install]\nWantedBy=multi-user.target\n"
    )
}

fn render_installer(role: &str, hermes_command: &str, harness_path: &str) -> String {
    format!(
        "#!/usr/bin/env bash\nset -euo pipefail\n[[ $EUID -eq 0 ]] || {{ echo 'Run with sudo' >&2; exit 1; }}\n[[ -x \"{hermes_command}\" ]] || {{ echo 'Missing Hermes ACP command: {hermes_command}' >&2; exit 1; }}\n[[ -x \"{harness_path}\" ]] || {{ echo 'Missing buzz-acp harness: {harness_path}' >&2; exit 1; }}\ninstall -d -m 700 /etc/wyzor-ops-mesh\ninstall -m 600 agent.env /etc/wyzor-ops-mesh/{role}.env\nif [[ -f system-prompt.txt ]]; then\n  install -m 600 system-prompt.txt /etc/wyzor-ops-mesh/{role}-system-prompt.txt\nfi\ninstall -m 644 wyzor-ops-mesh-agent.service /etc/systemd/system/wyzor-ops-mesh-{role}.service\nsystemctl daemon-reload\nsystemctl enable --now wyzor-ops-mesh-{role}.service\nsystemctl --no-pager status wyzor-ops-mesh-{role}.service\n"
    )
}

fn render_manifest(
    request_id: &str,
    role: &str,
    payload: &AgentPayload,
    hermes_home: &str,
    hermes_command: &str,
    harness_path: &str,
) -> Value {
    json!({
        "schema_version": 1,
        "request_id": request_id,
        "role": role,
        "agent": {
            "name": payload.name,
            "pubkey": payload.pubkey,
            "owner_pubkey": payload.owner_pubkey,
            "relay_url": payload.relay_url,
            "hermes_home": hermes_home,
            "hermes_command": hermes_command,
            "harness_path": harness_path
        },
        "contains_private_material": true,
        "install": "Transfer securely to the matching host, then run sudo ./install.sh."
    })
}

fn render_readme(role: &str, name: &str) -> String {
    format!(
        "# {name} — Wyzor Ops Mesh\n\nThis bundle connects the existing **{role}** Hermes runtime to Ops Mesh through `buzz-acp`.\n\n1. Finish the Hermes bot build and expose its ACP command at the path in `manifest.json`.\n2. Install `buzz-acp` at the configured harness path.\n3. Transfer this entire directory to the `{role}` host over a secure channel.\n4. From this directory, run `sudo ./install.sh`.\n5. Verify the bot appears online in Mission Control and mention it in a private test channel.\n\n`agent.env` contains the bot's Nostr private key. It is mode 0600; never commit or paste it into chat.\n"
    )
}

fn env_line(key: &str, value: &str) -> String {
    let escaped = value.replace('\\', "\\\\").replace('"', "\\\"");
    format!("{key}=\"{escaped}\"")
}

fn optional_nonempty(value: Option<&str>) -> Option<String> {
    value
        .map(str::trim)
        .filter(|item| !item.is_empty())
        .map(ToOwned::to_owned)
}

fn prefix(value: &str, length: usize) -> String {
    value.chars().take(length).collect()
}

fn reject_control_chars(label: &str, value: &str) -> Result<(), String> {
    if value.chars().any(char::is_control) {
        Err(format!("{label} may not contain control characters"))
    } else {
        Ok(())
    }
}

fn write_private(path: &Path, bytes: &[u8], mode: u32) -> Result<(), String> {
    let temporary = path.with_extension("tmp");
    let mut options = OpenOptions::new();
    options.create(true).truncate(true).write(true);
    #[cfg(unix)]
    {
        use std::os::unix::fs::OpenOptionsExt;
        options.mode(mode);
    }
    let mut file = options
        .open(&temporary)
        .map_err(|error| format!("failed to create {}: {error}", temporary.display()))?;
    file.write_all(bytes)
        .and_then(|_| file.sync_all())
        .map_err(|error| format!("failed to write {}: {error}", temporary.display()))?;
    set_mode(&temporary, mode)?;
    fs::rename(&temporary, path)
        .map_err(|error| format!("failed to install {}: {error}", path.display()))
}

#[cfg(unix)]
fn set_mode(path: &Path, mode: u32) -> Result<(), String> {
    use std::os::unix::fs::PermissionsExt;
    fs::set_permissions(path, fs::Permissions::from_mode(mode))
        .map_err(|error| format!("failed to secure {}: {error}", path.display()))
}

#[cfg(not(unix))]
fn set_mode(_path: &Path, _mode: u32) -> Result<(), String> {
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn info_exposes_three_stable_roles() {
        for role in ["Argus", "riggs", "KITT"] {
            assert_eq!(
                normalize_role(Some(role)).unwrap(),
                role.to_ascii_lowercase()
            );
        }
        assert!(normalize_role(Some("Hermes Ops")).is_err());
        assert!(info_response()["config_schema"]["properties"]["role"].is_null());
    }

    #[test]
    fn deployment_role_follows_the_named_wyzor_identity() {
        assert_eq!(
            deployment_role("Riggs", Some("argus")).unwrap(),
            "riggs",
            "a stale UI default must not wire Riggs to Argus"
        );
        assert_eq!(
            deployment_role("KITT", None).unwrap(),
            "kitt",
            "the agent name is sufficient to select the existing runtime"
        );
    }

    #[test]
    fn runtime_layout_matches_the_existing_named_agent_accounts() {
        let argus = runtime_layout("argus");
        assert_eq!(argus.user, "argus");
        assert_eq!(argus.hermes_home, "/home/argus/.hermes");
        assert_eq!(argus.hermes_args, "");

        let riggs = runtime_layout("riggs");
        assert_eq!(riggs.user, "riggs");
        assert_eq!(riggs.hermes_home, "/home/riggs/.hermes");
        assert_eq!(riggs.hermes_args, "");

        let kitt = runtime_layout("kitt");
        assert_eq!(kitt.user, "hermes");
        assert_eq!(kitt.hermes_home, "/home/hermes/.hermes");
        assert_eq!(kitt.hermes_args, "--profile,kitt,acp");

        let service = render_service(
            "kitt",
            kitt.user,
            kitt.hermes_home,
            "/opt/wyzor-ops-mesh/buzz-acp",
        );
        assert!(service.contains("User=hermes"));
        assert!(service.contains("Environment=HERMES_HOME=/home/hermes/.hermes"));
    }

    #[test]
    fn generated_manifest_never_contains_private_key() {
        let payload = AgentPayload {
            name: "Argus".to_string(),
            pubkey: "abc123".to_string(),
            owner_pubkey: "owner123".to_string(),
            relay_url: "wss://relay.example".to_string(),
            private_key_nsec: "nsec1neverlog".to_string(),
            auth_tag: None,
            model: None,
            system_prompt: None,
            parallelism: 1,
            respond_to: "owner-only".to_string(),
            respond_to_allowlist: vec![],
            idle_timeout_seconds: None,
            max_turn_duration_seconds: None,
        };
        let manifest = render_manifest(
            "request",
            "argus",
            &payload,
            "/home/argus/.hermes",
            "/usr/local/bin/hermes-acp",
            "/opt/wyzor-ops-mesh/buzz-acp",
        );
        assert!(!manifest.to_string().contains("nsec1neverlog"));
    }

    #[test]
    fn environment_escapes_quotes_and_backslashes() {
        assert_eq!(env_line("VALUE", r#"one\"two"#), r#"VALUE="one\\\"two""#);
    }

    #[test]
    fn remote_paths_reject_shell_metacharacters_and_parent_traversal() {
        assert!(validate_remote_path("command", "/usr/local/bin/hermes-acp").is_ok());
        assert!(validate_remote_path("command", "/tmp/hermes\";touch_/tmp/pwn").is_err());
        assert!(validate_remote_path("command", "/opt/../tmp/hermes").is_err());
        assert!(validate_remote_path("command", "relative/hermes").is_err());
    }
}
