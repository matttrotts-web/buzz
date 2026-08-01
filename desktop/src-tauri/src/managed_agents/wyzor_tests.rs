use super::preset_harness_definitions;

#[test]
fn hermes_preset_targets_the_native_acp_launcher() {
    let hermes = preset_harness_definitions()
        .into_iter()
        .find(|definition| definition.id == "hermes")
        .expect("Hermes preset should exist");

    assert_eq!(hermes.command, "hermes-acp");
    assert!(hermes.args.is_empty());
}
