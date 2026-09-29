import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

async function load(path) {
  const source = await readFile(new URL(path, import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2023 } });
  return import(`data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`);
}
const { PROFILE_KEY, emptyProfile, parseProfile, readProfile, saveProfile, clearProfile, addProfileItem, profileInitials } = await load("../src/utils/profile.ts");
const { SETTINGS_KEY, savePreferences, resetPreferences } = await load("../src/utils/settings.ts");
function storage() {
  const data = new Map();
  return { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value), removeItem: key => data.delete(key) };
}
test("missing, malformed, and wrong-shaped profiles are neutral", () => {
  for (const raw of [null, "{bad", "null", "[]", "42", '"name"']) assert.deepEqual(parseProfile(raw), emptyProfile());
  assert.deepEqual(readProfile(storage()), emptyProfile());
});
test("older profiles, future fields, and invalid field types are handled", () => {
  assert.deepEqual(parseProfile(JSON.stringify({ displayName: "Learner", bio: 42, skills: [" Linux ", "linux", "", null, "Web   Security"], learningGoals: ["Practice", {}, " "], future: true })), {
    ...emptyProfile(), displayName: "Learner", skills: ["Linux", "Web Security"], learningGoals: ["Practice"],
  });
});
test("blank and duplicate skills are rejected without changing the list", () => {
  const items = ["Web Security"];
  for (const value of [" ", " web   SECURITY "]) assert.equal(addProfileItem(items, value), items);
  assert.deepEqual(addProfileItem(items, " Linux "), ["Web Security", "Linux"]);
  assert.deepEqual(items, ["Web Security"]);
});
test("save round trips every field and does not serialize unknown properties", () => {
  const local = storage();
  const profile = { displayName: "Test Learner", headline: "Student", organization: "Campus", currentFocus: "Networks", bio: "Learning\nevery day", skills: ["Linux"], learningGoals: ["Practice"] };
  assert.equal(saveProfile({ ...profile, future: true }, local), true);
  assert.deepEqual(JSON.parse(local.getItem(PROFILE_KEY)), profile);
  assert.deepEqual(readProfile(local), profile);
});
test("profile clear and Settings reset affect only their own keys", () => {
  const local = storage();
  local.setItem("other.records", "keep");
  savePreferences({ version: 1, compactMode: true }, local);
  const settings = local.getItem(SETTINGS_KEY);
  saveProfile({ ...emptyProfile(), displayName: "Learner" }, local);
  assert.equal(clearProfile(local), true);
  assert.equal(local.getItem(PROFILE_KEY), null);
  assert.equal(local.getItem(SETTINGS_KEY), settings);
  assert.equal(local.getItem("other.records"), "keep");
  saveProfile({ ...emptyProfile(), displayName: "Learner" }, local);
  const profile = local.getItem(PROFILE_KEY);
  resetPreferences(local);
  assert.equal(local.getItem(PROFILE_KEY), profile);
});
test("blocked storage and quota failures do not crash or report success", () => {
  const fail = () => { throw new Error("Storage blocked"); };
  const local = { getItem: fail, setItem: fail, removeItem: fail };
  assert.deepEqual(readProfile(local), emptyProfile());
  assert.equal(saveProfile(emptyProfile(), local), false);
  assert.equal(clearProfile(local), false);
});
test("initials use first and last words; empty names use no initials", () => {
  assert.equal(profileInitials(" M. Dhayalan "), "MD");
  assert.equal(profileInitials("Test Middle Learner"), "TL");
  assert.equal(profileInitials("Learner"), "L");
  assert.equal(profileInitials("  "), "");
});
