import { DenoProject } from "../../src/deno";

test("DenoProject", () => {
  const prj = new DenoProject({
    name: "test",
    defaultReleaseBranch: "test",
    denoconfig: {},
  });

  expect(prj.denoconfig).not.toBeNull();
});
