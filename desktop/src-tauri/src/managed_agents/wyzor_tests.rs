use super::preset_harness_definitions;

#[test]
fn hermes_preset_targets_the_installed_launcher() {
    let hermes = preset_harness_definitions()
        .into_iter()
        .find(|definition| definition.id == "hermes")
        .expect("Hermes preset should exist");

    assert_eq!(hermes.command, "hermes");
    assert_eq!(hermes.args, ["acp"]);
}
